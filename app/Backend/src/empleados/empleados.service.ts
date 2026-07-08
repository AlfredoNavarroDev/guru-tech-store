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
      // La sede proviene del token JWT del admin, no del body.
      id_sede: currentUser.id_sede!,
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
      // Filtra por sede del admin para evitar acceso cruzado entre sedes.
      .where('e.id_sede = :id_sede', { id_sede: currentUser.id_sede! })
      .orderBy('e.nombre_completo', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

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
    return {
      items: items.map((empleado) => this.toResponse(empleado)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // Busca empleado por ID garantizando que pertenece a la sede del admin.
  async findOne(
    id: number,
    currentUser: JwtPayload,
  ): Promise<EmpleadoResponseDto> {
    const empleado = await this.empleadosRepo.findOne({
      where: { id_empleado: id, id_sede: currentUser.id_sede! },
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

  // Helper interno: carga la entidad completa con validación de sede.
  private async findEntity(
    id: number,
    currentUser: JwtPayload,
  ): Promise<Empleado> {
    const empleado = await this.empleadosRepo.findOne({
      where: { id_empleado: id, id_sede: currentUser.id_sede! },
    });
    if (!empleado) throw new EmpleadoNotFoundException(id);
    return empleado;
  }

  // Elimina password_hash antes de devolver el empleado al cliente.
  private toResponse(empleado: Empleado): EmpleadoResponseDto {
    const safe = { ...empleado } as Partial<Empleado>;
    delete safe.password_hash;
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
}
