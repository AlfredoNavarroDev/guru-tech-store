// app/Backend/src/chatbot/tools/pagos.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

export const consultarPagosTool = (dataSource: DataSource, idSede: number) =>
  tool({
    description:
      'Consulta los pagos de reparaciones de la sede. Busca por nombre de cliente y/o modelo del dispositivo. Devuelve monto pagado, método de pago, si fue adelanto, fecha y monto cotizado de la reparación.',
    parameters: z.object({
      nombre_cliente: z
        .string()
        .optional()
        .describe('Nombre o parte del nombre del cliente'),
      modelo_dispositivo: z
        .string()
        .optional()
        .describe(
          'Marca o modelo del dispositivo reparado. Ej: "Samsung A24", "iPhone 13"',
        ),
    }),
    execute: async ({ nombre_cliente, modelo_dispositivo }) => {
      try {
        const conditions: string[] = ['r.id_sede = $1'];
        const params: (number | string)[] = [idSede];
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

        const where = conditions.join(' AND ');

        const rows = await dataSource.query<
          {
            nombre_cliente: string;
            dispositivo: string;
            monto_cotizado: string | null;
            monto_descuento: string;
            tipo_descuento: string | null;
            metodo_pago: string;
            monto_pago: string;
            es_adelanto: boolean;
            fecha_pago: string;
            referencia_transaccion: string | null;
          }[]
        >(
          `SELECT c.nombre_completo                         AS nombre_cliente,
                  CONCAT(COALESCE(r.marca,''), ' ', COALESCE(r.modelo,'')) AS dispositivo,
                  r.monto_cotizado::text                   AS monto_cotizado,
                  r.monto_descuento::text                  AS monto_descuento,
                  r.tipo_descuento,
                  p.metodo_pago,
                  p.monto::text                            AS monto_pago,
                  p.es_adelanto,
                  p.fecha_pago::text                       AS fecha_pago,
                  p.referencia_transaccion
           FROM pagos p
           JOIN reparaciones r ON r.id_reparacion = p.id_reparacion
           JOIN clientes c     ON c.id_cliente    = r.id_cliente
           WHERE p.id_reparacion IS NOT NULL
             AND ${where}
           ORDER BY p.fecha_pago DESC
           LIMIT 20`,
          params,
        );

        if (rows.length === 0) {
          const desc = [
            nombre_cliente ? `cliente "${nombre_cliente}"` : null,
            modelo_dispositivo ? `dispositivo "${modelo_dispositivo}"` : null,
          ]
            .filter(Boolean)
            .join(' y ');
          return {
            message: `No se encontraron pagos para ${desc || 'ese filtro'}.`,
            pagos: [],
            total_pagado: 0,
          };
        }

        const totalPagado = rows.reduce(
          (sum, p) => sum + parseFloat(p.monto_pago),
          0,
        );

        return {
          message: null,
          total_pagado: Math.round(totalPagado * 100) / 100,
          pagos: rows.map((p) => ({
            cliente: p.nombre_cliente,
            dispositivo: p.dispositivo.trim() || 'Sin descripción',
            monto_cotizado: p.monto_cotizado
              ? parseFloat(p.monto_cotizado)
              : null,
            monto_descuento: parseFloat(p.monto_descuento),
            tipo_descuento: p.tipo_descuento ?? null,
            metodo_pago: p.metodo_pago,
            monto_pagado: parseFloat(p.monto_pago),
            es_adelanto: p.es_adelanto,
            fecha_pago: p.fecha_pago,
            referencia: p.referencia_transaccion ?? null,
          })),
        };
      } catch {
        return {
          message: 'Error al consultar pagos.',
          pagos: [],
          total_pagado: 0,
        };
      }
    },
  });
