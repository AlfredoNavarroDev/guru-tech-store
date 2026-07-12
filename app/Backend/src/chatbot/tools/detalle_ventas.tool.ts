// app/Backend/src/chatbot/tools/detalle_ventas.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta que devuelve ventas individuales con cliente, productos y métodos de pago
export const consultarDetalleVentasTool = (
  dataSource: DataSource,
  idSede: number,
) =>
  tool({
    description:
      'Devuelve el detalle de ventas individuales: cliente, productos vendidos, cantidades, precios y métodos de pago. Úsalo cuando pregunten "qué vendimos", "a quién le vendimos", "cómo pagó el cliente", "detalle de ventas de hoy/semana/mes", "última venta".',
    parameters: z.object({
      periodo: z
        .enum(['hoy', 'semana', 'mes', 'personalizado'])
        .default('hoy')
        .describe('Periodo a consultar'),
      fecha_inicio: z
        .string()
        .optional()
        .describe(
          'Fecha inicio ISO (YYYY-MM-DD) — solo si periodo=personalizado',
        ),
      fecha_fin: z
        .string()
        .optional()
        .describe('Fecha fin ISO (YYYY-MM-DD) — solo si periodo=personalizado'),
      nombre_cliente: z
        .string()
        .optional()
        .describe('Filtra por nombre o parte del nombre del cliente'),
      limite: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Número máximo de ventas a devolver (1-20)'),
    }),
    execute: async ({
      periodo,
      fecha_inicio,
      fecha_fin,
      nombre_cliente,
      limite,
    }) => {
      try {
        const limaHoy = new Date().toLocaleDateString('en-CA', {
          timeZone: 'America/Lima',
        });
        let desde: string;
        let hasta: string;

        if (periodo === 'hoy') {
          desde = hasta = limaHoy;
        } else if (periodo === 'semana') {
          const d = new Date(limaHoy + 'T12:00:00');
          d.setDate(d.getDate() - 6);
          desde = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
          hasta = limaHoy;
        } else if (periodo === 'mes') {
          desde = limaHoy.slice(0, 7) + '-01';
          hasta = limaHoy;
        } else {
          desde = fecha_inicio ?? limaHoy;
          hasta = fecha_fin ?? limaHoy;
        }

        const ventaConditions: string[] = [
          'v.id_sede = $1',
          `DATE(v.fecha_emision AT TIME ZONE 'America/Lima') BETWEEN $2 AND $3`,
        ];
        const ventaParams: (number | string)[] = [idSede, desde, hasta];
        let idx = 4;

        if (nombre_cliente) {
          const safe = nombre_cliente.replace(/%/g, '\\%').replace(/_/g, '\\_');
          ventaConditions.push(`c.nombre_completo ILIKE $${idx++}`);
          ventaParams.push(`%${safe}%`);
        }

        const where = ventaConditions.join(' AND ');

        // Obtiene ventas con resumen de productos y total
        const ventas = await dataSource.query<
          {
            id_venta: number;
            fecha: string;
            cliente: string | null;
            total: string;
            descuento: string;
          }[]
        >(
          `SELECT v.id_venta,
                  TO_CHAR(v.fecha_emision, 'DD/MM/YYYY HH24:MI') AS fecha,
                  c.nombre_completo AS cliente,
                  COALESCE(SUM(dv.importe), 0)::text AS total,
                  COALESCE(v.monto_descuento, 0)::text AS descuento
           FROM ventas v
           LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
           JOIN detalle_venta dv ON dv.id_venta = v.id_venta
           WHERE ${where}
           GROUP BY v.id_venta, v.fecha_emision, c.nombre_completo, v.monto_descuento
           ORDER BY v.fecha_emision DESC
           LIMIT $${idx}`,
          [...ventaParams, limite],
        );

        if (ventas.length === 0) {
          const periodoLabel =
            periodo === 'personalizado' ? `${desde} al ${hasta}` : periodo;
          return {
            message: `No se encontraron ventas para ${periodoLabel}.`,
            ventas: [],
          };
        }

        const idVentas = ventas.map((v) => v.id_venta);

        // Obtiene productos de cada venta
        const productos = await dataSource.query<
          {
            id_venta: number;
            producto: string;
            cantidad: string;
            precio_unitario: string;
            importe: string;
          }[]
        >(
          `SELECT dv.id_venta,
                  i.nombre AS producto,
                  dv.cantidad::text,
                  dv.precio_unitario_momento::text AS precio_unitario,
                  dv.importe::text
           FROM detalle_venta dv
           JOIN items i ON i.id_item = dv.id_item
           WHERE dv.id_venta = ANY($1)
           ORDER BY dv.id_venta, i.nombre`,
          [idVentas],
        );

        // Obtiene métodos de pago de cada venta
        const pagos = await dataSource.query<
          {
            id_venta: number;
            metodo_pago: string;
            monto: string;
          }[]
        >(
          `SELECT p.id_venta,
                  p.metodo_pago,
                  p.monto::text
           FROM pagos p
           WHERE p.id_venta = ANY($1)
           ORDER BY p.id_venta, p.metodo_pago`,
          [idVentas],
        );

        // Agrupa productos y pagos por id_venta
        const productosPorVenta = new Map<number, typeof productos>();
        for (const p of productos) {
          if (!productosPorVenta.has(p.id_venta))
            productosPorVenta.set(p.id_venta, []);
          productosPorVenta.get(p.id_venta)!.push(p);
        }

        const pagosPorVenta = new Map<number, typeof pagos>();
        for (const p of pagos) {
          if (!pagosPorVenta.has(p.id_venta)) pagosPorVenta.set(p.id_venta, []);
          pagosPorVenta.get(p.id_venta)!.push(p);
        }

        const result = ventas.map((v) => ({
          fecha: v.fecha,
          cliente: v.cliente ?? 'Sin cliente registrado',
          total: parseFloat(v.total),
          descuento: parseFloat(v.descuento),
          productos: (productosPorVenta.get(v.id_venta) ?? []).map((p) => ({
            producto: p.producto,
            cantidad: parseInt(p.cantidad, 10),
            precio_unitario: parseFloat(p.precio_unitario),
            importe: parseFloat(p.importe),
          })),
          pagos: (pagosPorVenta.get(v.id_venta) ?? []).map((p) => ({
            metodo: p.metodo_pago,
            monto: parseFloat(p.monto),
          })),
        }));

        return {
          message: null,
          periodo:
            periodo === 'personalizado' ? `${desde} al ${hasta}` : periodo,
          total_ventas: ventas.length,
          ventas: result,
        };
      } catch {
        return {
          message: 'Error al consultar el detalle de ventas.',
          ventas: [],
        };
      }
    },
  });
