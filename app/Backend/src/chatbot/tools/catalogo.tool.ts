// app/Backend/src/chatbot/tools/catalogo.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

export const buscarProductosTool = (dataSource: DataSource, idSede: number) =>
  tool({
    description:
      'Busca productos disponibles en el catálogo de la sede por nombre, marca o modelo. Devuelve precio, stock y promociones vigentes.',
    parameters: z.object({
      query: z
        .string()
        .describe('Término de búsqueda: nombre, marca o modelo del producto'),
    }),
    execute: async ({ query }) => {
      try {
        const safeTerm = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const rows = await dataSource.query<object[]>(
          `SELECT sku, producto, marca, modelo, categoria,
                  precio_venta_actual, stock_disponible,
                  promo_nombre, promo_tipo, precio_con_descuento,
                  imagen_url
           FROM v_vendedor_catalogo
           WHERE id_sede = $1
             AND (producto ILIKE $2 OR marca ILIKE $2 OR modelo ILIKE $2)
             AND stock_disponible > 0
           ORDER BY producto
           LIMIT 10`,
          [idSede, `%${safeTerm}%`],
        );
        if (rows.length === 0) {
          return {
            message: 'No se encontraron productos con ese término.',
            items: [],
          };
        }
        return { message: null, items: rows };
      } catch {
        return { message: 'Error al buscar productos.', items: [] };
      }
    },
  });
