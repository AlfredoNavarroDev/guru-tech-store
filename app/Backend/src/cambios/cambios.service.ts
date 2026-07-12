import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateCambioDto } from './dto/create-cambio.dto';
import { QueryCambiosDto } from './dto/query-cambios.dto';
import type {
  CambioResponseDto,
  VentaDetalleResponse,
} from './dto/cambio-response.dto';
import type { VentaListItem } from './dto/venta-response.dto';
import type { PaginatedResult } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../common/types';
import {
  CambioNotFoundException,
  CantidadExcedidaException,
  ItemNoEnVentaException,
  StockInsuficienteException,
  VentaNotFoundException,
} from '../common/exceptions';

// Máximo de ventas que se devuelven en el selector del flujo de cambios.
const VENTAS_LIMIT = 20;

// Forma de la fila devuelta por la vista v_cambio_detalle.
interface CambioRow {
  id_cambio: number;
  id_venta_origen: number;
  id_garantia: number | null;
  id_empleado: number;
  id_sede: number;
  id_item_devuelto: number;
  nombre_item_devuelto: string;
  cantidad: number;
  precio_devuelto: string;
  id_item_entregado: number;
  nombre_item_entregado: string;
  precio_entregado: string;
  diferencia_cobrada: string;
  metodo_pago_dif: string | null;
  referencia_transaccion: string | null;
  motivo: string;
  detalle: string | null;
  fecha_cambio: Date;
  created_at: Date;
}

// Servicio de negocio para cambios de producto; usa DataSource directamente para SQL explícito.
@Injectable()
export class CambiosService {
  constructor(private readonly dataSource: DataSource) {}

  // Devuelve cabecera + ítems de una venta. Vendedor solo ve ventas de su sede.
  async findVentaDetalle(
    id_venta: number,
    user: JwtPayload,
  ): Promise<VentaDetalleResponse> {
    const venta = await this.dataSource
      .createQueryBuilder()
      .select('v.id_venta')
      .addSelect('v.fecha_emision')
      .addSelect('c.nombre_completo', 'cliente')
      .from('ventas', 'v')
      .leftJoin('clientes', 'c', 'c.id_cliente = v.id_cliente')
      .where('v.id_venta = :id_venta', { id_venta })
      .andWhere('v.id_sede = :id_sede', { id_sede: user.id_sede! })
      .getRawOne<{ id_venta: number; fecha_emision: Date; cliente: string | null }>();

    if (!venta) throw new VentaNotFoundException(id_venta);

    // Carga los ítems de la venta para que el vendedor pueda elegir cuál devolver.
    // es_no_cambiable se resuelve: nivel ítem > nivel categoría > false (por defecto).
    // Consulta compleja con COALESCE y subconsulta correlacionada; se mantiene como SQL directo.
    const detalles = await this.dataSource.manager.query<
      Array<{
        id_item: number;
        nombre: string;
        sku: string;
        precio_unitario_momento: string;
        cantidad: number;
        es_no_cambiable: boolean;
      }>
    >(
      `SELECT dv.id_item, i.nombre, i.sku, dv.precio_unitario_momento, dv.cantidad,
              COALESCE(
                ir.es_no_cambiable,
                (SELECT bool_or(cr.es_no_cambiable)
                 FROM categoria_restricciones cr
                 JOIN item_categorias ic ON ic.id_categoria = cr.id_categoria
                 WHERE ic.id_item = dv.id_item),
                false
              ) AS es_no_cambiable
       FROM detalle_venta dv
       JOIN items i ON i.id_item = dv.id_item
       LEFT JOIN item_restricciones ir ON ir.id_item = dv.id_item
       WHERE dv.id_venta = $1`,
      [id_venta],
    );

    return {
      id_venta: venta.id_venta,
      fecha_emision: venta.fecha_emision,
      cliente: venta.cliente,
      detalles: detalles.map((d) => ({
        id_item: d.id_item,
        nombre: d.nombre,
        sku: d.sku,
        precio_unitario_momento: parseFloat(d.precio_unitario_momento),
        cantidad: d.cantidad,
        es_no_cambiable: d.es_no_cambiable,
      })),
    };
  }

