import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_empleado_sesion' })
export class EmpleadoSesionView {
  @ViewColumn() id_empleado: number;
  @ViewColumn() nombre_rol: string;
  @ViewColumn() nombre_sede: string;
}
