import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_propietario_empleados_global' })
export class EmpleadoGlobalView {
  @ViewColumn() id_empleado: number;
  @ViewColumn() id_sede: number | null;
  @ViewColumn() sede: string | null;
  @ViewColumn() nombre_completo: string;
  @ViewColumn() tipo_documento: string;
  @ViewColumn() nro_documento: string;
  @ViewColumn() telefono: string | null;
  @ViewColumn() estado: string;
  @ViewColumn() sueldo_soles: string | null;
  @ViewColumn() frecuencia_pago: string | null;
  @ViewColumn() es_extranjero: boolean;
  @ViewColumn() rol: string | null;
  @ViewColumn() created_by: number | null;
  @ViewColumn() creado_por: string | null;
  @ViewColumn() created_at: Date;
}
