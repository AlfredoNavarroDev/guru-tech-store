import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_boleta_cambio' })
export class BoletaCambioView {
  @ViewColumn() id_cambio: number;
  @ViewColumn() id_sede: number;
  @ViewColumn() id_empleado: number;
  @ViewColumn() cantidad: number;
  @ViewColumn() precio_devuelto: string;
  @ViewColumn() precio_entregado: string;
  @ViewColumn() diferencia_cobrada: string;
  @ViewColumn() metodo_pago_dif: string | null;
  @ViewColumn() motivo: string | null;
  @ViewColumn() detalle: string | null;
  @ViewColumn() fecha_cambio: Date;
  @ViewColumn() id_venta_origen: number | null;
  @ViewColumn() nombre_item_devuelto: string;
  @ViewColumn() sku_devuelto: string;
  @ViewColumn() nombre_item_entregado: string;
  @ViewColumn() sku_entregado: string;
  @ViewColumn() sede_nombre: string;
  @ViewColumn() sede_direccion: string | null;
  @ViewColumn() sede_telefono: string | null;
  @ViewColumn() vendedor: string;
}
