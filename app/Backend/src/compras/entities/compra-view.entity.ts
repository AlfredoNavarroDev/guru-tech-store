import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_compra_cabecera' })
export class CompraView {
  @ViewColumn() id_compra: number;
  @ViewColumn() id_empleado_refiller: number;
  @ViewColumn() empleado: string;
  @ViewColumn() id_sede_destino: number;
  @ViewColumn() id_proveedor: number;
  @ViewColumn() proveedor: string;
  @ViewColumn() fecha_compra: Date;
  @ViewColumn() costo_total: string;
}
