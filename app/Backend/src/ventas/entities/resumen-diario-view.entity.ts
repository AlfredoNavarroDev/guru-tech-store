import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_vendedor_resumen_diario' })
export class ResumenDiarioView {
  @ViewColumn() id_empleado: number;
  @ViewColumn() fecha: Date;
  @ViewColumn() ventas: string;
  @ViewColumn() ingresos: string;
  @ViewColumn() clientes_atendidos: string;
}