  // Devuelve hasta VENTAS_LIMIT ventas de la sede, opcionalmente filtradas por fecha exacta.
  async findVentas(user: JwtPayload, fecha?: string): Promise<VentaListItem[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('v.id_venta')
      .addSelect('v.fecha_emision')
      .addSelect('c.nombre_completo', 'cliente')
      .addSelect(
        '(SELECT COUNT(*) FROM detalle_venta dv WHERE dv.id_venta = v.id_venta)',
        'total_items',
      )
      .from('ventas', 'v')
      .leftJoin('clientes', 'c', 'c.id_cliente = v.id_cliente')
      .where('v.id_sede = :id_sede', { id_sede: user.id_sede! })
      .orderBy('v.fecha_emision', 'DESC')
      .limit(VENTAS_LIMIT);

    if (fecha) {
      // El mismo parámetro :fecha delimita el inicio y el fin del día completo.
      qb.andWhere(
        "v.fecha_emision >= :fecha AND v.fecha_emision < :fecha::date + INTERVAL '1 day'",
        { fecha },
      );
    }

    const rows = await qb.getRawMany<{
      id_venta: number;
      fecha_emision: Date;
      cliente: string | null;
      total_items: string;
    }>();

    return rows.map((r) => ({
      id_venta: r.id_venta,
      fecha_emision: r.fecha_emision,
      cliente: r.cliente,
      total_items: parseInt(r.total_items, 10),
    }));
  }

  // Registra el cambio de producto aplicando todas las validaciones antes de la transacción.
  async create(
    dto: CreateCambioDto,
    user: JwtPayload,
  ): Promise<CambioResponseDto> {
    // 1. Venta pertenece a sede del vendedor.
    const venta = await this.dataSource
      .createQueryBuilder()
      .select('v.id_venta')
      .from('ventas', 'v')
      .where('v.id_venta = :id_venta', { id_venta: dto.id_venta_origen })
      .andWhere('v.id_sede = :id_sede', { id_sede: user.id_sede! })
      .getRawOne<{ id_venta: number }>();
    if (!venta) throw new VentaNotFoundException(dto.id_venta_origen);

    // 2. Ítem devuelto está en el detalle de esa venta.
    const detalleRow = await this.dataSource
      .createQueryBuilder()
      .select('dv.cantidad')
      .from('detalle_venta', 'dv')
      .where('dv.id_venta = :id_venta', { id_venta: dto.id_venta_origen })
      .andWhere('dv.id_item = :id_item', { id_item: dto.id_item_devuelto })
      .getRawOne<{ cantidad: number }>();
    if (!detalleRow) {
      throw new ItemNoEnVentaException(
        dto.id_item_devuelto,
        dto.id_venta_origen,
      );
    }
    // La cantidad devuelta no puede superar la comprada en la venta original.
    if (dto.cantidad > detalleRow.cantidad) {
      throw new CantidadExcedidaException(dto.cantidad, detalleRow.cantidad);
    }

    // 3. Pre-verificar stock del ítem entregado antes de entrar en transacción.
    const invEntregado = await this.dataSource
      .createQueryBuilder()
      .select('inv.id_inventario')
      .addSelect('inv.cantidad_actual')
      .from('inventario_sedes', 'inv')
      .where('inv.id_item = :id_item', { id_item: dto.id_item_entregado })
      .andWhere('inv.id_sede = :id_sede', { id_sede: user.id_sede! })
      .getRawOne<{ id_inventario: number; cantidad_actual: number }>();
    if (!invEntregado || invEntregado.cantidad_actual < dto.cantidad) {
      throw new StockInsuficienteException(
        `Stock insuficiente para ítem ${dto.id_item_entregado}`,
      );
    }

    // 4. Transacción atómica: insert + ajuste de inventario de ambos ítems.
    let insertedId!: number;
    await this.dataSource.transaction(async (manager) => {
      const [inserted] = await manager.query<Array<{ id_cambio: number }>>(
        `INSERT INTO cambios_producto
           (id_venta_origen, id_garantia, id_empleado, id_sede,
            id_item_devuelto, cantidad, precio_devuelto,
            id_item_entregado, precio_entregado, diferencia_cobrada,
            metodo_pago_dif, referencia_transaccion, motivo, detalle)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id_cambio`,
        [
          dto.id_venta_origen,
          dto.id_garantia ?? null,
          user.sub,
          user.id_sede!,
          dto.id_item_devuelto,
          dto.cantidad,
          dto.precio_devuelto,
          dto.id_item_entregado,
          dto.precio_entregado,
          dto.diferencia_cobrada,
          dto.metodo_pago_dif ?? null,
          dto.referencia_transaccion ?? null,
          dto.motivo,
          dto.detalle ?? null,
        ],
      );
      insertedId = inserted.id_cambio;

      // Stock +cantidad: ítem devuelto regresa al inventario de la sede.
      await manager.query(
        `UPDATE inventario_sedes SET cantidad_actual = cantidad_actual + $1
         WHERE id_item = $2 AND id_sede = $3`,
        [dto.cantidad, dto.id_item_devuelto, user.id_sede!],
      );

      // Stock -cantidad: ítem entregado sale del inventario de la sede.
      await manager.query(
        `UPDATE inventario_sedes SET cantidad_actual = cantidad_actual - $1
         WHERE id_item = $2 AND id_sede = $3`,
        [dto.cantidad, dto.id_item_entregado, user.id_sede!],
      );
    });

    return this.findOne(insertedId, user);
  }

