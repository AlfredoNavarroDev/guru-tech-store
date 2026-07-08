// app/Backend/src/chatbot/tools/reparaciones.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta que consulta reparaciones de la sede con soporte opcional de detalle completo (checklist, fotos, garantía)
export const consultarReparacionesTool = (
  dataSource: DataSource,
  idSede: number,
  idTecnico: number | null,   // ID del técnico en sesión; usado cuando solo_mias=true
) =>
  tool({
    description:
      'Consulta reparaciones de la sede. Filtra por estado (activas, finalizadas, todas), por nombre de cliente y/o modelo de dispositivo. Con detalle=true devuelve checklist de recepción, diagnóstico, si llegó encendido, IMEI, tipo de servicio y datos de garantía (si tiene garantía activa/vencida y si fue ingresada como reclamo de garantía). Úsalo para preguntas sobre reparaciones, estado al ingreso, checklist, diagnóstico o garantías.',
    parameters: z.object({
      filtro: z
        .enum(['activas', 'finalizadas', 'todas'])
        .default('todas')
        .describe(
          'Filtra por estado: activas (no finalizadas), finalizadas, o todas',
        ),
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
      solo_mias: z
        .boolean()
        .default(false)
        .describe(
          'Si true y el usuario es técnico, devuelve solo sus propias reparaciones',
        ),
      detalle: z
        .boolean()
        .default(false)
        .describe(
          'Si true, incluye checklist de recepción, diagnóstico técnico, IMEI, tipo de servicio y garantía asociada',
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('Número máximo de resultados. Por defecto 10'),
    }),
    execute: async ({
      filtro,
      nombre_cliente,
      modelo_dispositivo,
      solo_mias,
      detalle,
      limit,
    }) => {
      try {
        const conditions: string[] = ['r.id_sede = $1'];
        const params: (number | boolean | string)[] = [idSede];
        let idx = 2;

        if (filtro === 'activas') {
          conditions.push(`er.es_final = false`);
        } else if (filtro === 'finalizadas') {
          conditions.push(`er.es_final = true`);
        }

        // Restringe los resultados al técnico autenticado cuando se solicita solo_mias
        if (solo_mias && idTecnico != null) {
          conditions.push(`r.id_tecnico = $${idx++}`);
          params.push(idTecnico);
        }

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
            id_reparacion: number;
            nombre_cliente: string;
            marca: string | null;
            modelo: string | null;
            estado: string;
            es_final: boolean;
            fecha_ingreso: string;
            fecha_estimada: string | null;
            esta_encendido: boolean | null;
            checklist_estado: Record<string, unknown> | null;
            diagnostico_tecnico: string | null;
            imei: string | null;
            tipo_servicio: string | null;
            fotos: { url: string; etapa: string; created_at: string }[] | null;
            // garantía generada por esta reparación
            garantia_estado: string | null;
            garantia_fecha_inicio: string | null;
            garantia_fecha_fin: string | null;
            garantia_motivo_invalidacion: string | null;
            // si fue ingresada como reclamo de garantía previa
            es_reclamo_garantia: boolean;
          }[]
        >(
          `SELECT r.id_reparacion,
                  c.nombre_completo          AS nombre_cliente,
                  r.marca,
                  r.modelo,
                  er.nombre                  AS estado,
                  er.es_final,
                  r.fecha_ingreso,
                  r.fecha_estimada,
                  r.esta_encendido,
                  r.checklist_estado,
                  r.diagnostico_tecnico,
                  r.imei,
                  r.tipo_servicio,
                  r.fotos,
                  g.estado                   AS garantia_estado,
                  g.fecha_inicio             AS garantia_fecha_inicio,
                  g.fecha_fin                AS garantia_fecha_fin,
                  g.motivo_invalidacion      AS garantia_motivo_invalidacion,
                  (r.id_garantia_reclamada IS NOT NULL) AS es_reclamo_garantia
           FROM reparaciones r
           JOIN estados_reparacion er ON er.id_estado = r.id_estado
           JOIN clientes c            ON c.id_cliente = r.id_cliente
           LEFT JOIN garantias g      ON g.id_reparacion = r.id_reparacion
           WHERE ${where}
           ORDER BY r.fecha_ingreso DESC
           LIMIT $${idx}`,
          [...params, limit],
        );

        const total = rows.length;
        if (total === 0) {
          const quien = nombre_cliente
            ? `el cliente "${nombre_cliente}"`
            : 'ese filtro';
          return {
            message: `No se encontraron reparaciones para ${quien}.`,
            total: 0,
            reparaciones: [],
          };
        }

        return {
          message: null,
          total,
          reparaciones: rows.map((r) => {
            // Campos base siempre presentes en la respuesta
            const base = {
              cliente: r.nombre_cliente,
              dispositivo:
                [r.marca, r.modelo].filter(Boolean).join(' ') ||
                'Sin descripción',
              estado: r.estado,
              activa: !r.es_final,
              fecha_ingreso: r.fecha_ingreso,
              fecha_estimada: r.fecha_estimada ?? null,
            };
            // Con detalle=false se devuelve solo el resumen para ahorrar tokens
            if (!detalle) return base;
            return {
              ...base,
              esta_encendido: r.esta_encendido,
              checklist_estado: r.checklist_estado ?? null,
              diagnostico_tecnico: r.diagnostico_tecnico ?? null,
              imei: r.imei ?? null,
              tipo_servicio: r.tipo_servicio ?? null,
              fotos: r.fotos ?? [],
              garantia: r.garantia_estado
                ? {
                    estado: r.garantia_estado,
                    fecha_inicio: r.garantia_fecha_inicio,
                    fecha_fin: r.garantia_fecha_fin,
                    motivo_invalidacion: r.garantia_motivo_invalidacion ?? null,
                  }
                : null,
              es_reclamo_garantia: r.es_reclamo_garantia,
            };
          }),
        };
      } catch {
        return {
          message: 'Error al consultar reparaciones.',
          total: 0,
          reparaciones: [],
        };
      }
    },
  });
