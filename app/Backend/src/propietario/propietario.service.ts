// app/Backend/src/propietario/propietario.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ResumenHoyDto } from './dto/resumen-hoy.dto';
import { VentaRecienteDto } from './dto/venta-reciente.dto';
import { TopProductoDto } from './dto/top-producto.dto';
import { UpsertMetaRolDto } from './dto/upsert-meta-rol.dto';
import { ReportesQueryDto } from './dto/reportes-query.dto';

@Injectable()
export class PropietarioService {
  constructor(private readonly dataSource: DataSource) {}

  async getResumenHoy(sede: number | null): Promise<ResumenHoyDto> {
    const [ventasRow, repRow] = await Promise.all([
      this.dataSource.query<
        {
          ventas_hoy: string;
          ingresos_ventas_hoy: string;
          ingresos_mes: string;
          ingresos_mes_ant: string;
          ventas_ayer: string;
          ingresos_ventas_ayer: string;
        }[]
      >(
        `WITH dedup AS (
           SELECT DISTINCT ON (id_venta)
             id_venta, id_sede, total_venta_cabecera,
             DATE(fecha_emision AT TIME ZONE 'America/Lima') AS fecha
           FROM v_vendedor_ventas
           ORDER BY id_venta
         )
         SELECT
           COALESCE(COUNT(*)         FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date), 0)::text         AS ventas_hoy,
           COALESCE(SUM(total_venta_cabecera) FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date), 0)::numeric AS ingresos_ventas_hoy,
           COALESCE(SUM(total_venta_cabecera) FILTER (WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date)), 0)::numeric AS ingresos_mes,
           COALESCE(SUM(total_venta_cabecera) FILTER (WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date) - INTERVAL '1 month'), 0)::numeric AS ingresos_mes_ant,
           COALESCE(COUNT(*)         FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date - 1), 0)::text         AS ventas_ayer,
           COALESCE(SUM(total_venta_cabecera) FILTER (WHERE fecha = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date - 1), 0)::numeric AS ingresos_ventas_ayer
         FROM dedup
         WHERE ($1::int IS NULL OR id_sede = $1)`,
        [sede],
      ),
      this.dataSource.query<
        {
          ingresos_reparaciones_hoy: string;
          reparaciones_hoy: string;
          ingresos_reparaciones_ayer: string;
        }[]
      >(
        `SELECT
           COALESCE(SUM(p.monto) FILTER (WHERE DATE(p.fecha_pago AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date), 0)::numeric AS ingresos_reparaciones_hoy,
           COUNT(DISTINCT p.id_reparacion) FILTER (WHERE DATE(p.fecha_pago AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date)            AS reparaciones_hoy,
           COALESCE(SUM(p.monto) FILTER (WHERE DATE(p.fecha_pago AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date - 1), 0)::numeric AS ingresos_reparaciones_ayer
         FROM pagos p
         JOIN reparaciones r ON r.id_reparacion = p.id_reparacion
         WHERE ($1::int IS NULL OR r.id_sede = $1)`,
        [sede],
      ),
    ]);

    const v = ventasRow[0];
    const r = repRow[0];

    const ventas_hoy = parseInt(v.ventas_hoy, 10);
    const ingresos_ventas_hoy = Number(v.ingresos_ventas_hoy);
    const ingresos_reparaciones_hoy = Number(r.ingresos_reparaciones_hoy);
    const ingresos_total_hoy = ingresos_ventas_hoy + ingresos_reparaciones_hoy;
    const reparaciones_hoy = parseInt(r.reparaciones_hoy, 10);

    return plainToInstance(
      ResumenHoyDto,
      {
        ventas_hoy,
        ingresos_ventas_hoy,
        ingresos_reparaciones_hoy,
        ingresos_total_hoy,
        ingresos_mes: Number(v.ingresos_mes),
        ingresos_mes_ant: Number(v.ingresos_mes_ant),
        ticket_promedio: ventas_hoy > 0 ? ingresos_ventas_hoy / ventas_hoy : 0,
        transacciones_hoy: ventas_hoy + reparaciones_hoy,
        ingresos_total_ayer:
          Number(v.ingresos_ventas_ayer) + Number(r.ingresos_reparaciones_ayer),
        ventas_ayer: parseInt(v.ventas_ayer, 10),
      },
      { excludeExtraneousValues: true },
    );
  }

  async getVentasRecientes(sede: number | null): Promise<VentaRecienteDto[]> {
    const rows = await this.dataSource.query<
      {
        id_venta: number;
        hora: string;
        cliente: string | null;
        vendedor: string;
        total: string;
      }[]
    >(
      `SELECT DISTINCT ON (id_venta)
         id_venta,
         TO_CHAR(fecha_emision AT TIME ZONE 'America/Lima', 'HH24:MI') AS hora,
         cliente,
         vendedor,
         total_venta_cabecera AS total
       FROM v_vendedor_ventas
       WHERE ($1::int IS NULL OR id_sede = $1)
         AND DATE(fecha_emision AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
       ORDER BY id_venta DESC
       LIMIT 8`,
      [sede],
    );

    return plainToInstance(
      VentaRecienteDto,
      rows.map((r) => ({ ...r, total: Number(r.total) })),
      { excludeExtraneousValues: true },
    );
  }

