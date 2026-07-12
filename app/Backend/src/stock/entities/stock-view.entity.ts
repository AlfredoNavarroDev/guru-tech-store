import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_abastecedor_stock_actual' })
export class StockView {
  @ViewColumn() id_inventario: number;
  @ViewColumn() id_sede: number;
  @ViewColumn() sede: string;
  @ViewColumn() id_item: number;
  @ViewColumn() sku: string;
  @ViewColumn() item: string;
  @ViewColumn() tipo: string;
  @ViewColumn() marca: string | null;
  @ViewColumn() categoria: string | null;
  @ViewColumn() modelo: string | null;
  @ViewColumn() calidad: string | null;
  @ViewColumn() cantidad_actual: number;
  @ViewColumn() stock_minimo: number;
  @ViewColumn() diferencia_stock: number;
  @ViewColumn() requiere_reposicion: boolean;
  @ViewColumn() precio_compra_actual: string;
}
