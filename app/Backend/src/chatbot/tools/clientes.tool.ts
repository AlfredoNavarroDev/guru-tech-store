// app/Backend/src/chatbot/tools/clientes.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta que busca clientes por nombre o documento e incluye su historial de reparaciones en la sede
export const buscarClientesTool = (dataSource: DataSource, idSede: number) =>
  tool({
    description:
      'Busca clientes por nombre o número de documento. Devuelve nombre completo, tipo y número de documento, teléfono, dirección, si es extranjero, fecha de registro y resumen de sus reparaciones en la sede.',
    parameters: z.object({
      query: z
        .string()
        .describe(
          'Nombre completo o parcial del cliente, o número de documento',
        ),
    }),
    execute: async ({ query }) => {
      try {
        const safe = query.replace(/%/g, '\\%').replace(/_/g, '\\_');

        // Filtra por nombre o documento; el LEFT JOIN contabiliza reparaciones solo en esta sede
        const rows = await dataSource.query<
          {
            id_cliente: number;
            nombre_completo: string;
            tipo_documento: string;
            nro_documento: string;
            es_extranjero: boolean;
            telefono: string | null;
            direccion_completa: string | null;
            created_at: string;
            total_reparaciones: string;
            ultima_reparacion: string | null;
          }[]
        >(
          `SELECT c.id_cliente,
                  c.nombre_completo,
                  c.tipo_documento,
                  c.nro_documento,
                  c.es_extranjero,
                  c.telefono,
                  c.direccion_completa,
                  c.created_at,
                  COUNT(r.id_reparacion)::text AS total_reparaciones,
                  MAX(r.fecha_ingreso)::text   AS ultima_reparacion
           FROM clientes c
           LEFT JOIN reparaciones r
             ON r.id_cliente = c.id_cliente AND r.id_sede = $1
           WHERE c.nombre_completo ILIKE $2
              OR c.nro_documento  ILIKE $2
           GROUP BY c.id_cliente
           ORDER BY c.nombre_completo
           LIMIT 5`,
          [idSede, `%${safe}%`],
        );

        if (rows.length === 0) {
          return {
            message: `No se encontró ningún cliente con "${query}".`,
            clientes: [],
          };
        }

        return {
          message: null,
          clientes: rows.map((c) => ({
            nombre: c.nombre_completo,
            tipo_documento: c.tipo_documento,
            nro_documento: c.nro_documento,
            extranjero: c.es_extranjero,
            telefono: c.telefono ?? null,
            direccion: c.direccion_completa ?? null,
            fecha_registro: c.created_at,
            total_reparaciones: parseInt(c.total_reparaciones, 10),
            ultima_reparacion: c.ultima_reparacion ?? null,
          })),
        };
      } catch {
        return { message: 'Error al buscar clientes.', clientes: [] };
      }
    },
  });
