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

@Injectable()
export class PromocionesService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(user: JwtPayload): Promise<object[]> {
    if (user.rol === 'propietario') {
      return this.dataSource.query(
        `SELECT p.*, i.nombre AS item_nombre, c.nombre_categoria, s.nombre AS sede_nombre
         FROM promociones p
         LEFT JOIN items i ON i.id_item = p.id_item_afectado
         LEFT JOIN categorias c ON c.id_categoria = p.id_categoria_afectada
         LEFT JOIN sedes s ON s.id_sede = p.id_sede
         ORDER BY p.created_at DESC`,
      );
    }
    return this.dataSource.query(
      `SELECT p.*, i.nombre AS item_nombre, c.nombre_categoria, s.nombre AS sede_nombre
       FROM promociones p
       LEFT JOIN items i ON i.id_item = p.id_item_afectado
       LEFT JOIN categorias c ON c.id_categoria = p.id_categoria_afectada
       LEFT JOIN sedes s ON s.id_sede = p.id_sede
       WHERE p.id_sede = $1 OR p.id_sede IS NULL
       ORDER BY p.created_at DESC`,
      [user.id_sede],
    );
  }

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
          valor_descuento, tipo_descuento, fecha_inicio, fecha_fin, dia_semana)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
      ],
    );
    return row;
  }

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

  async remove(id: number, user: JwtPayload): Promise<void> {
    await this.assertAccess(id, user);
    await this.dataSource.query(
      `UPDATE promociones SET estado = 'cancelada', updated_at = now() WHERE id_promocion = $1`,
      [id],
    );
  }

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
  }> {
    const [promo] = await this.dataSource.query<
      {
        id_sede: number | null;
        id_item_afectado: number | null;
        id_categoria_afectada: number | null;
        fecha_inicio: string | null;
        fecha_fin: string | null;
        estado: string;
      }[]
    >(
      `SELECT id_sede, id_item_afectado, id_categoria_afectada, fecha_inicio, fecha_fin, estado
       FROM promociones WHERE id_promocion = $1`,
      [id],
    );
    if (!promo) throw new NotFoundException(`Promocion #${id} not found`);
    if (user.rol === 'administrador' && promo.id_sede !== user.id_sede) {
      throw new ForbiddenException();
    }
    return promo;
  }
}
