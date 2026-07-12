import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_propietario_resumen_sedes' })
export class ResumenSedesView {
  @ViewColumn() id_sede: number;
  @ViewColumn() sede: string;
  @ViewColumn() direccion: string | null;
  @ViewColumn() telefono: string | null;
  @ViewColumn() esta_habilitada: boolean;
  @ViewColumn() empleados_activos: string;
  @ViewColumn() total_ventas: string;
  @ViewColumn() ingresos_ventas: string;
  @ViewColumn() total_reparaciones: string;
  @ViewColumn() ingresos_reparaciones: string;
  @ViewColumn() ingresos_totales: string;
}
