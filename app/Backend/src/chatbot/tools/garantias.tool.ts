// app/Backend/src/chatbot/tools/garantias.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta que consulta garantías de reparaciones y ventas, filtrando por cliente, estado o modelo
export const consultarGarantiasTool = (
  dataSource: DataSource,
  idSede: number,
) =>
  tool({
    description:
      'Consulta garantías de reparaciones y ventas de la sede. Busca por nombre de cliente, estado de garantía (activa, vencida, invalidada) o modelo de dispositivo. Devuelve fechas de vigencia, estado y motivo de invalidación si aplica.',
    parameters: z.object({
      nombre_cliente: z
        .string()
        .optional()
        .describe('Nombre o parte del nombre del cliente'),
      estado_garantia: z
        .enum(['activa', 'vencida', 'invalidada', 'todas'])
        .default('todas')
        .describe('Filtra por estado de la garantía'),
      modelo_dispositivo: z
        .string()
        .optional()
        .describe(
          'Marca o modelo del dispositivo (solo aplica a garantías de reparación)',
        ),
    }),
    execute: async ({
      nombre_cliente,
      estado_garantia,
      modelo_dispositivo,
    }) => {
      try {
        // La sede se valida en reparaciones O en ventas para cubrir ambos orígenes de garantía
        const conditions: string[] = ['(r.id_sede = $1 OR v.id_sede = $1)'];
        const params: (number | string)[] = [idSede];
        let idx = 2;

        if (estado_garantia !== 'todas') {
          conditions.push(`g.estado = $${idx++}`);
          params.push(estado_garantia);
        }

        if (nombre_cliente) {
          const safe = nombre_cliente.replace(/%/g, '\\%').replace(/_/g, '\\_');
          conditions.push(`c.nombre_completo ILIKE $${idx++}`);
          params.push(`%${safe}%`);
        }

        // El filtro por modelo solo aplica a garantías de reparación (r.marca / r.modelo)
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
            tipo_origen: string;
            nombre_cliente: string;
            dispositivo: string | null;
            estado: string;
            fecha_inicio: string;
            fecha_fin: string;
            motivo_invalidacion: string | null;
          }[]
        >(
          `SELECT
             CASE WHEN g.id_reparacion IS NOT NULL THEN 'reparacion' ELSE 'venta' END AS tipo_origen,
             c.nombre_completo AS nombre_cliente,
             CASE WHEN g.id_reparacion IS NOT NULL
               THEN CONCAT(COALESCE(r.marca,''), ' ', COALESCE(r.modelo,''))
               ELSE NULL
             END AS dispositivo,
             g.estado,
             g.fecha_inicio,
             g.fecha_fin,
             g.motivo_invalidacion
           FROM garantias g
           LEFT JOIN reparaciones r ON r.id_reparacion = g.id_reparacion
           LEFT JOIN ventas v       ON v.id_venta = g.id_venta
           JOIN clientes c
             ON c.id_cliente = COALESCE(r.id_cliente, v.id_cliente)
           WHERE ${where}
           ORDER BY g.fecha_inicio DESC
           LIMIT 20`,
          params,
        );

        if (rows.length === 0) {
          return {
            message: 'No se encontraron garantías con ese filtro.',
            garantias: [],
          };
        }

        return {
          message: null,
          garantias: rows.map((g) => ({
            origen: g.tipo_origen,
            cliente: g.nombre_cliente,
            dispositivo: g.dispositivo?.trim() || null,
            estado: g.estado,
            vigente_desde: g.fecha_inicio,
            vigente_hasta: g.fecha_fin,
            motivo_invalidacion: g.motivo_invalidacion ?? null,
          })),
        };
      } catch {
        return { message: 'Error al consultar garantías.', garantias: [] };
      }
    },
  });
