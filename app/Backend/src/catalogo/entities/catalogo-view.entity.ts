import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_vendedor_catalogo' })
export class CatalogoView {
  @ViewColumn() id_item: number;
  @ViewColumn() sku: string;
  @ViewColumn() producto: string;
  @ViewColumn() marca: string | null;
  @ViewColumn() categoria: string | null;
  @ViewColumn() modelo: string | null;
  @ViewColumn() precio_venta_actual: string;
  @ViewColumn() imagen_url: string | null;
  @ViewColumn() id_sede: number;
  @ViewColumn() sede: string;
  @ViewColumn() stock_disponible: string;
  @ViewColumn() promo_nombre: string | null;
  @ViewColumn() promo_tipo: string | null;
  @ViewColumn() promo_valor: string | null;
  @ViewColumn() precio_con_descuento: string;
  @ViewColumn() calidad: string | null;
}
