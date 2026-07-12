import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_garantia_reclamo' })
export class GarantiaReclamoView {
  @ViewColumn() id_garantia: number;
  @ViewColumn() id_venta: number | null;
  @ViewColumn() id_reparacion: number | null;
  @ViewColumn() estado: string;
  @ViewColumn() id_sede: number | null;
  @ViewColumn() id_cliente: number | null;
  @ViewColumn() marca: string | null;
  @ViewColumn() modelo: string | null;
  @ViewColumn() imei: string | null;
}
