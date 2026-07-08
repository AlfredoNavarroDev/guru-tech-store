// app/Backend/src/chatbot/tools/ventas.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta que consulta ventas de la sede por periodo o fechas personalizadas, con ranking opcional de productos
export const consultarVentasTool = (dataSource: DataSource, idSede: number) =>
  tool({
    description:
      'Consulta ventas realizadas en la sede. Filtra por rango de fechas, nombre de cliente o producto. Devuelve total de ventas, ingresos y productos más vendidos. Úsalo para preguntas sobre ventas del día/semana/mes, ingresos, rendimiento de productos.',
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
        .describe('Nombre o parte del nombre del cliente'),
      nombre_producto: z
        .string()
        .optional()
        .describe('Nombre o parte del nombre del producto'),
      top_productos: z
        .boolean()
        .default(false)
        .describe(
          'Si true, devuelve ranking de productos más vendidos en el periodo',
        ),
    }),
    execute: async ({
      periodo,
      fecha_inicio,
      fecha_fin,
      nombre_cliente,
      nombre_producto,
      top_productos,
    }) => {
      try {
        // Calcula el rango de fechas según el periodo elegido; "mes" comienza el 1 del mes en curso
        let desde: string;
        let hasta: string;
        const now = new Date();
        if (periodo === 'hoy') {
          desde = hasta = now.toISOString().slice(0, 10);
        } else if (periodo === 'semana') {
          const d = new Date(now);
          d.setDate(d.getDate() - 6);
          desde = d.toISOString().slice(0, 10);
          hasta = now.toISOString().slice(0, 10);
        } else if (periodo === 'mes') {
          const d = new Date(now.getFullYear(), now.getMonth(), 1);
          desde = d.toISOString().slice(0, 10);
          hasta = now.toISOString().slice(0, 10);
        } else {
          // Modo personalizado: usa las fechas recibidas o el día de hoy como fallback
          desde = fecha_inicio ?? now.toISOString().slice(0, 10);
          hasta = fecha_fin ?? now.toISOString().slice(0, 10);
        }

        const conditions: string[] = [
          'v.id_sede = $1',
          `DATE(v.fecha_emision) BETWEEN $2 AND $3`,
        ];
        const params: (number | string)[] = [idSede, desde, hasta];
        let idx = 4;

        if (nombre_cliente) {
          const safe = nombre_cliente.replace(/%/g, '\\%').replace(/_/g, '\\_');
          conditions.push(`c.nombre_completo ILIKE $${idx++}`);
          params.push(`%${safe}%`);
        }

        if (nombre_producto) {
          const safe = nombre_producto
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_');
          conditions.push(`EXISTS (
            SELECT 1 FROM detalle_venta dv2
            JOIN items i2 ON i2.id_item = dv2.id_item
            WHERE dv2.id_venta = v.id_venta AND i2.nombre ILIKE $${idx}
          )`);
          params.push(`%${safe}%`);
          idx++;
        }

        const where = conditions.join(' AND ');

        const summary = await dataSource.query<
          { total_ventas: string; total_ingresos: string }[]
        >(
          `SELECT COUNT(DISTINCT v.id_venta)::text AS total_ventas,
                  COALESCE(SUM(dv.importe), 0)::text AS total_ingresos
           FROM ventas v
           LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
           JOIN detalle_venta dv ON dv.id_venta = v.id_venta
           WHERE ${where}`,
          params,
        );

        const result: Record<string, unknown> = {
          periodo:
            periodo === 'personalizado' ? `${desde} al ${hasta}` : periodo,
          total_ventas: parseInt(summary[0]?.total_ventas ?? '0', 10),
          total_ingresos: parseFloat(summary[0]?.total_ingresos ?? '0'),
        };

        // Si se pide el ranking, ejecuta una segunda query agrupando por producto
        if (top_productos) {
          const top = await dataSource.query<
            {
              producto: string;
              cantidad_vendida: string;
              total_importe: string;
            }[]
          >(
            `SELECT i.nombre AS producto,
                    SUM(dv.cantidad)::text AS cantidad_vendida,
                    SUM(dv.importe)::text  AS total_importe
             FROM ventas v
             LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
             JOIN detalle_venta dv ON dv.id_venta = v.id_venta
             JOIN items i ON i.id_item = dv.id_item
             WHERE ${where}
             GROUP BY i.nombre
             ORDER BY SUM(dv.cantidad) DESC
             LIMIT 10`,
            params,
          );
          result.top_productos = top.map((r) => ({
            producto: r.producto,
            cantidad: parseInt(r.cantidad_vendida, 10),
            ingreso: parseFloat(r.total_importe),
          }));
        }

        return { message: null, ...result };
      } catch {
        return {
          message: 'Error al consultar ventas.',
          total_ventas: 0,
          total_ingresos: 0,
        };
      }
    },
  });