  async getTopProductos(sede: number | null): Promise<TopProductoDto[]> {
    const rows = await this.dataSource.query<
      {
        id_item: number;
        nombre: string;
        sku: string;
        unidades: string;
        ingresos: string;
        pct: number;
      }[]
    >(
      `WITH ranking AS (
         SELECT
           dv.id_item,
           i.nombre,
           i.sku,
           SUM(dv.cantidad)::numeric AS unidades,
           SUM(dv.importe)::numeric  AS ingresos
         FROM detalle_venta dv
         JOIN items i   ON i.id_item  = dv.id_item
         JOIN ventas v  ON v.id_venta = dv.id_venta
         WHERE ($1::int IS NULL OR v.id_sede = $1)
           AND DATE_TRUNC('month', v.fecha_emision AT TIME ZONE 'America/Lima')
               = DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'))
         GROUP BY dv.id_item, i.nombre, i.sku
         ORDER BY unidades DESC
         LIMIT 5
       )
       SELECT *, ROUND(unidades / NULLIF(MAX(unidades) OVER (), 0) * 100)::integer AS pct
       FROM ranking`,
      [sede],
    );

    return plainToInstance(
      TopProductoDto,
      rows.map((r) => ({
        ...r,
        unidades: Number(r.unidades),
        ingresos: Number(r.ingresos),
      })),
      { excludeExtraneousValues: true },
    );
  }

