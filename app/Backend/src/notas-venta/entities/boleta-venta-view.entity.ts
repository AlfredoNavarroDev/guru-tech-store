import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_boleta_venta' })
export class BoletaVentaView {
  @ViewColumn() id_venta: number;
  @ViewColumn() id_sede: number;
  @ViewColumn() sede_nombre: string;
  @ViewColumn() sede_direccion: string | null;
  @ViewColumn() sede_telefono: string | null;
  @ViewColumn() id_empleado: number;
  @ViewColumn() vendedor: string;
  @ViewColumn() fecha_emision: Date;
  @ViewColumn() monto_descuento: string;
  @ViewColumn() tipo_descuento: string | null;
  @ViewColumn() id_cliente: number | null;
  @ViewColumn() cliente_nombre: string | null;
  @ViewColumn() cliente_tipo_doc: string | null;
  @ViewColumn() cliente_nro_doc: string | null;
  @ViewColumn() producto: string;
  @ViewColumn() sku: string;
  @ViewColumn() cantidad: number;
  @ViewColumn() precio_unitario_momento: string;
  @ViewColumn() importe: string;
  @ViewColumn() total_venta: string;
}
