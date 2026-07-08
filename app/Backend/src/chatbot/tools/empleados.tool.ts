// app/Backend/src/chatbot/tools/empleados.tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';

export const consultarRendimientoEmpleadosTool = (
  dataSource: DataSource,
  idSede: number,
) =>
  tool({
    description:
      'Consulta el rendimiento de empleados de la sede. Para técnicos: muestra reparaciones activas y finalizadas. Para vendedores: muestra ventas e ingresos del periodo. Útil para admin que necesita ver carga de trabajo o productividad del equipo.',
    parameters: z.object({
      rol_filtro: z
        .enum(['tecnico', 'vendedor', 'todos'])
        .default('todos')
        .describe('Filtra por rol de empleado'),
      periodo: z
        .enum(['hoy', 'semana', 'mes'])
        .default('mes')
        .describe('Periodo para métricas de ventas y reparaciones finalizadas'),
    }),
    execute: async ({ rol_filtro, periodo }) => {
      try {
        let desde: string;
        const now = new Date();
        if (periodo === 'hoy') {
          desde = now.toISOString().slice(0, 10);
        } else if (periodo === 'semana') {
          const d = new Date(now);
          d.setDate(d.getDate() - 6);
          desde = d.toISOString().slice(0, 10);
        } else {
          desde = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .slice(0, 10);
        }
        const hasta = now.toISOString().slice(0, 10);

        const rolCondition =
          rol_filtro === 'todos'
            ? ''
            : `AND r.nombre_rol = '${rol_filtro === 'tecnico' ? 'tecnico' : 'vendedor'}'`;

        const rows = await dataSource.query<
          {
            nombre: string;
            rol: string;
            rep_activas: string;
            rep_finalizadas: string;
            ventas_periodo: string;
            ingresos_periodo: string;
          }[]
        >(
          `SELECT
             e.nombre_completo AS nombre,
             r.nombre_rol      AS rol,
             COUNT(DISTINCT rep.id_reparacion) FILTER (
               WHERE rep.id_reparacion IS NOT NULL AND er.es_final = false
             )::text AS rep_activas,
             COUNT(DISTINCT rep.id_reparacion) FILTER (
               WHERE rep.id_reparacion IS NOT NULL AND er.es_final = true
                 AND DATE(rep.fecha_terminado) BETWEEN $2 AND $3
             )::text AS rep_finalizadas,
             COUNT(DISTINCT v.id_venta)::text AS ventas_periodo,
             COALESCE(SUM(dv.importe), 0)::text AS ingresos_periodo
           FROM empleados e
           JOIN roles r ON r.id_rol = e.id_rol
           LEFT JOIN reparaciones rep
             ON rep.id_tecnico = e.id_empleado AND rep.id_sede = $1
           LEFT JOIN estados_reparacion er
             ON er.id_estado = rep.id_estado
           LEFT JOIN ventas v
             ON v.id_empleado = e.id_empleado AND v.id_sede = $1
               AND DATE(v.fecha_emision) BETWEEN $2 AND $3
           LEFT JOIN detalle_venta dv ON dv.id_venta = v.id_venta
           WHERE e.id_sede = $1
             AND e.estado = 'activo'
             ${rolCondition}
           GROUP BY e.id_empleado, e.nombre_completo, r.nombre_rol
           ORDER BY e.nombre_completo`,
          [idSede, desde, hasta],
        );

        if (rows.length === 0) {
          return {
            message: 'No se encontraron empleados activos en la sede.',
            empleados: [],
          };
        }

        return {
          message: null,
          periodo: `${desde} al ${hasta}`,
          empleados: rows.map((e) => ({
            nombre: e.nombre,
            rol: e.rol,
            reparaciones_activas: parseInt(e.rep_activas, 10),
            reparaciones_finalizadas_periodo: parseInt(e.rep_finalizadas, 10),
            ventas_periodo: parseInt(e.ventas_periodo, 10),
            ingresos_periodo: parseFloat(e.ingresos_periodo),
          })),
        };
      } catch {
        return {
          message: 'Error al consultar rendimiento de empleados.',
          empleados: [],
        };
      }
    },
  });
