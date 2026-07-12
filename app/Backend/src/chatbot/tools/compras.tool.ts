// app/Backend/src/chatbot/tools/compras.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta para consultar el historial de compras de reposición con dos modos: resumen y detalle
export const consultarComprasTool = (dataSource: DataSource, idSede: number) =>
  tool({
    description:
      'Consulta el historial de compras de reposición de la sede. Muestra órdenes por proveedor, fechas, costos. Con ver_detalle=true muestra los ítems individuales de cada compra. Úsalo cuando pregunten qué se compró, cuánto se gastó, compras por proveedor o fecha.',
    parameters: z.object({
      proveedor: z
        .string()
        .optional()
        .describe('Filtrar por nombre de proveedor (búsqueda parcial)'),
      item: z
        .string()
        .optional()
        .describe(
          'Filtrar por nombre del ítem comprado (solo aplica con ver_detalle=true)',
        ),
      periodo: z
        .enum(['hoy', 'semana', 'mes', 'año'])
        .optional()
        .describe('Filtrar compras por periodo de tiempo'),
      limit: z.number().int().min(1).max(30).default(10),
      ver_detalle: z
        .boolean()
        .default(false)
        .describe(
          'Si true, muestra los ítems individuales de cada compra en lugar del resumen por orden',
        ),
    }),
    execute: async ({ proveedor, item, periodo, limit, ver_detalle }) => {
      try {
        // Mapeo de periodo a intervalo SQL
        const intervalMap: Record<string, string> = {
          hoy: "NOW() - INTERVAL '1 day'",
          semana: "NOW() - INTERVAL '7 days'",
          mes: "NOW() - INTERVAL '30 days'",
          año: "NOW() - INTERVAL '365 days'",
        };

        const params: unknown[] = [idSede];
        let idx = 2;
        const conditions: string[] = ['id_sede = $1'];

        if (proveedor) {
          const safe = proveedor.replace(/%/g, '\\%').replace(/_/g, '\\_');
          conditions.push(`proveedor ILIKE $${idx++}`);
          params.push(`%${safe}%`);
        }

        if (periodo && intervalMap[periodo]) {
          conditions.push(`fecha_compra >= ${intervalMap[periodo]}`);
        }

        const whereClause = conditions.join(' AND ');

        if (ver_detalle) {
          // Modo detalle: filas individuales con ítem breakdown
          if (item) {
            const safe = item.replace(/%/g, '\\%').replace(/_/g, '\\_');
            conditions.push(`item ILIKE $${idx++}`);
            params.push(`%${safe}%`);
          }

          const detalle = await dataSource.query<object[]>(
            `SELECT id_compra, proveedor, fecha_compra::text,
                    sku, item, tipo_item, marca,
                    cantidad_comprada, costo_unidad, precio_venta_sugerido, costo_total_linea
             FROM v_abastecedor_historial_compras
             WHERE ${conditions.join(' AND ')}
             ORDER BY fecha_compra DESC, id_compra, item
             LIMIT $${idx}`,
            [...params, limit],
          );

          if (detalle.length === 0) {
            return {
              message: 'No se encontraron compras con ese criterio.',
              modo: 'detalle',
              total: 0,
              compras: [],
            };
          }

          return {
            message: null,
            modo: 'detalle',
            total: detalle.length,
            compras: detalle,
          };
        }

        // Modo resumen: agrupado por orden de compra
        const resumen = await dataSource.query<object[]>(
          `SELECT id_compra, proveedor, fecha_compra::text,
                  COUNT(*)::int AS lineas,
                  SUM(costo_total_linea)::numeric(12,2) AS total_compra
           FROM v_abastecedor_historial_compras
           WHERE ${whereClause}
           GROUP BY id_compra, proveedor, fecha_compra
           ORDER BY fecha_compra DESC
           LIMIT $${idx}`,
          [...params, limit],
        );

        if (resumen.length === 0) {
          return {
            message: 'No se encontraron compras con ese criterio.',
            modo: 'resumen',
            total: 0,
            compras: [],
          };
        }

        return {
          message: null,
          modo: 'resumen',
          total: resumen.length,
          compras: resumen,
        };
      } catch {
        return {
          message: 'Error al consultar historial de compras.',
          modo: ver_detalle ? 'detalle' : 'resumen',
          total: 0,
          compras: [],
        };
      }
    },
  });
