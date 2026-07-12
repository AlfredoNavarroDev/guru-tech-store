// app/Backend/src/chatbot/tools/proveedores.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

// Herramienta que lista proveedores y sus métricas de compra en la sede actual
export const consultarProveedoresTool = (
  dataSource: DataSource,
  idSede: number,
) =>
  tool({
    description:
      'Consulta los proveedores registrados y su historial de compras en la sede. Filtra por nombre o RUC. Úsalo cuando pregunten por proveedores, cuál se usó más, cuánto se compró a cada uno, quiénes son los proveedores disponibles.',
    parameters: z.object({
      busqueda: z
        .string()
        .optional()
        .describe(
          'Filtrar por razón social o RUC del proveedor (búsqueda parcial)',
        ),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    execute: async ({ busqueda, limit }) => {
      try {
        const params: unknown[] = [idSede];
        let idx = 2;
        let whereClause = '';

        if (busqueda) {
          const safe = busqueda.replace(/%/g, '\\%').replace(/_/g, '\\_');
          whereClause = `WHERE p.razon_social ILIKE $${idx} OR p.ruc ILIKE $${idx}`;
          params.push(`%${safe}%`);
          idx++;
        }

        const proveedores = await dataSource.query<object[]>(
          `SELECT p.ruc, p.razon_social, p.contacto_nombre, p.telefono,
                  COUNT(DISTINCT cr.id_compra)::int AS ordenes_en_sede,
                  MAX(cr.fecha_compra)::text AS ultima_compra,
                  COALESCE(SUM(dc.cantidad_comprada * dc.costo_unidad), 0)::numeric(12,2) AS total_comprado_sede
           FROM proveedores p
           LEFT JOIN compras_refill cr ON cr.id_proveedor = p.id_proveedor AND cr.id_sede_destino = $1
           LEFT JOIN detalle_compra_refill dc ON dc.id_compra = cr.id_compra
           ${whereClause}
           GROUP BY p.id_proveedor, p.ruc, p.razon_social, p.contacto_nombre, p.telefono
           ORDER BY ordenes_en_sede DESC, ultima_compra DESC NULLS LAST
           LIMIT $${idx}`,
          [...params, limit],
        );

        if (proveedores.length === 0) {
          return {
            message: 'No se encontraron proveedores con ese criterio.',
            total: 0,
            proveedores: [],
          };
        }

        return {
          message: null,
          total: proveedores.length,
          proveedores,
        };
      } catch {
        return {
          message: 'Error al consultar proveedores.',
          total: 0,
          proveedores: [],
        };
      }
    },
  });
