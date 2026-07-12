import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_abastecedor_stock_critico' })
export class StockCriticoView {
  @ViewColumn() id_sede: number;
  @ViewColumn() sede: string;
  @ViewColumn() id_item: number;
  @ViewColumn() sku: string;
  @ViewColumn() item: string;
  @ViewColumn() tipo: string;
  @ViewColumn() marca: string | null;
  @ViewColumn() modelo: string | null;
  @ViewColumn() cantidad_actual: number;
  @ViewColumn() stock_minimo: number;
  @ViewColumn() unidades_faltantes: number;
  @ViewColumn() precio_compra_actual: string;
}
