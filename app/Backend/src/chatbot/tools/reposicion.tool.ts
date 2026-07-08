// app/Backend/src/chatbot/tools/reposicion.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

export const consultarReposicionTool = (
  dataSource: DataSource,
  idSede: number,
) =>
  tool({
    description:
      'Consulta ítems que requieren reposición en la sede: bajo stock crítico o sin stock. Con ver_historial=true muestra las últimas compras de reposición registradas. Úsalo para preguntas sobre qué comprar, qué falta, stock crítico, o historial de reposiciones.',
    parameters: z.object({
      tipo_filtro: z
        .enum(['critico', 'sin_stock', 'todos'])
        .default('todos')
        .describe(
          'critico: stock > 0 pero <= mínimo; sin_stock: cantidad = 0; todos: cualquiera que requiera reposición',
        ),
      categoria: z
        .string()
        .optional()
        .describe('Filtrar por categoría de ítem'),
      limit: z.number().int().min(1).max(50).default(20),
      ver_historial: z
        .boolean()
        .default(false)
        .describe(
          'Si true, incluye las últimas 5 compras de reposición de la sede',
        ),
    }),
    execute: async ({ tipo_filtro, categoria, limit, ver_historial }) => {
      try {
        const conditions: string[] = ['id_sede = $1'];
        const params: unknown[] = [idSede];
        let idx = 2;

        if (tipo_filtro === 'sin_stock') {
          conditions.push('cantidad_actual = 0');
        } else if (tipo_filtro === 'critico') {
          conditions.push(
            'cantidad_actual > 0 AND cantidad_actual <= stock_minimo',
          );
        } else {
          conditions.push('requiere_reposicion = true');
        }

        if (categoria) {
          const safe = categoria.replace(/%/g, '\\%').replace(/_/g, '\\_');
          conditions.push(`categoria ILIKE $${idx++}`);
          params.push(`%${safe}%`);
        }

        const items = await dataSource.query<object[]>(
          `SELECT sku, item, marca, tipo, categoria, cantidad_actual, stock_minimo,
                  (stock_minimo - cantidad_actual) AS unidades_a_pedir,
                  precio_compra_actual
           FROM v_abastecedor_stock_actual
           WHERE ${conditions.join(' AND ')}
           ORDER BY cantidad_actual ASC, item
           LIMIT $${idx}`,
          [...params, limit],
        );

        let historial: object[] = [];
        if (ver_historial) {
          historial = await dataSource.query<object[]>(
            `SELECT vc.id_compra, vc.proveedor, vc.fecha_compra,
                    vc.costo_total, COUNT(d.id_detalle)::int AS lineas
             FROM v_compra_cabecera vc
             JOIN detalle_compra_refill d ON d.id_compra = vc.id_compra
             WHERE vc.id_sede_destino = $1
             GROUP BY vc.id_compra, vc.proveedor, vc.fecha_compra, vc.costo_total
             ORDER BY vc.fecha_compra DESC
             LIMIT 5`,
            [idSede],
          );
        }

        if (items.length === 0 && !ver_historial) {
          return {
            message: 'No hay ítems que requieran reposición con ese filtro.',
            total: 0,
            items_reposicion: [],
            historial_compras: [],
          };
        }

        return {
          message: null,
          total: items.length,
          items_reposicion: items,
          historial_compras: historial,
        };
      } catch {
        return {
          message: 'Error al consultar reposición.',
          total: 0,
          items_reposicion: [],
          historial_compras: [],
        };
      }
    },
  });
