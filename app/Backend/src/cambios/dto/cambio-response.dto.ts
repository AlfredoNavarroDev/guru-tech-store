// Representa un ítem dentro de la vista de detalle de una venta usada en el flujo de cambio.
export interface VentaDetalleItem {
  id_item: number;
  nombre: string;
  sku: string;
  // Precio al que se vendió el ítem en el momento de la venta original.
  precio_unitario_momento: number;
  cantidad: number;
  // true si la restricción de ítem o categoría impide devoluciones/cambios.
  es_no_cambiable: boolean;
}

// Respuesta con la cabecera y los ítems de una venta; se usa para mostrar qué puede devolver el cliente.
export interface VentaDetalleResponse {
  id_venta: number;
  fecha_emision: Date;
  // Nombre del cliente; null si la venta fue anónima.
  cliente: string | null;
  detalles: VentaDetalleItem[];
}

// Forma completa de un cambio de producto devuelto por la vista v_cambio_detalle.
export interface CambioResponseDto {
  id_cambio: number;
  id_venta_origen: number;
  id_garantia: number | null;
  id_empleado: number;
  id_sede: number;
  id_item_devuelto: number;
  // Nombre del ítem devuelto resuelto desde el catálogo en la vista.
  nombre_item_devuelto: string;
  cantidad: number;
  precio_devuelto: number;
  id_item_entregado: number;
  nombre_item_entregado: string;
  precio_entregado: number;
  // Importe cobrado por la diferencia de valor entre los dos ítems.
  diferencia_cobrada: number;
  metodo_pago_dif: string | null;
  referencia_transaccion: string | null;
  motivo: string;
  detalle: string | null;
  fecha_cambio: Date;
  created_at: Date;
}
