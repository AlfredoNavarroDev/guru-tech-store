export interface VentaListItem {
  id_venta: number;
  fecha_emision: Date;
  cliente: string | null;
  total_items: number;
}
