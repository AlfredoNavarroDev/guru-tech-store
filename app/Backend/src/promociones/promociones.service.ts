import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { CreatePromocionDto } from './dto/create-promocion.dto';
import type { UpdatePromocionDto } from './dto/update-promocion.dto';

interface JwtPayload {
  sub: number;
  id_sede: number;
  rol: string;
  nombre: string;
}

// Servicio de promociones. Propietario ve todas; administrador solo su sede.
@Injectable()
export class PromocionesService {
  constructor(private readonly dataSource: DataSource) {}

  // Lista promociones con datos enriquecidos (ítem, categoría, sede, creador).
  // Propietario ve todo; administrador solo su sede o promociones globales (id_sede IS NULL).
  async findAll(user: JwtPayload): Promise<object[]> {
    const creatorSubquery = `(
      SELECT r.nombre_rol FROM empleados e2
      JOIN roles r ON r.id_rol = e2.id_rol
      WHERE e2.id_empleado = p.created_by LIMIT 1
    ) AS created_by_rol`;
    const baseSelect = `
      SELECT p.*, i.nombre AS item_nombre, c.nombre_categoria, s.nombre AS sede_nombre,
             e.nombre_completo AS creado_por_nombre, ${creatorSubquery}
      FROM promociones p
      LEFT JOIN items i ON i.id_item = p.id_item_afectado
      LEFT JOIN categorias c ON c.id_categoria = p.id_categoria_afectada
      LEFT JOIN sedes s ON s.id_sede = p.id_sede
      LEFT JOIN empleados e ON e.id_empleado = p.created_by`;

    if (user.rol === 'propietario') {
      return this.dataSource.query(`${baseSelect} ORDER BY p.created_at DESC`);
    }
    return this.dataSource.query(
      `${baseSelect} WHERE p.id_sede = $1 OR p.id_sede IS NULL ORDER BY p.created_at DESC`,
      [user.id_sede],
    );
  }

  // Evita solapamiento de promociones activas/pausadas sobre el mismo ítem o categoría
  // en el mismo período y sede. excludeId omite la propia promoción al editar.
  private async checkConflict(
    idItem: number | null,
    idCategoria: number | null,
    idSede: number | null,
    fechaInicio: string | null,
    fechaFin: string | null,
    excludeId?: number,
  ): Promise<void> {
    if (!idItem && !idCategoria) return;
    const rows = await this.dataSource.query<{ nombre: string }[]>(
      `SELECT p.nombre FROM promociones p
       WHERE p.estado IN ('activa', 'pausada')
         AND ($1::int IS NULL OR p.id_promocion != $1)
         AND (
           ($2::int IS NOT NULL AND p.id_item_afectado = $2)
           OR ($3::int IS NOT NULL AND p.id_categoria_afectada = $3)
         )
         AND (
           $4::int IS NULL
           OR p.id_sede IS NULL
           OR p.id_sede = $4
         )
         AND (p.fecha_inicio IS NULL OR $6::date IS NULL OR p.fecha_inicio <= $6::date)
         AND (p.fecha_fin IS NULL OR $5::date IS NULL OR p.fecha_fin >= $5::date)
       LIMIT 1`,
      [excludeId ?? null, idItem, idCategoria, idSede, fechaInicio, fechaFin],
    );
    if (rows.length > 0) {
      throw new ConflictException(
        `Ya existe la promoción "${rows[0].nombre}" activa para este ítem/categoría en ese período.`,
      );
    }
  }

  // Crea promoción. Administrador hereda su sede; propietario puede especificar cualquiera.
  // Valida que no aplique a ítem Y categoría simultáneamente y que no haya conflicto de fechas.
  async create(
    dto: CreatePromocionDto,
    user: JwtPayload,
  ): Promise<{ id_promocion: number }> {
    if (dto.id_item_afectado && dto.id_categoria_afectada) {
      throw new BadRequestException(
        'Una promoción no puede aplicar a un ítem y una categoría al mismo tiempo.',
      );
    }

    const id_sede =
      user.rol === 'administrador' ? user.id_sede : (dto.id_sede ?? null);

    await this.checkConflict(
      dto.id_item_afectado ?? null,
      dto.id_categoria_afectada ?? null,
      id_sede,
      dto.fecha_inicio ?? null,
      dto.fecha_fin ?? null,
    );

    const [row] = await this.dataSource.query<{ id_promocion: number }[]>(
      `INSERT INTO promociones
         (id_sede, nombre, id_item_afectado, id_categoria_afectada,
          valor_descuento, tipo_descuento, fecha_inicio, fecha_fin, dia_semana, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id_promocion`,
      [
        id_sede,
        dto.nombre,
        dto.id_item_afectado ?? null,
        dto.id_categoria_afectada ?? null,
        dto.valor_descuento,
        dto.tipo_descuento,
        dto.fecha_inicio ?? null,
        dto.fecha_fin ?? null,
        dto.dia_semana ?? null,
        user.sub,
      ],
    );
    return row;
  }

