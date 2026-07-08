// app/Backend/src/chatbot/tools/repuestos.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta que busca repuestos en stock de la sede por nombre o modelo, incluyendo precio y cantidad
export const buscarRepuestosTool = (dataSource: DataSource, idSede: number) =>
  tool({
    description:
      'Busca repuestos disponibles en la sede por nombre o modelo. Devuelve precio y cantidad disponible.',
    parameters: z.object({
      query: z.string().describe('Nombre o descripción del repuesto a buscar'),
    }),
    execute: async ({ query }) => {
      try {
        const safeTerm = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
        const rows = await dataSource.query<object[]>(
          // Solo devuelve ítems de tipo 'repuesto' con stock mayor a 0 en la sede
          `SELECT i.nombre, i.sku, i.modelo,
                  i.precio_venta_actual,
                  COALESCE(inv.cantidad_actual, 0) AS stock_disponible
           FROM items i
           LEFT JOIN inventario_sedes inv
             ON inv.id_item = i.id_item AND inv.id_sede = $1
           WHERE i.tipo = 'repuesto'
             AND (i.nombre ILIKE $2 OR i.modelo ILIKE $2)
             AND COALESCE(inv.cantidad_actual, 0) > 0
           ORDER BY i.nombre
           LIMIT 10`,
          [idSede, `%${safeTerm}%`],
        );
        if (rows.length === 0)
          return {
            message: 'No se encontraron repuestos con ese término.',
            items: [],
          };
        return { message: null, items: rows };
      } catch {
        return { message: 'Error al buscar repuestos.', items: [] };
      }
    },
  });
