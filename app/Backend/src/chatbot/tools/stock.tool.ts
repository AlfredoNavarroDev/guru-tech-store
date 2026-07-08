// app/Backend/src/chatbot/tools/stock.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta de consulta puntual de stock por SKU; devuelve disponibilidad e indicador de reposición
export const consultarStockTool = (dataSource: DataSource, idSede: number) =>
  tool({
    description:
      'Consulta el stock actual de un ítem específico en la sede usando su SKU.',
    parameters: z.object({
      sku: z.string().describe('SKU del ítem a consultar'),
    }),
    execute: async ({ sku }) => {
      const rows = await dataSource.query<object[]>(
        `SELECT sku, item, tipo, stock_disponible, requiere_reposicion
         FROM v_abastecedor_stock_actual
         WHERE id_sede = $1 AND sku = $2`,
        [idSede, sku],
      );
      if (rows.length === 0)
        return { error: 'Ítem no encontrado en esta sede.' };
      return rows[0];
    },
  });
