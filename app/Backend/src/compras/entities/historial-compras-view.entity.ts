import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_abastecedor_historial_compras' })
export class HistorialComprasView {
  @ViewColumn() id_compra: number;
  @ViewColumn() id_sede: number;
  @ViewColumn() sede: string;
  @ViewColumn() fecha_compra: Date;
  @ViewColumn() id_abastecedor: number;
  @ViewColumn() abastecedor: string;
  @ViewColumn() id_proveedor: number;
  @ViewColumn() proveedor: string;
  @ViewColumn() telefono_proveedor: string | null;
  @ViewColumn() id_item: number;
  @ViewColumn() sku: string;
  @ViewColumn() item: string;
  @ViewColumn() tipo_item: string;
  @ViewColumn() marca: string | null;
  @ViewColumn() cantidad_comprada: number;
  @ViewColumn() costo_unidad: string;
  @ViewColumn() precio_venta_sugerido: string | null;
  @ViewColumn() costo_total_linea: string;
}
