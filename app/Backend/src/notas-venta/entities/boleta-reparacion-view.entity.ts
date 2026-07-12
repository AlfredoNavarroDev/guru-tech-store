import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_boleta_reparacion' })
export class BoletaReparacionView {
  @ViewColumn() id_reparacion: number;
  @ViewColumn() id_sede: number;
  @ViewColumn() sede_nombre: string;
  @ViewColumn() sede_direccion: string | null;
  @ViewColumn() sede_telefono: string | null;
  @ViewColumn() tecnico: string;
  @ViewColumn() fecha_ingreso: Date;
  @ViewColumn() monto_cotizado: string | null;
  @ViewColumn() monto_descuento: string;
  @ViewColumn() tipo_descuento: string | null;
  @ViewColumn() id_cliente: number | null;
  @ViewColumn() cliente_nombre: string | null;
  @ViewColumn() cliente_tipo_doc: string | null;
  @ViewColumn() cliente_nro_doc: string | null;
  @ViewColumn() marca: string | null;
  @ViewColumn() modelo: string | null;
  @ViewColumn() tipo_servicio: string | null;
  @ViewColumn() diagnostico_tecnico: string | null;
  @ViewColumn() fecha_estimada: string | null;
  @ViewColumn() producto: string | null;
  @ViewColumn() sku: string | null;
  @ViewColumn() cantidad: number | null;
  @ViewColumn() precio_cobrado: string | null;
  @ViewColumn() importe: string | null;
}
