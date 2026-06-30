import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '../common/types';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import {
  GarantiaNoActivaException,
  GarantiaNotFoundException,
  GarantiaTipoInvalidoException,
  GarantiaYaExisteException,
  ReparacionNotFoundException,
} from '../common/exceptions';
import type { CreateGarantiaReparacionDto } from './dto/create-garantia-reparacion.dto';
import type { CreateReclamoGarantiaDto } from './dto/create-reclamo-garantia.dto';
import type { QueryGarantiasDto } from './dto/query-garantias.dto';
import type { GarantiaResponseDto } from './dto/garantia-response.dto';
import type { ReparacionResponseDto } from '../reparaciones/dto/reparacion-response.dto';
import { ReparacionesService } from '../reparaciones/reparaciones.service';

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

interface ReclamoGarantiaRow {
  id_garantia: number;
  id_venta: number | null;
  id_reparacion: number | null;
  estado: string;
  id_sede: number | null;
  id_cliente: number | null;
  marca: string | null;
  modelo: string | null;
  imei: string | null;
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
  constructor(
    private readonly dataSource: DataSource,
    private readonly reparacionesService: ReparacionesService,
  ) {}

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

  // Reclamo de garantía de servicio técnico: crea reparación nueva ligada a la
  // garantía y la consume (invalidada) en la misma operación.
  async crearReclamo(
    idGarantia: number,
    dto: CreateReclamoGarantiaDto,
    user: JwtPayload,
  ): Promise<ReparacionResponseDto> {
    if (user.rol !== 'tecnico') throw new ForbiddenException();

    const [garantia] = await this.dataSource.query<ReclamoGarantiaRow[]>(
      `SELECT g.id_garantia, g.id_venta, g.id_reparacion, g.estado,
              r.id_sede, r.id_cliente, r.marca, r.modelo, r.imei
       FROM garantias g
       LEFT JOIN reparaciones r ON r.id_reparacion = g.id_reparacion
       WHERE g.id_garantia = $1`,
      [idGarantia],
    );
    // Tipo check runs before sede check: venta garantías have no
    // id_reparacion, so there's no r.id_sede to compare against.
    if (!garantia) throw new GarantiaNotFoundException(idGarantia);
    if (garantia.id_venta !== null) {
      throw new GarantiaTipoInvalidoException(idGarantia);
    }
    if (garantia.id_sede !== user.id_sede) {
      throw new GarantiaNotFoundException(idGarantia);
    }
    if (garantia.estado !== 'activa') {
      throw new GarantiaNoActivaException(idGarantia);
    }

    const [estadoInicial] = await this.dataSource.query<
      { id_estado: number }[]
    >(`SELECT id_estado FROM estados_reparacion ORDER BY orden ASC LIMIT 1`);

    let nuevaReparacionId!: number;
    await this.dataSource.transaction(async (manager) => {
      const [inserted] = await manager.query<{ id_reparacion: number }[]>(
        `INSERT INTO reparaciones
           (id_cliente, id_tecnico, id_sede, marca, modelo, imei,
            esta_encendido, checklist_estado, diagnostico_tecnico,
            fecha_estimada, id_estado, id_garantia_reclamada)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id_reparacion`,
        [
          garantia.id_cliente,
          user.sub,
          user.id_sede,
          dto.marca ?? garantia.marca,
          dto.modelo ?? garantia.modelo,
          dto.imei ?? garantia.imei,
          dto.esta_encendido ?? null,
          dto.checklist_estado ?? null,
          dto.diagnostico_tecnico ?? null,
          dto.fecha_estimada ?? null,
          estadoInicial.id_estado,
          idGarantia,
        ],
      );
      nuevaReparacionId = inserted.id_reparacion;

      await manager.query(
        `UPDATE garantias
         SET estado = 'invalidada', motivo_invalidacion = $2, updated_at = now()
         WHERE id_garantia = $1`,
        [
          idGarantia,
          `Reclamo de garantía utilizado (reparación #${nuevaReparacionId})`,
        ],
      );
    });

    return this.reparacionesService.findOne(nuevaReparacionId, user);
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
    let idReparacionFilter = '';

    if (query.estado) {
      estadoFilter = ` AND g.estado = $${idx++}`;
      params.push(query.estado);
    }

    if (query.id_reparacion) {
      idReparacionFilter = ` AND g.id_reparacion = $${idx++}`;
      params.push(query.id_reparacion);
    }

    const whereClause = `${sedeCondition}${estadoFilter}${idReparacionFilter}`;

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
