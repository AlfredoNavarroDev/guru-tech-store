export interface VentaDetalleItem {
  id_item: number;
  nombre: string;
  sku: string;
  precio_unitario_momento: number;
  cantidad: number;
}

export interface VentaDetalleResponse {
  id_venta: number;
  fecha_emision: Date;
  cliente: string | null;
  detalles: VentaDetalleItem[];
}

export interface CambioResponseDto {
  id_cambio: number;
  id_venta_origen: number;
  id_garantia: number | null;
  id_empleado: number;
  id_sede: number;
  id_item_devuelto: number;
  nombre_item_devuelto: string;
  cantidad: number;
  precio_devuelto: number;
  id_item_entregado: number;
  nombre_item_entregado: string;
  precio_entregado: number;
  diferencia_cobrada: number;
  metodo_pago_dif: string | null;
  referencia_transaccion: string | null;
  motivo: string;
  detalle: string | null;
  fecha_cambio: Date;
  created_at: Date;
}