  // Actualiza campos de la promoción. Verifica acceso antes de modificar.
  // Si el nuevo estado es 'activa', re-valida conflictos de solapamiento.
  async update(
    id: number,
    dto: UpdatePromocionDto,
    user: JwtPayload,
  ): Promise<void> {
    const promo = await this.assertAccess(id, user);
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (dto.estado !== undefined) {
      sets.push(`estado = $${idx++}`);
      params.push(dto.estado);
    }
    if (dto.valor_descuento !== undefined) {
      sets.push(`valor_descuento = $${idx++}`);
      params.push(dto.valor_descuento);
    }
    if (dto.fecha_inicio !== undefined) {
      sets.push(`fecha_inicio = $${idx++}`);
      params.push(dto.fecha_inicio);
    }
    if (dto.fecha_fin !== undefined) {
      sets.push(`fecha_fin = $${idx++}`);
      params.push(dto.fecha_fin);
    }
    if (!sets.length) return;

    const nextEstado = dto.estado ?? promo.estado;
    const nextFechaInicio =
      dto.fecha_inicio !== undefined
        ? (dto.fecha_inicio ?? null)
        : promo.fecha_inicio;
    const nextFechaFin =
      dto.fecha_fin !== undefined ? (dto.fecha_fin ?? null) : promo.fecha_fin;

    if (nextEstado === 'activa') {
      await this.checkConflict(
        promo.id_item_afectado,
        promo.id_categoria_afectada,
        promo.id_sede,
        nextFechaInicio,
        nextFechaFin,
        id,
      );
    }

    sets.push(`updated_at = now()`);
    params.push(id);
    await this.dataSource.query(
      `UPDATE promociones SET ${sets.join(', ')} WHERE id_promocion = $${idx}`,
      params,
    );
  }

  // Eliminación lógica: cambia estado a 'cancelada' en vez de borrar el registro.
  async remove(id: number, user: JwtPayload): Promise<void> {
    await this.assertAccess(id, user);
    await this.dataSource.query(
      `UPDATE promociones SET estado = 'cancelada', updated_at = now() WHERE id_promocion = $1`,
      [id],
    );
  }

  // Carga la promoción y verifica permisos de acceso.
  // Administrador no puede editar promociones creadas por el propietario ni de otras sedes.
  private async assertAccess(
    id: number,
    user: JwtPayload,
  ): Promise<{
    id_sede: number | null;
    id_item_afectado: number | null;
    id_categoria_afectada: number | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    estado: string;
    created_by: number | null;
  }> {
    const [promo] = await this.dataSource.query<
      {
        id_sede: number | null;
        id_item_afectado: number | null;
        id_categoria_afectada: number | null;
        fecha_inicio: string | null;
        fecha_fin: string | null;
        estado: string;
        created_by: number | null;
      }[]
    >(
      `SELECT id_sede, id_item_afectado, id_categoria_afectada, fecha_inicio, fecha_fin, estado, created_by
       FROM promociones WHERE id_promocion = $1`,
      [id],
    );
    if (!promo) throw new NotFoundException(`Promocion #${id} not found`);
    if (user.rol === 'administrador') {
      if (promo.created_by) {
        const [creatorIsOwner] = await this.dataSource.query<{ id_rol: number }[]>(
          `SELECT e2.id_rol FROM empleados e2
           JOIN roles r ON r.id_rol = e2.id_rol
           WHERE e2.id_empleado = $1 AND r.nombre_rol = 'propietario'
           LIMIT 1`,
          [promo.created_by],
        );
        if (creatorIsOwner) throw new ForbiddenException();
      }
      if (promo.id_sede !== user.id_sede) throw new ForbiddenException();
    }
    return promo;
  }
}
