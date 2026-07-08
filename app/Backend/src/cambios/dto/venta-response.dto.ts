// Elemento del listado resumido de ventas que se muestra al vendedor para iniciar un cambio.
export interface VentaListItem {
  id_venta: number;
  fecha_emision: Date;
  // Nombre del cliente; null si la venta fue sin cliente registrado.
  cliente: string | null;
  // Número total de líneas de ítem en la venta, útil para mostrar en el selector.
  total_items: number;
}
