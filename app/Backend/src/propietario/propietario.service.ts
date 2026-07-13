// Servicio del propietario: dashboard global, reportes de negocio y generación de PDFs.
// Los PDFs se cachean en Cloudflare R2 por rango de fecha para no regenerarlos cada vez.
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { ResumenHoyDto } from './dto/resumen-hoy.dto';
import { VentaRecienteDto } from './dto/venta-reciente.dto';
import { TopProductoDto } from './dto/top-producto.dto';
import { UpsertMetaRolDto } from './dto/upsert-meta-rol.dto';
import { ReportesQueryDto } from './dto/reportes-query.dto';
import { PdfService } from '../common/pdf.service';

type TipoPdf = 'ventas' | 'reparaciones' | 'ventas-reparaciones' | 'compras';

interface VentasRow { fecha: string; total_ventas: string; ingresos: string; }
interface RepsRow   { estado: string; total: string; ingresos: string; }
interface ComprasRow{ total_compras: string; monto_total: string; }
interface EmpleadosRow { nombre_completo: string; nombre_rol: string; total_ventas: string; total_reparaciones: string; }

@Injectable()
export class PropietarioService implements OnModuleInit {
  private readonly logger = new Logger(PropietarioService.name);
  private s3: S3Client;
  private logoBase64 = '';
  private ventasTpl!: Handlebars.TemplateDelegate;
  private repsTpl!: Handlebars.TemplateDelegate;
  private ventasRepsTpl!: Handlebars.TemplateDelegate;
  private comprasTpl!: Handlebars.TemplateDelegate;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly pdfService: PdfService,
  ) {
    // Inicializa cliente S3 compatible con Cloudflare R2 (endpoint de cuenta, región 'auto').
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.get<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  // Compila las 4 plantillas Handlebars y pre-carga el logo como base64 al arrancar el módulo.
  async onModuleInit(): Promise<void> {
    const tplDir = join(__dirname, 'templates');
    this.ventasTpl     = Handlebars.compile(readFileSync(join(tplDir, 'reporte-ventas.hbs'), 'utf8'));
    this.repsTpl       = Handlebars.compile(readFileSync(join(tplDir, 'reporte-reparaciones.hbs'), 'utf8'));
    this.ventasRepsTpl = Handlebars.compile(readFileSync(join(tplDir, 'reporte-ventas-reparaciones.hbs'), 'utf8'));
    this.comprasTpl    = Handlebars.compile(readFileSync(join(tplDir, 'reporte-compras.hbs'), 'utf8'));

    const r2Public = this.config.get<string>('R2_PUBLIC_URL', '');
    if (r2Public) {
      try {
        const res = await fetch(`${r2Public}/gts_logo.png`);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          this.logoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        } else {
          this.logger.warn(`Logo not found in R2 (${res.status}), PDFs will omit logo`);
        }
      } catch (err) {
        this.logger.warn('Could not fetch logo for PDF reports', err);
      }
    }
  }

  // KPIs del día para el dashboard del propietario: ventas, ingresos, reparaciones, ticket promedio.
  // sede=null → agrega todas las sedes; sede=N → filtra solo esa sede.
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

  // Últimas 8 ventas del día actual. DISTINCT ON evita duplicar ventas con múltiples ítems.
  async getVentasRecientes(sede: number | null): Promise<VentaRecienteDto[]> {
    const rows = await this.dataSource.query<
      {
        id_venta: number;
        hora: string;
        cliente: string | null;
        vendedor: string;
        total: string;
        sede_nombre: string;
      }[]
    >(
      `SELECT DISTINCT ON (id_venta)
         id_venta,
         TO_CHAR(fecha_emision AT TIME ZONE 'America/Lima', 'HH24:MI') AS hora,
         cliente,
         vendedor,
         total_venta_cabecera AS total,
         sede AS sede_nombre
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

  // Top 5 productos del mes actual por unidades vendidas. pct = porcentaje relativo al más vendido.
  async getTopProductos(sede: number | null): Promise<TopProductoDto[]> {
    const rows = await this.dataSource.query<
      {
        id_item: number;
        nombre: string;
        sku: string;
        unidades: string;
        ingresos: string;
        sede_nombre: string | null;
        pct: number;
      }[]
    >(
      `WITH ranking AS (
         SELECT
           dv.id_item,
           i.nombre,
           i.sku,
           SUM(dv.cantidad)::numeric AS unidades,
           SUM(dv.importe)::numeric  AS ingresos,
           CASE WHEN $1::int IS NOT NULL THEN MAX(v.id_sede) ELSE NULL END AS id_sede_agg
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
       SELECT r.id_item, r.nombre, r.sku, r.unidades, r.ingresos,
              s.nombre AS sede_nombre,
              ROUND(r.unidades / NULLIF(MAX(r.unidades) OVER (), 0) * 100)::integer AS pct
       FROM ranking r
       LEFT JOIN sedes s ON s.id_sede = r.id_sede_agg`,
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

  // Crea o actualiza la meta diaria de ventas para un rol. ON CONFLICT permite idempotencia.
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

  // Compara el rendimiento real del día de cada empleado activo contra su meta diaria.
  // Solo incluye empleados con meta configurada en config_metas_rol.
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
              cmr.meta_ventas_diaria::numeric,
              s.nombre AS sede_nombre
       FROM empleados e
       JOIN roles r ON r.id_rol = e.id_rol
       LEFT JOIN config_metas_rol cmr ON cmr.id_rol = e.id_rol
       LEFT JOIN ventas_hoy vh ON vh.id_empleado = e.id_empleado
       LEFT JOIN reps_hoy rh ON rh.id_empleado = e.id_empleado
       LEFT JOIN sedes s ON s.id_sede = e.id_sede
       WHERE ($1::int IS NULL OR e.id_sede = $1) AND e.estado = 'activo'
         AND r.nombre_rol IN ('vendedor', 'tecnico')
         AND cmr.id_rol IS NOT NULL
       ORDER BY total_hoy ASC`,
      [sede],
    );
  }

  // Agrega datos de ventas, reparaciones, compras, empleados e inventario en un solo objeto.
  // Todas las subqueries se lanzan en paralelo con Promise.all para reducir latencia.
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

  // Genera (o devuelve cacheado) un PDF en R2. Si el rango es histórico (hasta < hoy)
  // y el PDF ya existe en R2, devuelve la URL directamente sin regenerar.
  async getReportePdf(
    tipo: TipoPdf,
    query: ReportesQueryDto,
  ): Promise<{ url: string }> {
    const sede = query.id_sede ? Number(query.id_sede) : null;
    const desde =
      query.fecha_desde ??
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const hasta = query.fecha_hasta ?? new Date().toISOString().split('T')[0];

    const { bucket, publicUrl } = this.getR2Config();
    const key = `reportes/${tipo}/${sede ?? 'global'}/${desde}_${hasta}.pdf`;
    const today = new Date().toISOString().split('T')[0];

    if (hasta < today) {
      try {
        await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { url: `${publicUrl}/${key}` };
      } catch (err: unknown) {
        const isNotFound =
          (err as { name?: string })?.name === 'NotFound' ||
          (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404;
        if (!isNotFound) throw err;
        // 404 = not cached yet — fall through to generation
      }
    }

    const html = await this.buildReporteHtml(tipo, sede, desde, hasta);
    const buffer = await this.pdfService.generateFromHtml(html);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        CacheControl: 'public, max-age=31536000',
      }),
    );

    return { url: `${publicUrl}/${key}` };
  }

  // Consulta los datos del período y renderiza la plantilla HBS correspondiente al tipo.
  private async buildReporteHtml(
    tipo: TipoPdf,
    sede: number | null,
    desde: string,
    hasta: string,
  ): Promise<string> {
    const sedeNombre = sede
      ? ((await this.dataSource.query<{ nombre: string }[]>(
          `SELECT nombre FROM sedes WHERE id_sede = $1`,
          [sede],
        ))[0]?.nombre ?? String(sede))
      : 'Todas las sedes';

    const generadoEn = new Date().toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const fmt = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtMoney = (n: number) => fmt.format(n);

    const commonCtx = { logoBase64: this.logoBase64, desde, hasta, sedeNombre, generadoEn };

    if (tipo === 'ventas') {
      const rows = await this.dataSource.query<VentasRow[]>(
        `WITH dedup AS (
           SELECT DISTINCT ON (id_venta) id_venta, id_sede, total_venta_cabecera,
             DATE(fecha_emision AT TIME ZONE 'America/Lima') AS fecha
           FROM v_vendedor_ventas ORDER BY id_venta
         )
         SELECT fecha::text, COUNT(*)::text AS total_ventas, COALESCE(SUM(total_venta_cabecera),0)::numeric AS ingresos
         FROM dedup
         WHERE ($1::int IS NULL OR id_sede = $1) AND fecha BETWEEN $2::date AND $3::date
         GROUP BY fecha ORDER BY fecha`,
        [sede, desde, hasta],
      );
      const ventas = rows.map((r) => ({
        fecha: r.fecha,
        total_ventas: parseInt(r.total_ventas, 10),
        ingresos: fmtMoney(Number(r.ingresos)),
        ticket_prom: parseInt(r.total_ventas, 10) > 0
          ? fmtMoney(Number(r.ingresos) / parseInt(r.total_ventas, 10))
          : '0.00',
      }));
      const totalVentas = ventas.reduce((s, r) => s + r.total_ventas, 0);
      const totalIngresosVentas = fmtMoney(rows.reduce((s, r) => s + Number(r.ingresos), 0));
      return this.ventasTpl({ ...commonCtx, ventas, totalVentas, totalIngresosVentas });
    }

    if (tipo === 'reparaciones') {
      const rows = await this.dataSource.query<RepsRow[]>(
        `SELECT er.nombre AS estado, COUNT(*)::text AS total, COALESCE(SUM(r.monto_cotizado),0)::numeric AS ingresos
         FROM reparaciones r
         LEFT JOIN estados_reparacion er ON er.id_estado = r.id_estado
         WHERE ($1::int IS NULL OR r.id_sede = $1)
           AND DATE(r.fecha_ingreso AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date
         GROUP BY er.nombre`,
        [sede, desde, hasta],
      );
      const reparaciones = rows.map((r) => ({
        estado: r.estado,
        total: parseInt(r.total, 10),
        ingresos: fmtMoney(Number(r.ingresos)),
      }));
      const totalReps = reparaciones.reduce((s, r) => s + r.total, 0);
      const totalIngresosReps = fmtMoney(rows.reduce((s, r) => s + Number(r.ingresos), 0));
      return this.repsTpl({ ...commonCtx, reparaciones, totalReps, totalIngresosReps });
    }

    if (tipo === 'ventas-reparaciones') {
      const [ventasRows, repRows, empleadosRows] = await Promise.all([
        this.dataSource.query<VentasRow[]>(
          `WITH dedup AS (
             SELECT DISTINCT ON (id_venta) id_venta, id_sede, total_venta_cabecera,
               DATE(fecha_emision AT TIME ZONE 'America/Lima') AS fecha
             FROM v_vendedor_ventas ORDER BY id_venta
           )
           SELECT fecha::text, COUNT(*)::text AS total_ventas, COALESCE(SUM(total_venta_cabecera),0)::numeric AS ingresos
           FROM dedup
           WHERE ($1::int IS NULL OR id_sede = $1) AND fecha BETWEEN $2::date AND $3::date
           GROUP BY fecha ORDER BY fecha`,
          [sede, desde, hasta],
        ),
        this.dataSource.query<RepsRow[]>(
          `SELECT er.nombre AS estado, COUNT(*)::text AS total, COALESCE(SUM(r.monto_cotizado),0)::numeric AS ingresos
           FROM reparaciones r
           LEFT JOIN estados_reparacion er ON er.id_estado = r.id_estado
           WHERE ($1::int IS NULL OR r.id_sede = $1)
             AND DATE(r.fecha_ingreso AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date
           GROUP BY er.nombre`,
          [sede, desde, hasta],
        ),
        this.dataSource.query<EmpleadosRow[]>(
          `WITH emp_ventas AS (
             SELECT v.id_empleado, COALESCE(SUM(dv.importe),0) AS total
             FROM detalle_venta dv JOIN ventas v ON v.id_venta = dv.id_venta
             WHERE ($1::int IS NULL OR v.id_sede = $1)
               AND DATE(v.fecha_emision AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date
             GROUP BY v.id_empleado
           ), emp_reps AS (
             SELECT id_tecnico AS id_empleado, COALESCE(SUM(monto_cotizado),0) AS total
             FROM reparaciones
             WHERE ($1::int IS NULL OR id_sede = $1)
               AND DATE(fecha_ingreso AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date
               AND fecha_terminado IS NOT NULL
             GROUP BY id_tecnico
           )
           SELECT e.nombre_completo, ro.nombre_rol,
             COALESCE(ev.total,0)::numeric AS total_ventas,
             COALESCE(er.total,0)::numeric AS total_reparaciones
           FROM empleados e
           JOIN roles ro ON ro.id_rol = e.id_rol
           LEFT JOIN emp_ventas ev ON ev.id_empleado = e.id_empleado
           LEFT JOIN emp_reps er ON er.id_empleado = e.id_empleado
           WHERE ($1::int IS NULL OR e.id_sede = $1) AND e.estado = 'activo'
             AND (ev.id_empleado IS NOT NULL OR er.id_empleado IS NOT NULL)
           ORDER BY (COALESCE(ev.total,0)+COALESCE(er.total,0)) DESC`,
          [sede, desde, hasta],
        ),
      ]);

      const ventas = ventasRows.map((r) => ({
        fecha: r.fecha,
        total_ventas: parseInt(r.total_ventas, 10),
        ingresos: fmtMoney(Number(r.ingresos)),
        ticket_prom: parseInt(r.total_ventas, 10) > 0
          ? fmtMoney(Number(r.ingresos) / parseInt(r.total_ventas, 10))
          : '0.00',
      }));
      const reparaciones = repRows.map((r) => ({
        estado: r.estado,
        total: parseInt(r.total, 10),
        ingresos: fmtMoney(Number(r.ingresos)),
      }));
      const empleados = empleadosRows.map((r) => ({
        nombre_completo: r.nombre_completo,
        nombre_rol: r.nombre_rol,
        total_ventas: fmtMoney(Number(r.total_ventas)),
        total_reparaciones: fmtMoney(Number(r.total_reparaciones)),
      }));
      const totalVentas = ventas.reduce((s, r) => s + r.total_ventas, 0);
      const totalReps = reparaciones.reduce((s, r) => s + r.total, 0);
      const totalIngresosVentas = fmtMoney(ventasRows.reduce((s, r) => s + Number(r.ingresos), 0));
      const totalIngresosReps = fmtMoney(repRows.reduce((s, r) => s + Number(r.ingresos), 0));

      return this.ventasRepsTpl({ ...commonCtx, ventas, reparaciones, empleados, totalVentas, totalReps, totalIngresosVentas, totalIngresosReps });
    }

    // tipo === 'compras'
    const comprasRows = await this.dataSource.query<ComprasRow[]>(
      `SELECT COUNT(DISTINCT c.id_compra)::text AS total_compras,
         COALESCE(SUM(d.cantidad_comprada * d.costo_unidad),0)::numeric AS monto_total
       FROM compras_refill c
       JOIN detalle_compra_refill d ON d.id_compra = c.id_compra
       WHERE ($1::int IS NULL OR c.id_sede_destino = $1)
         AND DATE(c.fecha_compra AT TIME ZONE 'America/Lima') BETWEEN $2::date AND $3::date`,
      [sede, desde, hasta],
    );
    const totalCompras = parseInt(comprasRows[0]?.total_compras ?? '0', 10);
    const montoTotal = fmtMoney(Number(comprasRows[0]?.monto_total ?? 0));
    return this.comprasTpl({ ...commonCtx, totalCompras, montoTotal });
  }

  // Valida que las 5 variables de entorno de R2 estén presentes; falla rápido si alguna falta.
  private getR2Config(): { bucket: string; publicUrl: string } {
    const required = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
    ] as const;
    const missing = required.filter((k) => !this.config.get<string>(k));
    if (missing.length > 0) {
      throw new InternalServerErrorException(`Configuración R2 incompleta: ${missing.join(', ')}`);
    }
    return {
      bucket: this.config.get<string>('R2_BUCKET_NAME')!,
      publicUrl: this.config.get<string>('R2_PUBLIC_URL')!,
    };
  }
}
