import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_vendedor_ventas' })
export class VentaView {
  @ViewColumn() id_venta: number;
  @ViewColumn() id_sede: number;
  @ViewColumn() sede: string;
  @ViewColumn() id_empleado: number;
  @ViewColumn() vendedor: string;
  @ViewColumn() fecha_emision: Date;
  @ViewColumn() cliente: string | null;
  @ViewColumn() producto: string;
  @ViewColumn() sku: string;
  @ViewColumn() cantidad: number;
  @ViewColumn() precio_unitario_momento: string;
  @ViewColumn() precio_normal_momento: string | null;
  @ViewColumn() importe: string;
  @ViewColumn() monto_descuento: string;
  @ViewColumn() total_venta_cabecera: string;
  @ViewColumn() nro_boleta: string | null;
}
