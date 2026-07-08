// app/Backend/src/chatbot/tools/cotizar.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

export const cotizarReparacionTool = (dataSource: DataSource, idSede: number) =>
  tool({
    description:
      'Genera una cotización estimada de reparación buscando repuestos disponibles para un modelo de dispositivo. Devuelve lista de repuestos relevantes con precio y stock, y sugiere un costo total estimado. Úsalo cuando el técnico diga "cotizar", "presupuesto", "cuánto costaría arreglar", "qué repuestos necesito para".',
    parameters: z.object({
      modelo_dispositivo: z
        .string()
        .describe(
          'Modelo o marca del dispositivo. Ej: "Samsung A24", "iPhone 13 Pro", "laptop HP"',
        ),
      tipo_reparacion: z
        .string()
        .optional()
        .describe(
          'Tipo de reparación o componente. Ej: "pantalla", "batería", "teclado", "cámara"',
        ),
    }),
    execute: async ({ modelo_dispositivo, tipo_reparacion }) => {
      try {
        const safeModelo = modelo_dispositivo
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_');

        const conditions: string[] = [
          `i.tipo = 'repuesto'`,
          `(i.nombre ILIKE $2 OR i.modelo ILIKE $2)`,
          `COALESCE(inv.cantidad_actual, 0) > 0`,
          `inv.id_sede = $1`,
        ];
        const params: (number | string)[] = [idSede, `%${safeModelo}%`];
        let idx = 3;

        if (tipo_reparacion) {
          const safeTipo = tipo_reparacion
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_');
          conditions.push(`(i.nombre ILIKE $${idx} OR i.modelo ILIKE $${idx})`);
          idx++;
          params.push(`%${safeTipo}%`);
        }

        const rows = await dataSource.query<
          {
            nombre: string;
            sku: string;
            modelo: string | null;
            precio_venta_actual: string;
            stock_disponible: string;
          }[]
        >(
          `SELECT i.nombre,
                  i.sku,
                  i.modelo,
                  i.precio_venta_actual::text,
                  inv.cantidad_actual::text AS stock_disponible
           FROM items i
           LEFT JOIN inventario_sedes inv ON inv.id_item = i.id_item
           WHERE ${conditions.join(' AND ')}
           ORDER BY i.nombre
           LIMIT 15`,
          params,
        );

        if (rows.length === 0) {
          return {
            message: `No se encontraron repuestos disponibles para "${modelo_dispositivo}"${tipo_reparacion ? ` (${tipo_reparacion})` : ''}.`,
            repuestos: [],
            costo_estimado: null,
          };
        }

        const costoEstimado = rows.reduce(
          (sum, r) => sum + parseFloat(r.precio_venta_actual),
          0,
        );

        return {
          message: null,
          dispositivo: modelo_dispositivo,
          tipo_reparacion: tipo_reparacion ?? null,
          repuestos: rows.map((r) => ({
            nombre: r.nombre,
            sku: r.sku,
            modelo: r.modelo ?? null,
            precio: parseFloat(r.precio_venta_actual),
            stock: parseInt(r.stock_disponible, 10),
          })),
          costo_estimado_total: Math.round(costoEstimado * 100) / 100,
          nota: 'Costo estimado: suma de precios de repuestos compatibles encontrados en stock. Puede incluir múltiples variantes del mismo componente. El técnico debe validar qué partes aplican según el diagnóstico.',
        };
      } catch {
        return {
          message: 'Error al generar cotización.',
          repuestos: [],
          costo_estimado: null,
        };
      }
    },
  });
