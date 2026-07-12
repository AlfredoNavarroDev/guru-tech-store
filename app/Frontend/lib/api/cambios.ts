import { authRequest, ApiError } from './client'

export interface CreateCambioInput {
  id_venta_origen: number
  id_item_devuelto: number
  cantidad: number
  precio_devuelto: number
  id_item_entregado: number
  precio_entregado: number
  diferencia_cobrada: number
  metodo_pago_dif?: string
  referencia_transaccion?: string
  motivo: string
  detalle?: string
  id_garantia?: number
}

export interface VentaDetalleItem {
  id_item: number
  nombre: string
  sku: string
  precio_unitario_momento: number
  cantidad: number
}

export interface VentaDetalle {
  id_venta: number
  fecha_emision: string
  cliente: string | null
  detalles: VentaDetalleItem[]
}

export interface VentaListItem {
  id_venta: number
  fecha_emision: string
  cliente: string | null
  total_items: number
}

export interface CambioResponse {
  id_cambio: number
  id_venta_origen: number
  id_garantia: number | null
  id_empleado: number
  id_sede: number
  id_item_devuelto: number
  nombre_item_devuelto: string
  cantidad: number
  precio_devuelto: number
  id_item_entregado: number
  nombre_item_entregado: string
  precio_entregado: number
  diferencia_cobrada: number
  metodo_pago_dif: string | null
  referencia_transaccion: string | null
  motivo: string
  detalle: string | null
  fecha_cambio: string
  created_at: string
}

export interface PaginatedCambios {
  items: CambioResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface QueryCambios {
  page?: number
  limit?: number
  fecha_desde?: string
  fecha_hasta?: string
}

export function getVentaDetalle(id_venta: number): Promise<VentaDetalle> {
  return authRequest<VentaDetalle>(`cambios/venta/${id_venta}`)
}

export function searchVentas(params?: { fecha?: string }): Promise<VentaListItem[]> {
  const qs = params?.fecha ? `?fecha=${encodeURIComponent(params.fecha)}` : ''
  return authRequest<VentaListItem[]>(`cambios/ventas${qs}`)
}

export function createCambio(dto: CreateCambioInput): Promise<CambioResponse> {
  return authRequest<CambioResponse>('cambios', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function getCambios(query?: QueryCambios, signal?: AbortSignal): Promise<PaginatedCambios> {
  const params = new URLSearchParams()
  if (query?.page) params.set('page', String(query.page))
  if (query?.limit) params.set('limit', String(query.limit))
  if (query?.fecha_desde) params.set('fecha_desde', query.fecha_desde)
  if (query?.fecha_hasta) params.set('fecha_hasta', query.fecha_hasta)
  const qs = params.toString()
  return authRequest<PaginatedCambios>(`cambios${qs ? `?${qs}` : ''}`, { signal })
}

export function getCambio(id: number): Promise<CambioResponse> {
  return authRequest<CambioResponse>(`cambios/${id}`)
}

export interface BoletaCambio {
  id_boleta: number
  numero: string
  fecha_emision: string
  id_cambio: number
  total: number
  estado: string
  url_pdf: string | null
}

export async function getBoletaCambio(idCambio: number): Promise<BoletaCambio | null> {
  try {
    return await authRequest<BoletaCambio>(`cambios/${idCambio}/boleta`)
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) return null
    throw e
  }
}

export function emitirBoletaCambio(idCambio: number): Promise<BoletaCambio> {
  return authRequest<BoletaCambio>(`cambios/${idCambio}/boleta`, { method: 'POST' })
}
