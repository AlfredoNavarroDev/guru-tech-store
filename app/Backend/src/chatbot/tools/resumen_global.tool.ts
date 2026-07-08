// app/Backend/src/chatbot/tools/resumen_global.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

export const consultarResumenGlobalTool = (dataSource: DataSource) =>
  tool({
    description:
      'Muestra resumen global de todas las sedes: ventas, reparaciones, ingresos y empleados activos. Con incluir_empleados=true devuelve la lista de empleados por sede. Úsalo para preguntas del propietario sobre rendimiento global, comparación entre sedes o estado general del negocio.',
    parameters: z.object({
      incluir_empleados: z
        .boolean()
        .default(false)
        .describe(
          'Si true, incluye lista de empleados activos por sede con su rol',
        ),
    }),
    execute: async ({ incluir_empleados }) => {
      try {
        const sedes = await dataSource.query<object[]>(
          `SELECT sede, esta_habilitada, empleados_activos,
                  total_ventas, ingresos_ventas,
                  total_reparaciones, ingresos_reparaciones
           FROM v_propietario_resumen_sedes
           ORDER BY sede`,
        );

        let empleados: object[] = [];
        if (incluir_empleados) {
          empleados = await dataSource.query<object[]>(
            `SELECT sede, nombre_completo, rol, estado
             FROM v_propietario_empleados_global
             WHERE estado = 'activo'
             ORDER BY sede, rol, nombre_completo`,
          );
        }

        return { sedes, empleados };
      } catch {
        return { sedes: [], empleados: [] };
      }
    },
  });
