import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { QueryVentasDto } from './dto/query-ventas.dto';
import {
  DetalleVentaResponseDto,
  ResumenHoyDto,
  VentaRecienteDto,
  VentaResponseDto,
} from './dto/venta-response.dto';
import type { JwtPayload } from '../common/types';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import {
  DescuentoSinJustificacionException,
  ImporteInvalidoException,
  StockInsuficienteException,
  VentaNotFoundException,
} from '../common/exceptions';

// Estructura de la vista que une Ventas + Detalle_Venta + Items + Clientes + Boletas.
export interface VentaVista {
  id_venta: number;
  id_sede: number;
  sede: string;
  id_empleado: number;
  vendedor: string;
  fecha_emision: Date;
  cliente: string | null;
  producto: string;
  sku: string;
  cantidad: number;
  precio_unitario_momento: number;
  precio_normal_momento: number | null;
  importe: number;
  monto_descuento: number;
  total_venta_cabecera: number;
  nro_boleta: string | null;
}

// Tipo para parsear COUNT(*) que PostgreSQL devuelve como string.
interface CountRow {
  total: string;
}

// Servicio principal de ventas. Crea ventas en transacción atómica, valida importes y stock.
@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepo: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private readonly detalleRepo: Repository<DetalleVenta>,
    private readonly dataSource: DataSource,
  ) {}

  // Crea venta + detalles en transacción atómica. Valida descuento con justificación e importe.
  async create(
    dto: CreateVentaDto,
    user: JwtPayload,
  ): Promise<VentaResponseDto> {
    // Descuento > 0 requiere justificación (auditoría para el propietario).
    if ((dto.monto_descuento ?? 0) > 0 && !dto.justificacion_descuento) {
      throw new DescuentoSinJustificacionException();
    }

    // Servidor recalcula importe (no confía en el cliente). Tolerancia ±0.01.
    for (const item of dto.items) {
      const expected = parseFloat(
        (item.precio_unitario_momento * item.cantidad).toFixed(2),
      );
      const actual = parseFloat(item.importe.toFixed(2));
      if (Math.abs(expected - actual) > 0.01) {
        throw new ImporteInvalidoException(item.id_item, expected, actual);
      }
    }

    // Ordenar ítems por id_item ASC → previene deadlocks en inserts concurrentes.
    const sortedItems = [...dto.items].sort((a, b) => a.id_item - b.id_item);

    let savedVenta!: Venta;
    try {
      // Transacción: si falla un detalle → ROLLBACK de toda la venta.
      await this.dataSource.transaction(async (manager) => {
        const venta = manager.create(Venta, {
          id_cliente: dto.id_cliente,
          // id_empleado e id_sede desde JWT → vendedor no puede falsear sede.
          id_empleado: user.sub,
          id_sede: user.id_sede!,
          monto_descuento: dto.monto_descuento ?? 0,
          tipo_descuento: dto.tipo_descuento ?? null,
          justificacion_descuento: dto.justificacion_descuento ?? null,
        });
        savedVenta = await manager.save(Venta, venta);

        for (const item of sortedItems) {
          // Costo congelado para margen histórico aunque cambie después.
          const detalle = manager.create(DetalleVenta, {
            id_venta: savedVenta.id_venta,
            id_item: item.id_item,
            cantidad: item.cantidad,
            precio_unitario_momento: item.precio_unitario_momento,
            precio_normal_momento: item.precio_normal_momento ?? null,
            costo_unitario_momento: item.costo_unitario_momento,
            importe: item.importe,
          });
          await manager.save(DetalleVenta, detalle);
        }

        // Garantía de 15 días creada automáticamente junto con la venta.
        await manager.query(
          `INSERT INTO garantias (id_venta, fecha_inicio, fecha_fin, estado)
           VALUES ($1, $2::date, $2::date + INTERVAL '15 days', 'activa')`,
          [savedVenta.id_venta, savedVenta.fecha_emision],
        );
      });
    } catch (err: unknown) {
      const pgErr = err as { code?: string; message?: string };
      // 40P01: deadlock → pedir reintento.
      if (pgErr.code === '40P01') {
        throw new ConflictException({
          message: 'Deadlock detectado, reintenta la operación',
          retry: true,
        });
      }
      // Trigger trg_descontar_stock → 'Stock insuficiente' → 409 en vez de 500.
      if (pgErr.message?.includes('Stock insuficiente')) {
        throw new StockInsuficienteException(pgErr.message);
      }
      throw err;
    }

    // Recargar con relaciones → manager.save() solo devuelve campos de la tabla.
    const venta = (await this.ventaRepo.findOne({
      where: { id_venta: savedVenta.id_venta },
      relations: { detalles: true },
    })) as Venta;

    // Mapeo a DTO → no expone costo_unitario_momento (dato sensible de margen).
    return {
      id_venta: venta.id_venta,
      fecha_emision: venta.fecha_emision,
      id_cliente: venta.id_cliente,
      id_empleado: venta.id_empleado,
      id_sede: venta.id_sede,
      monto_descuento: venta.monto_descuento,
      tipo_descuento: venta.tipo_descuento,
      justificacion_descuento: venta.justificacion_descuento,
      created_at: venta.created_at,
      updated_at: venta.updated_at,
      detalles: venta.detalles.map(
        (d): DetalleVentaResponseDto => ({
          id_detalle_v: d.id_detalle_v,
          id_venta: d.id_venta,
          id_item: d.id_item,
          cantidad: d.cantidad,
          precio_unitario_momento: d.precio_unitario_momento,
          precio_normal_momento: d.precio_normal_momento,
          importe: d.importe,
          created_at: d.created_at,
        }),
      ),
    };
  }

  // Historial paginado del vendedor. CTE para paginar ventas distintas, no filas de detalle.
  async findAll(
    user: JwtPayload,
    query: QueryVentasDto,
  ): Promise<PaginatedResult<VentaVista>> {
    // COUNT via QueryBuilder con parámetros nombrados.
    const countQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT id_venta)', 'total')
      .from('v_vendedor_ventas', 'vv')
      .where('id_empleado = :emp', { emp: user.sub });

    if (query.fecha_desde) {
      countQb.andWhere('fecha_emision >= :desde', { desde: query.fecha_desde });
    }
    if (query.fecha_hasta) {
      // 23:59:59 → rango inclusivo hasta fin del día.
      countQb.andWhere('fecha_emision <= :hasta', {
        hasta: `${query.fecha_hasta} 23:59:59`,
      });
    }
    if (query.id_cliente !== undefined) {
      countQb.andWhere(
        'id_venta IN (SELECT id_venta FROM Ventas WHERE id_cliente = :cliente)',
        { cliente: query.id_cliente },
      );
    }
    if (query.nombre_cliente) {
      countQb.andWhere('cliente ILIKE :nombre', {
        nombre: `%${query.nombre_cliente}%`,
      });
    }

    const countResult = await countQb.getRawOne<CountRow>();
    const total = parseInt(countResult!.total, 10);

    // CTE: pagina ventas distintas, no filas de detalle (bug fix).
    // La CTE no es expresable con QueryBuilder → manager.query con parámetros posicionales.
    let whereClause = `id_empleado = $1`;
    const filterParams: (string | number)[] = [user.sub];
    let idx = 2;

    if (query.fecha_desde) {
      whereClause += ` AND fecha_emision >= $${idx++}`;
      filterParams.push(query.fecha_desde);
    }
    if (query.fecha_hasta) {
      whereClause += ` AND fecha_emision <= $${idx++}`;
      filterParams.push(`${query.fecha_hasta} 23:59:59`);
    }
    if (query.id_cliente !== undefined) {
      whereClause += ` AND id_venta IN (SELECT id_venta FROM Ventas WHERE id_cliente = $${idx++})`;
      filterParams.push(query.id_cliente);
    }
    if (query.nombre_cliente) {
      whereClause += ` AND cliente ILIKE $${idx++}`;
      filterParams.push(`%${query.nombre_cliente}%`);
    }

    const pageParams = [
      ...filterParams,
      (query.page - 1) * query.limit,
      query.limit,
    ];
    const sql = `
      WITH paged_ids AS (
        SELECT DISTINCT id_venta, fecha_emision
        FROM v_vendedor_ventas
        WHERE ${whereClause}
        ORDER BY fecha_emision DESC
        OFFSET $${idx} LIMIT $${idx + 1}
      )
      SELECT vv.*
      FROM v_vendedor_ventas vv
      INNER JOIN paged_ids pv ON vv.id_venta = pv.id_venta
      ORDER BY pv.fecha_emision DESC, vv.id_venta DESC
    `;

    const items = (await this.dataSource.manager.query(
      sql,
      pageParams,
    )) as VentaVista[];

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // Detalle de una venta (múltiples filas de la vista, una por ítem). Filtra por vendedor.
  async findOne(id: number, user: JwtPayload): Promise<VentaVista[]> {
    const rows = (await this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('v_vendedor_ventas', 'vv')
      .where('id_venta = :id', { id })
      .andWhere('id_empleado = :emp', { emp: user.sub })
      .getRawMany()) as VentaVista[];
    if (!rows.length) throw new VentaNotFoundException(id);
    return rows;
  }

  // KPIs del día: ventas, ingresos, clientes (hoy vs ayer) + 5 ventas recientes.
  async getResumenHoy(user: JwtPayload): Promise<ResumenHoyDto> {
    interface StatsRow {
      ventas_hoy: string;
      ingresos_hoy: string;
      clientes_hoy: string;
      ventas_ayer: string;
      ingresos_ayer: string;
      clientes_ayer: string;
    }

    // Complejo COALESCE + FILTER → no expresable en QB, manager.query.
    const [stats] = (await this.dataSource.manager.query(
      `SELECT
         COALESCE(SUM(ventas)             FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date),         0) AS ventas_hoy,
         COALESCE(SUM(ingresos)           FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date),         0) AS ingresos_hoy,
         COALESCE(SUM(clientes_atendidos) FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date),         0) AS clientes_hoy,
         COALESCE(SUM(ventas)             FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date - 1),     0) AS ventas_ayer,
         COALESCE(SUM(ingresos)           FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date - 1),     0) AS ingresos_ayer,
         COALESCE(SUM(clientes_atendidos) FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date - 1),     0) AS clientes_ayer
       FROM v_vendedor_resumen_diario
       WHERE id_empleado = $1
         AND fecha IN ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date - 1)`,
      [user.sub],
    )) as StatsRow[];

    // DISTINCT ON es específico de PostgreSQL y no expresable en QB → manager.query.
    const recientes = (await this.dataSource.manager.query(
      `SELECT DISTINCT ON (id_venta)
         id_venta, cliente, total_venta_cabecera, fecha_emision
       FROM v_vendedor_ventas
       WHERE id_empleado = $1
         AND DATE(fecha_emision AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
       ORDER BY id_venta DESC
       LIMIT 5`,
      [user.sub],
    )) as VentaRecienteDto[];

    return {
      ventas_hoy: parseInt(stats.ventas_hoy, 10),
      ingresos_hoy: parseFloat(stats.ingresos_hoy),
      clientes_hoy: parseInt(stats.clientes_hoy, 10),
      ventas_ayer: parseInt(stats.ventas_ayer, 10),
      ingresos_ayer: parseFloat(stats.ingresos_ayer),
      clientes_ayer: parseInt(stats.clientes_ayer, 10),
      recientes,
    };
  }
}