  // Listado paginado de cambios de la sede con filtros de rango de fechas opcionales.
  async findAll(
    user: JwtPayload,
    query: QueryCambiosDto,
  ): Promise<PaginatedResult<CambioResponseDto>> {
    const countQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from('v_cambio_detalle', 'c')
      .where('c.id_sede = :id_sede', { id_sede: user.id_sede! });

    const dataQb = this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('v_cambio_detalle', 'c')
      .where('c.id_sede = :id_sede', { id_sede: user.id_sede! })
      .orderBy('c.fecha_cambio', 'DESC')
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    // Los filtros de fecha se añaden dinámicamente solo si están presentes.
    if (query.fecha_desde) {
      countQb.andWhere('c.fecha_cambio >= :fecha_desde', {
        fecha_desde: query.fecha_desde,
      });
      dataQb.andWhere('c.fecha_cambio >= :fecha_desde', {
        fecha_desde: query.fecha_desde,
      });
    }
    if (query.fecha_hasta) {
      // Se añade 23:59:59 para incluir registros de todo el día final del rango.
      const hastaVal = `${query.fecha_hasta} 23:59:59`;
      countQb.andWhere('c.fecha_cambio <= :fecha_hasta', {
        fecha_hasta: hastaVal,
      });
      dataQb.andWhere('c.fecha_cambio <= :fecha_hasta', {
        fecha_hasta: hastaVal,
      });
    }

    // Conteo total y página de datos se lanzan en paralelo para reducir latencia.
    const [countRow, rows] = await Promise.all([
      countQb.getRawOne<{ total: string }>(),
      dataQb.getRawMany<CambioRow>(),
    ]);

    const total = parseInt(countRow!.total, 10);

    return {
      items: rows.map((r) => this.toResponse(r)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  // Recupera un cambio concreto; lanza excepción si no pertenece a la sede del usuario.
  async findOne(id: number, user: JwtPayload): Promise<CambioResponseDto> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('v_cambio_detalle', 'c')
      .where('c.id_cambio = :id', { id })
      .andWhere('c.id_sede = :id_sede', { id_sede: user.id_sede! })
      .getRawOne<CambioRow>();
    if (!row) throw new CambioNotFoundException(id);
    return this.toResponse(row);
  }

  // Convierte la fila cruda de la vista a la forma del DTO, parseando decimales de string a number.
  private toResponse(row: CambioRow): CambioResponseDto {
    return {
      id_cambio: row.id_cambio,
      id_venta_origen: row.id_venta_origen,
      id_garantia: row.id_garantia,
      id_empleado: row.id_empleado,
      id_sede: row.id_sede,
      id_item_devuelto: row.id_item_devuelto,
      nombre_item_devuelto: row.nombre_item_devuelto,
      cantidad: row.cantidad,
      precio_devuelto: parseFloat(row.precio_devuelto),
      id_item_entregado: row.id_item_entregado,
      nombre_item_entregado: row.nombre_item_entregado,
      precio_entregado: parseFloat(row.precio_entregado),
      diferencia_cobrada: parseFloat(row.diferencia_cobrada),
      metodo_pago_dif: row.metodo_pago_dif,
      referencia_transaccion: row.referencia_transaccion,
      motivo: row.motivo,
      detalle: row.detalle,
      fecha_cambio: row.fecha_cambio,
      created_at: row.created_at,
    };
  }
}
