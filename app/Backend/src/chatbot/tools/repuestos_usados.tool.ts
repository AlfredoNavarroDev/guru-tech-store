// app/Backend/src/chatbot/tools/repuestos_usados.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

export const consultarRepuestosUsadosTool = (
  dataSource: DataSource,
  idSede: number,
) =>
  tool({
    description:
      'Muestra los repuestos instalados en reparaciones: ítem, cantidad y precio cobrado. Filtra por nombre de cliente y/o modelo de dispositivo. Úsalo cuando pregunten qué repuestos se usaron en un equipo, cuánto se cobró por materiales o el desglose de una reparación.',
    parameters: z.object({
      nombre_cliente: z
        .string()
        .optional()
        .describe('Nombre o parte del nombre del cliente'),
      modelo_dispositivo: z
        .string()
        .optional()
        .describe(
          'Marca o modelo del dispositivo. Ej: "Samsung A24", "iPhone 13"',
        ),
      limit: z.number().int().min(1).max(30).default(10),
    }),
    execute: async ({ nombre_cliente, modelo_dispositivo, limit }) => {
      try {
        const conditions: string[] = ['r.id_sede = $1'];
        const params: unknown[] = [idSede];
        let idx = 2;

        if (nombre_cliente) {
          const safe = nombre_cliente.replace(/%/g, '\\%').replace(/_/g, '\\_');
          conditions.push(`c.nombre_completo ILIKE $${idx++}`);
          params.push(`%${safe}%`);
        }

        if (modelo_dispositivo) {
          const safe = modelo_dispositivo
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_');
          conditions.push(`(r.marca ILIKE $${idx} OR r.modelo ILIKE $${idx})`);
          params.push(`%${safe}%`);
          idx++;
        }

        const rows = await dataSource.query<
          {
            cliente: string;
            dispositivo: string;
            fecha_ingreso: string;
            item: string;
            sku: string;
            cantidad: number;
            precio_cobrado: number;
            subtotal: number;
          }[]
        >(
          `SELECT c.nombre_completo AS cliente,
                  CONCAT(r.marca, ' ', r.modelo) AS dispositivo,
                  r.fecha_ingreso,
                  i.nombre AS item,
                  i.sku,
                  rru.cantidad,
                  rru.precio_cobrado,
                  (rru.cantidad * rru.precio_cobrado) AS subtotal
           FROM reparacion_repuestos_usados rru
           JOIN reparaciones r ON r.id_reparacion = rru.id_reparacion
           JOIN items i        ON i.id_item = rru.id_item
           JOIN clientes c     ON c.id_cliente = r.id_cliente
           WHERE ${conditions.join(' AND ')}
           ORDER BY r.fecha_ingreso DESC, rru.id_repuesto_u
           LIMIT $${idx}`,
          [...params, limit],
        );

        if (rows.length === 0) {
          return {
            message: 'No se encontraron repuestos usados con ese filtro.',
            repuestos: [],
            total_cobrado: 0,
          };
        }

        const total_cobrado = rows.reduce(
          (sum, r) => sum + Number(r.subtotal),
          0,
        );
        return { message: null, total_cobrado, repuestos: rows };
      } catch {
        return {
          message: 'Error al consultar repuestos usados.',
          repuestos: [],
          total_cobrado: 0,
        };
      }
    },
  });
