import { authRequest } from './client'

export interface DetalleCompra {
  id_detalle_compra: number
  id_item: number
  item_nombre: string | null
  sku: string | null
  cantidad_comprada: number
  costo_unidad: number
  precio_venta_sugerido: number
}

export interface Compra {
  id_compra: number
  id_empleado_refiller: number
  empleado: string | null
  id_sede_destino: number
  id_proveedor: number
  proveedor: string | null
  fecha_compra: string
  costo_total: number
  detalles?: DetalleCompra[]
}

export interface ComprasResponse {
  items: Compra[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AddItemCompraPayload {
  id_item: number
  cantidad_comprada: number
  costo_unidad: number
  precio_venta_sugerido: number
}

export function getCompras(params?: { page?: number; limit?: number; proveedor?: string }) {
  const qs = new URLSearchParams()
  if (params?.page)      qs.set('page',      String(params.page))
  if (params?.limit)     qs.set('limit',     String(params.limit))
  if (params?.proveedor) qs.set('proveedor', params.proveedor)
  return authRequest<ComprasResponse>(`compras?${qs}`)
}

export function getCompra(id: number) {
  return authRequest<Compra>(`compras/${id}`)
}

export function createCompra(id_proveedor: number) {
  return authRequest<Compra>('compras', {
    method: 'POST',
    body: JSON.stringify({ id_proveedor }),
  })
}

export function addItemToCompra(compraId: number, payload: AddItemCompraPayload) {
  return authRequest<Compra>(`compras/${compraId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
