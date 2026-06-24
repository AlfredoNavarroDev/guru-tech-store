import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '../common/types';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import {
  GarantiaNotFoundException,
  GarantiaYaExisteException,
  ReparacionNotFoundException,
} from '../common/exceptions';
import type { CreateGarantiaReparacionDto } from './dto/create-garantia-reparacion.dto';
import type { QueryGarantiasDto } from './dto/query-garantias.dto';
import type { GarantiaResponseDto } from './dto/garantia-response.dto';

interface GarantiaRow {
  id_garantia: number;
  id_venta: number | null;
  id_reparacion: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  motivo_invalidacion: string | null;
  created_at: Date;
}

interface CountRow {
  total: string;
}

function mapToDto(row: GarantiaRow): GarantiaResponseDto {
  const tipo: 'venta' | 'reparacion' =
    row.id_venta !== null ? 'venta' : 'reparacion';
  return {
    id_garantia: row.id_garantia,
    tipo,
    id_venta: row.id_venta ?? null,
    id_reparacion: row.id_reparacion ?? null,
    referencia_label:
      tipo === 'venta'
        ? `Venta #${row.id_venta}`
        : `Reparación #${row.id_reparacion}`,
    fecha_inicio: String(row.fecha_inicio),
    fecha_fin: String(row.fecha_fin),
    estado: row.estado as GarantiaResponseDto['estado'],
    motivo_invalidacion: row.motivo_invalidacion ?? null,
    created_at: String(row.created_at),
  };
}

@Injectable()
export class GarantiasService {
  constructor(private readonly dataSource: DataSource) {}

  async create(
    dto: CreateGarantiaReparacionDto,
    user: JwtPayload,
  ): Promise<GarantiaResponseDto> {
    if (user.rol !== 'tecnico') throw new ForbiddenException();

    if (new Date(dto.fecha_fin) <= new Date(dto.fecha_inicio)) {
      throw new BadRequestException(
        'fecha_fin debe ser posterior a fecha_inicio',
      );
    }

    const reps = await this.dataSource.query<{ id_reparacion: number }[]>(
      `SELECT id_reparacion FROM reparaciones
       WHERE id_reparacion = $1 AND id_sede = $2`,
      [dto.id_reparacion, user.id_sede],
    );
    if (!reps.length) throw new ReparacionNotFoundException(dto.id_reparacion);

    const existing = await this.dataSource.query<{ id_garantia: number }[]>(
      `SELECT id_garantia FROM garantias
       WHERE id_reparacion = $1 AND estado = 'activa'`,
      [dto.id_reparacion],
    );
    if (existing.length)
      throw new GarantiaYaExisteException(dto.id_reparacion);

    const rows = await this.dataSource.query<GarantiaRow[]>(
      `INSERT INTO garantias (id_reparacion, fecha_inicio, fecha_fin, estado)
       VALUES ($1, $2, $3, 'activa')
       RETURNING id_garantia, id_venta, id_reparacion, fecha_inicio, fecha_fin,
                 estado, motivo_invalidacion, created_at`,
      [dto.id_reparacion, dto.fecha_inicio, dto.fecha_fin],
    );
    return mapToDto(rows[0]);
  }

  async findAll(
    user: JwtPayload,
    query: QueryGarantiasDto,
  ): Promise<PaginatedResult<GarantiaResponseDto>> {
    const sede = user.id_sede!;

    // Lazy update: mark expired garantias for this sede as vencida.
    await this.dataSource.query(
      `UPDATE garantias g SET estado = 'vencida', updated_at = now()
       WHERE g.estado = 'activa' AND g.fecha_fin < CURRENT_DATE
         AND (
           EXISTS (SELECT 1 FROM ventas v
                   WHERE v.id_venta = g.id_venta AND v.id_sede = $1)
           OR EXISTS (SELECT 1 FROM reparaciones r
                      WHERE r.id_reparacion = g.id_reparacion AND r.id_sede = $1)
         )`,
      [sede],
    );

    const isVendedor = user.rol === 'vendedor';
    const joinClause = isVendedor
      ? `JOIN ventas v ON v.id_venta = g.id_venta`
      : `JOIN reparaciones r ON r.id_reparacion = g.id_reparacion`;
    const sedeCondition = isVendedor
      ? `v.id_sede = $1 AND g.id_venta IS NOT NULL`
      : `r.id_sede = $1 AND g.id_reparacion IS NOT NULL`;

    const params: (string | number)[] = [sede];
    let idx = 2;
    let estadoFilter = '';

    if (query.estado) {
      estadoFilter = ` AND g.estado = $${idx++}`;
      params.push(query.estado);
    }

    const whereClause = `${sedeCondition}${estadoFilter}`;

    const [{ total }] = await this.dataSource.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM garantias g ${joinClause} WHERE ${whereClause}`,
      params,
    );

    const pageParams = [...params, (query.page - 1) * query.limit, query.limit];
    const rows = await this.dataSource.query<GarantiaRow[]>(
      `SELECT g.id_garantia, g.id_venta, g.id_reparacion,
              g.fecha_inicio, g.fecha_fin, g.estado,
              g.motivo_invalidacion, g.created_at
       FROM garantias g
       ${joinClause}
       WHERE ${whereClause}
       ORDER BY g.created_at DESC
       OFFSET $${idx} LIMIT $${idx + 1}`,
      pageParams,
    );

    return {
      items: rows.map(mapToDto),
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  async findOne(id: number, user: JwtPayload): Promise<GarantiaResponseDto> {
    const sede = user.id_sede!;

    // Lazy update for this specific garantia only.
    await this.dataSource.query(
      `UPDATE garantias g SET estado = 'vencida', updated_at = now()
       WHERE g.id_garantia = $1 AND g.estado = 'activa' AND g.fecha_fin < CURRENT_DATE
         AND (
           EXISTS (SELECT 1 FROM ventas v
                   WHERE v.id_venta = g.id_venta AND v.id_sede = $2)
           OR EXISTS (SELECT 1 FROM reparaciones r
                      WHERE r.id_reparacion = g.id_reparacion AND r.id_sede = $2)
         )`,
      [id, sede],
    );

    const rows = await this.dataSource.query<GarantiaRow[]>(
      `SELECT g.id_garantia, g.id_venta, g.id_reparacion,
              g.fecha_inicio, g.fecha_fin, g.estado,
              g.motivo_invalidacion, g.created_at
       FROM garantias g
       WHERE g.id_garantia = $1
         AND (
           EXISTS (SELECT 1 FROM ventas v
                   WHERE v.id_venta = g.id_venta AND v.id_sede = $2)
           OR EXISTS (SELECT 1 FROM reparaciones r
                      WHERE r.id_reparacion = g.id_reparacion AND r.id_sede = $2)
         )`,
      [id, sede],
    );

    if (!rows.length) throw new GarantiaNotFoundException(id);
    return mapToDto(rows[0]);
  }
}