  async upsertMetaRol(dto: UpsertMetaRolDto): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO config_metas_rol (id_rol, meta_ventas_diaria)
       VALUES ($1, $2)
       ON CONFLICT (id_rol) DO UPDATE
       SET meta_ventas_diaria = EXCLUDED.meta_ventas_diaria,
           updated_at = now()`,
      [dto.id_rol, dto.meta_ventas_diaria],
    );
  }

  async getEmpleadosVsMetaHoy(sede: number | null): Promise<object[]> {
    return this.dataSource.query(
      `WITH ventas_hoy AS (
         SELECT v.id_empleado, COALESCE(SUM(dv.importe), 0) AS total
         FROM detalle_venta dv
         JOIN ventas v ON v.id_venta = dv.id_venta
         WHERE ($1::int IS NULL OR v.id_sede = $1)
           AND DATE(v.fecha_emision AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
         GROUP BY v.id_empleado
       ), reps_hoy AS (
         SELECT id_tecnico AS id_empleado,
                COALESCE(SUM(monto_cotizado), 0) AS total
         FROM reparaciones
         WHERE ($1::int IS NULL OR id_sede = $1)
           AND DATE(fecha_terminado AT TIME ZONE 'America/Lima') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date
           AND fecha_terminado IS NOT NULL
         GROUP BY id_tecnico
       )
       SELECT e.id_empleado, e.nombre_completo, r.nombre_rol,
              COALESCE(vh.total, rh.total, 0)::numeric AS total_hoy,
              cmr.meta_ventas_diaria::numeric
       FROM empleados e
       JOIN roles r ON r.id_rol = e.id_rol
       LEFT JOIN config_metas_rol cmr ON cmr.id_rol = e.id_rol
       LEFT JOIN ventas_hoy vh ON vh.id_empleado = e.id_empleado
       LEFT JOIN reps_hoy rh ON rh.id_empleado = e.id_empleado
       WHERE ($1::int IS NULL OR e.id_sede = $1) AND e.estado = 'activo'
         AND r.nombre_rol IN ('vendedor', 'tecnico')
         AND cmr.id_rol IS NOT NULL
       ORDER BY total_hoy ASC`,
      [sede],
    );
  }

  async getReportes(query: ReportesQueryDto): Promise<object> {
    const sede = query.id_sede ? parseInt(String(query.id_sede), 10) : null;
    const desde =
      query.fecha_desde ??
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const hasta = query.fecha_hasta ?? new Date().toISOString().split('T')[0];

    const [ventasRows, repRows, comprasRows, empleadosRows, inventarioRows] =
      await Promise.all([
        // Ventas por día
        this.dataSource.query<
          { fecha: string; total_ventas: string; ingresos: string }[]
        >(
          `WITH dedup AS (
           SELECT DISTINCT ON (id_venta) id_venta, id_sede, total_venta_cabecera,
             DATE(fecha_emision AT TIME ZONE 'America/Lima') AS fecha
           FROM v_vendedor_ventas ORDER BY id_venta
         )
         SELECT fecha::text,
           COUNT(*)::text AS total_ventas,
           COALESCE(SUM(total_venta_cabecera), 0)::numeric AS ingresos
         FROM dedup
         WHERE ($1::int IS NULL OR id_sede = $1)
           AND fecha BETWEEN $2::date AND $3::date
         GROUP BY fecha ORDER BY fecha`,
          [sede, desde, hasta],
        ),
        // Reparaciones por estado
        this.dataSource.query<
          { estado: string; total: string; ingresos: string }[]
        >(
          `SELECT er.nombre AS estado,
           COUNT(*)::text AS total,
           COALESCE(SUM(r.monto_cotizado), 0)::numeric AS ingresos
         FROM reparaciones r
         LEFT JOIN estados_reparacion er ON er.id_estado = r.id_estado
         WHERE ($1::int IS NULL OR r.id_sede = $1)
           AND DATE(r.fecha_ingreso AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date
         GROUP BY er.nombre`,
          [sede, desde, hasta],
        ),
        // Compras resumen (table: compras_refill, sede column: id_sede_destino)
        this.dataSource.query<{ total_compras: string; monto_total: string }[]>(
          `SELECT COUNT(DISTINCT c.id_compra)::text AS total_compras,
           COALESCE(SUM(d.cantidad_comprada * d.costo_unidad), 0)::numeric AS monto_total
         FROM compras_refill c
         JOIN detalle_compra_refill d ON d.id_compra = c.id_compra
         WHERE ($1::int IS NULL OR c.id_sede_destino = $1)
           AND DATE(c.fecha_compra AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date`,
          [sede, desde, hasta],
        ),
        // Empleados rendimiento
        this.dataSource.query<
          {
            nombre_completo: string;
            nombre_rol: string;
            total_ventas: string;
            total_reparaciones: string;
          }[]
        >(
          `WITH emp_ventas AS (
           SELECT v.id_empleado, COALESCE(SUM(dv.importe), 0) AS total
           FROM detalle_venta dv
           JOIN ventas v ON v.id_venta = dv.id_venta
           WHERE ($1::int IS NULL OR v.id_sede = $1)
             AND DATE(v.fecha_emision AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date
           GROUP BY v.id_empleado
         ), emp_reps AS (
           SELECT id_tecnico AS id_empleado, COALESCE(SUM(monto_cotizado), 0) AS total
           FROM reparaciones
           WHERE ($1::int IS NULL OR id_sede = $1)
             AND DATE(fecha_ingreso AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date
             AND fecha_terminado IS NOT NULL
           GROUP BY id_tecnico
         )
         SELECT e.nombre_completo, ro.nombre_rol,
           COALESCE(ev.total, 0)::numeric AS total_ventas,
           COALESCE(er.total, 0)::numeric AS total_reparaciones
         FROM empleados e
         JOIN roles ro ON ro.id_rol = e.id_rol
         LEFT JOIN emp_ventas ev ON ev.id_empleado = e.id_empleado
         LEFT JOIN emp_reps er ON er.id_empleado = e.id_empleado
         WHERE ($1::int IS NULL OR e.id_sede = $1)
           AND e.estado = 'activo'
           AND (ev.id_empleado IS NOT NULL OR er.id_empleado IS NOT NULL)
         ORDER BY (COALESCE(ev.total,0) + COALESCE(er.total,0)) DESC`,
          [sede, desde, hasta],
        ),
        // Inventario bajo stock
        this.dataSource.query<
          { total_items: string; items_bajo_stock: string }[]
        >(
          `SELECT COUNT(*)::text AS total_items,
           COUNT(*) FILTER (WHERE cantidad_actual <= stock_minimo)::text AS items_bajo_stock
         FROM inventario_sedes
         WHERE ($1::int IS NULL OR id_sede = $1)`,
          [sede],
        ),
      ]);

    const ventas = ventasRows.map((r) => ({
      fecha: r.fecha,
      total_ventas: parseInt(r.total_ventas, 10),
      ingresos: Number(r.ingresos),
    }));

    const reparaciones = repRows.map((r) => ({
      estado: r.estado,
      total: parseInt(r.total, 10),
      ingresos: Number(r.ingresos),
    }));

    const compras = {
      total_compras: parseInt(comprasRows[0]?.total_compras ?? '0', 10),
      monto_total: Number(comprasRows[0]?.monto_total ?? 0),
    };

    const empleados = empleadosRows.map((r) => ({
      nombre_completo: r.nombre_completo,
      nombre_rol: r.nombre_rol,
      total_ventas: Number(r.total_ventas),
      total_reparaciones: Number(r.total_reparaciones),
    }));

    const inventario = {
      total_items: parseInt(inventarioRows[0]?.total_items ?? '0', 10),
      items_bajo_stock: parseInt(
        inventarioRows[0]?.items_bajo_stock ?? '0',
        10,
      ),
    };

    return {
      ventas,
      reparaciones,
      compras,
      empleados,
      inventario,
      desde,
      hasta,
    };
  }
}
