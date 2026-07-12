import { plainToInstance } from 'class-transformer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Empleado } from '../auth/entities/empleado.entity';
import { Rol } from '../auth/entities/rol.entity';
import { JwtPayload } from '../common/types';
import { PaginatedResult } from '../common/dto/pagination.dto';
import {
  EmpleadoNotFoundException,
  EmpleadoDocumentoDuplicadoException,
  EmpleadoSelfDeactivateException,
  RolNotFoundException,
} from '../common/exceptions';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { UpdatePasswordEmpleadoDto } from './dto/update-password-empleado.dto';
import { UpdateEstadoEmpleadoDto } from './dto/update-estado-empleado.dto';
import { QueryEmpleadosDto } from './dto/query-empleados.dto';
import { EmpleadoResponseDto } from './dto/empleado-response.dto';
import { EmpleadoRendimientoDto } from './dto/empleado-rendimiento.dto';
import { RendimientoHoyDto } from './dto/rendimiento-hoy.dto';

// Servicio de empleados. Scoped por sede — ninguna operación cruza sedes.
@Injectable()
export class EmpleadosService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadosRepo: Repository<Empleado>,
    @InjectRepository(Rol)
    private readonly rolesRepo: Repository<Rol>,
    private readonly dataSource: DataSource,
  ) {}

  // Crea empleado: valida formato de documento, existencia de rol y unicidad antes de persistir.
  async create(
    dto: CreateEmpleadoDto,
    currentUser: JwtPayload,
  ): Promise<EmpleadoResponseDto> {
    this.validateDocumentoFormato(dto.tipo_documento, dto.nro_documento);
    await this.validateRolExists(dto.id_rol);
    await this.validateDocumentoUnico(dto.tipo_documento, dto.nro_documento);

    // Hashea contraseña con bcrypt antes de almacenarla.
    const password_hash = await bcrypt.hash(dto.password, 10);
    const empleado = this.empleadosRepo.create({
      tipo_documento: dto.tipo_documento,
      nro_documento: dto.nro_documento,
      nombre_completo: dto.nombre_completo,
      id_rol: dto.id_rol,
      password_hash,
      // Propietario puede especificar sede vía dto; admin siempre usa la propia.
      id_sede: (dto.id_sede ?? currentUser.id_sede)!,
      telefono: dto.telefono ?? null,
      sueldo_soles: dto.sueldo_soles ?? null,
      frecuencia_pago: dto.frecuencia_pago ?? 'semanal',
      es_extranjero: dto.es_extranjero ?? false,
      direccion_completa: dto.direccion_completa ?? null,
      created_by: currentUser.sub,
    });
    return this.toResponse(await this.empleadosRepo.save(empleado));
  }

  // Listado paginado con filtros opcionales por rol y estado activo/inactivo.
  async findAll(
    currentUser: JwtPayload,
    query: QueryEmpleadosDto,
  ): Promise<PaginatedResult<EmpleadoResponseDto>> {
    const qb = this.empleadosRepo
      .createQueryBuilder('e')
      .orderBy('e.nombre_completo', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (currentUser.rol !== 'propietario') {
      qb.where('e.id_sede = :id_sede', { id_sede: currentUser.id_sede! });
    }

    if (query.id_rol !== undefined) {
      qb.andWhere('e.id_rol = :id_rol', { id_rol: query.id_rol });
    }
    if (query.activo !== undefined) {
      // Convierte el booleano a la cadena que usa la columna 'estado'.
      qb.andWhere('e.estado = :estado', {
        estado: query.activo ? 'activo' : 'inactivo',
      });
    }

    const [items, total] = await qb.getManyAndCount();

    const sedeIds = [...new Set(items.map((e) => e.id_sede).filter(Boolean))] as number[];
    let sedeNames: Record<number, string> = {};
    if (sedeIds.length) {
      const rows = await this.dataSource.query<{ id_sede: number; nombre: string }[]>(
        `SELECT id_sede, nombre FROM sedes WHERE id_sede = ANY($1)`,
        [sedeIds],
      );
      sedeNames = Object.fromEntries(rows.map((r) => [r.id_sede, r.nombre]));
    }

    return {
      items: items.map((empleado) =>
        this.toResponse(empleado, empleado.id_sede ? sedeNames[empleado.id_sede] : undefined),
      ),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // Busca empleado por ID garantizando que pertenece a la sede del admin (propietario ve todas).
  async findOne(
    id: number,
    currentUser: JwtPayload,
  ): Promise<EmpleadoResponseDto> {
    const empleado = await this.empleadosRepo.findOne({
      where: currentUser.rol === 'propietario'
        ? { id_empleado: id }
        : { id_empleado: id, id_sede: currentUser.id_sede! },
    });
    if (!empleado) throw new EmpleadoNotFoundException(id);
    return this.toResponse(empleado);
  }

  // Actualiza campos del empleado. Valida el nuevo rol si se cambia.
  async update(
    id: number,
    dto: UpdateEmpleadoDto,
    currentUser: JwtPayload,
  ): Promise<EmpleadoResponseDto> {
    const empleado = await this.findEntity(id, currentUser);
    if (dto.id_rol !== undefined) await this.validateRolExists(dto.id_rol);
    Object.assign(empleado, dto);
    return this.toResponse(await this.empleadosRepo.save(empleado));
  }

  // Reemplaza el hash de contraseña. No valida la contraseña anterior.
  async updatePassword(
    id: number,
    dto: UpdatePasswordEmpleadoDto,
    currentUser: JwtPayload,
  ): Promise<void> {
    const empleado = await this.findEntity(id, currentUser);
    empleado.password_hash = await bcrypt.hash(dto.nueva_password, 10);
    await this.empleadosRepo.save(empleado);
  }

  // HU-24: Al desactivar → revocar todos los refresh tokens activos del empleado.
  async updateEstado(
    id: number,
    dto: UpdateEstadoEmpleadoDto,
    currentUser: JwtPayload,
  ): Promise<void> {
    // Impide que un admin se desactive a sí mismo.
    if (id === currentUser.sub) throw new EmpleadoSelfDeactivateException();
    await this.findOne(id, currentUser);

    if (!dto.activo) {
      // Revoca tokens de refresco para forzar cierre de sesión inmediato.
      await this.dataSource.query(
        `UPDATE "refreshtokens" SET revoked = true WHERE id_empleado = $1 AND revoked = false`,
        [id],
      );
    }

    await this.empleadosRepo.update(id, {
      estado: dto.activo ? 'activo' : 'inactivo',
    });
  }

  // Helper interno: carga la entidad completa con validación de sede (propietario omite filtro).
  private async findEntity(
    id: number,
    currentUser: JwtPayload,
  ): Promise<Empleado> {
    const empleado = await this.empleadosRepo.findOne({
      where: currentUser.rol === 'propietario'
        ? { id_empleado: id }
        : { id_empleado: id, id_sede: currentUser.id_sede! },
    });
    if (!empleado) throw new EmpleadoNotFoundException(id);
    return empleado;
  }

  // Elimina password_hash antes de devolver el empleado al cliente.
  private toResponse(empleado: Empleado, sede_nombre?: string): EmpleadoResponseDto {
    const safe = { ...empleado } as Partial<Empleado> & { sede_nombre?: string };
    delete safe.password_hash;
    if (sede_nombre !== undefined) safe.sede_nombre = sede_nombre;
    return safe as EmpleadoResponseDto;
  }

  // Lanza 404 si el rol no existe en la base de datos.
  private async validateRolExists(id_rol: number): Promise<void> {
    const rol = await this.rolesRepo.findOne({ where: { id_rol } });
    if (!rol) throw new RolNotFoundException(id_rol);
  }

  // Lanza excepción de duplicado si ya existe un empleado con el mismo tipo+nro de documento.
  private async validateDocumentoUnico(
    tipo_documento: string,
    nro_documento: string,
  ): Promise<void> {
    const exists = await this.empleadosRepo.findOne({
      where: { tipo_documento, nro_documento },
    });
    if (exists) throw new EmpleadoDocumentoDuplicadoException();
  }

  // Valida longitud y formato del documento según su tipo mediante regex.
  private validateDocumentoFormato(
    tipo_documento: string,
    nro_documento: string,
  ): void {
    const validators: Record<string, RegExp> = {
      DNI: /^\d{8}$/,
      CE: /^\d{12}$/,
      pasaporte: /^[a-zA-Z0-9]{6,9}$/,
    };
    if (!validators[tipo_documento]?.test(nro_documento)) {
      throw new BadRequestException(
        'Documento inválido: DNI 8 dígitos, CE 12 dígitos, pasaporte 6 a 9 caracteres alfanuméricos.',
      );
    }
  }

  // Rendimiento del mes para vendedores y técnicos de la sede.
  // Calcula ingresos hoy y el mejor día del mes usando CTEs independientes, luego los une.
  async getRendimiento(user: JwtPayload): Promise<EmpleadoRendimientoDto[]> {
    const idSede = user.id_sede!;

    // ── Vendedores ──────────────────────────────────────────────────────────
    const vendedoresSQL = `
      WITH this_month AS (
        SELECT id_empleado, fecha, ingresos
        FROM   v_vendedor_resumen_diario
        WHERE  DATE_TRUNC('month', fecha)
               = DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date)
      ),
      best AS (
        SELECT
          id_empleado,
          MAX(ingresos) AS ingresos_mejor_dia_mes,
          (ARRAY_AGG(fecha ORDER BY ingresos DESC))[1] AS fecha_mejor_dia_mes
        FROM  this_month
        GROUP BY id_empleado
      ),
      today AS (
        SELECT id_empleado, ingresos AS ingresos_hoy
        FROM   this_month
        WHERE  fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
      )
      SELECT
        e.id_empleado,
        e.nombre_completo,
        'vendedor'                                            AS rol_nombre,
        COALESCE(t.ingresos_hoy, 0)::numeric                  AS ingresos_hoy,
        COALESCE(b.ingresos_mejor_dia_mes, 0)::numeric        AS ingresos_mejor_dia_mes,
        TO_CHAR(b.fecha_mejor_dia_mes, 'YYYY-MM-DD')         AS fecha_mejor_dia_mes
      FROM  empleados e
      JOIN  roles     r ON r.id_rol = e.id_rol AND LOWER(r.nombre_rol) = 'vendedor'
      LEFT JOIN today t ON t.id_empleado = e.id_empleado
      LEFT JOIN best  b ON b.id_empleado = e.id_empleado
      WHERE e.id_sede = $1 AND e.estado = 'activo'
      ORDER BY ingresos_hoy DESC
    `;

    // ── Técnicos ────────────────────────────────────────────────────────────
    const tecnicosSQL = `
      WITH this_month AS (
        SELECT
          r.id_tecnico                                       AS id_empleado,
          DATE(p.fecha_pago AT TIME ZONE 'America/Lima')     AS fecha,
          SUM(p.monto::numeric)                              AS ingresos
        FROM  pagos p
        JOIN  reparaciones r ON r.id_reparacion = p.id_reparacion
        WHERE r.id_sede = $1
          AND DATE_TRUNC('month', DATE(p.fecha_pago AT TIME ZONE 'America/Lima'))
              = DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date)
        GROUP BY r.id_tecnico, DATE(p.fecha_pago AT TIME ZONE 'America/Lima')
      ),
      best AS (
        SELECT
          id_empleado,
          MAX(ingresos)                                      AS ingresos_mejor_dia_mes,
          (ARRAY_AGG(fecha ORDER BY ingresos DESC))[1]       AS fecha_mejor_dia_mes
        FROM  this_month
        GROUP BY id_empleado
      ),
      today AS (
        SELECT id_empleado, ingresos AS ingresos_hoy
        FROM   this_month
        WHERE  fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
      )
      SELECT
        e.id_empleado,
        e.nombre_completo,
        'tecnico'                                            AS rol_nombre,
        COALESCE(t.ingresos_hoy, 0)::numeric                 AS ingresos_hoy,
        COALESCE(b.ingresos_mejor_dia_mes, 0)::numeric       AS ingresos_mejor_dia_mes,
        TO_CHAR(b.fecha_mejor_dia_mes, 'YYYY-MM-DD')        AS fecha_mejor_dia_mes
      FROM  empleados e
      JOIN  roles     r ON r.id_rol = e.id_rol AND LOWER(r.nombre_rol) = 'tecnico'
      LEFT JOIN today t ON t.id_empleado = e.id_empleado
      LEFT JOIN best  b ON b.id_empleado = e.id_empleado
      WHERE e.id_sede = $1 AND e.estado = 'activo'
      ORDER BY ingresos_hoy DESC
    `;

    const [vendedores, tecnicos] = await Promise.all([
      this.dataSource.query(vendedoresSQL, [idSede]),
      this.dataSource.query(tecnicosSQL, [idSede]),
    ]);

    return plainToInstance(
      EmpleadoRendimientoDto,
      [...vendedores, ...tecnicos].map((row) => ({
        id_empleado: Number(row.id_empleado),
        nombre_completo: row.nombre_completo,
        rol_nombre: row.rol_nombre as 'vendedor' | 'tecnico',
        ingresos_hoy: Number(row.ingresos_hoy),
        ingresos_mejor_dia_mes: Number(row.ingresos_mejor_dia_mes),
        fecha_mejor_dia_mes: row.fecha_mejor_dia_mes ?? null,
      })),
      { excludeExtraneousValues: true },
    );
  }

  // KPI personal del día: total generado hoy vs meta diaria configurada para el rol.
  // Vendedores usan suma de importe_venta; técnicos usan monto_cotizado de reparaciones terminadas.
  async getRendimientoHoy(user: JwtPayload): Promise<RendimientoHoyDto> {
    let total_hoy = 0;

    if (user.rol === 'vendedor') {
      const [row] = await this.dataSource.query<{ total: string }[]>(
        `SELECT COALESCE(SUM(dv.importe), 0) AS total
         FROM detalle_venta dv
         JOIN ventas v ON v.id_venta = dv.id_venta
         WHERE v.id_empleado = $1
           AND DATE(v.fecha_emision AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date`,
        [user.sub],
      );
      total_hoy = parseFloat(row.total);
    } else if (user.rol === 'tecnico') {
      const [row] = await this.dataSource.query<{ total: string }[]>(
        `SELECT COALESCE(SUM(monto_cotizado), 0) AS total
         FROM reparaciones
         WHERE id_tecnico = $1
           AND DATE(fecha_terminado AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
           AND fecha_terminado IS NOT NULL`,
        [user.sub],
      );
      total_hoy = parseFloat(row.total);
    }

    const [metaRow] = await this.dataSource.query<
      { meta_ventas_diaria: string | null }[]
    >(
      `SELECT cmr.meta_ventas_diaria
       FROM config_metas_rol cmr
       JOIN roles r ON r.id_rol = cmr.id_rol
       WHERE r.nombre_rol = $1`,
      [user.rol],
    );

    const meta_diaria = metaRow?.meta_ventas_diaria
      ? parseFloat(metaRow.meta_ventas_diaria)
      : null;

    const porcentaje = meta_diaria
      ? Math.round((total_hoy / meta_diaria) * 100)
      : null;

    return { total_hoy, meta_diaria, porcentaje };
  }
}
