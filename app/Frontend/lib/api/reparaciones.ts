import { authRequest } from './client'

export interface RepuestoUsadoResponse {
  id_repuesto_u: number
  id_item: number
  item_nombre: string | null
  sku: string | null
  cantidad: number
  precio_cobrado: number
  costo_unitario_momento: number
}

export interface PagoReparacionResponse {
  id_pago: number
  metodo_pago: string
  monto: number
  es_adelanto: boolean
  fecha_pago: string
}

export interface ReparacionResponse {
  id_reparacion: number
  fecha_ingreso: string
  id_cliente: number
  cliente: string | null
  id_tecnico: number
  tecnico: string | null
  id_sede: number
  marca: string | null
  modelo: string | null
  imei: string | null
  esta_encendido: boolean | null
  checklist_estado: Record<string, unknown> | null
  diagnostico_tecnico: string | null
  id_estado: number
  estado: string | null
  fecha_estimada: string | null
  fecha_terminado: string | null
  fecha_entrega_cliente: string | null
  monto_cotizado: number | null
  monto_descuento: number
  tipo_descuento: string | null
  created_at: string
  updated_at: string | null
  tipo_servicio: 'software' | 'hardware' | 'mixto' | null
  repuestos?: RepuestoUsadoResponse[]
  pagos?: PagoReparacionResponse[]
  total_pagado?: number
  saldo_pendiente?: number
  fotos: { url: string; etapa: string; created_at: string }[] | null
}

export interface PaginatedReparaciones {
  items: ReparacionResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface QueryReparaciones {
  page?: number
  limit?: number
  id_estado?: number
  id_cliente?: number
  fecha_desde?: string
  fecha_hasta?: string
  marca?: string
  modelo?: string
}

export interface CreateReparacionInput {
  id_cliente: number
  marca?: string
  modelo?: string
  imei?: string
  esta_encendido?: boolean
  checklist_estado?: Record<string, unknown>
  diagnostico_tecnico?: string
  monto_cotizado?: number
  fecha_estimada?: string
  tipo_servicio?: 'software' | 'hardware' | 'mixto'
  monto_descuento?: number
  tipo_descuento?: 'porcentaje' | 'monto_fijo'
  justificacion_descuento?: string
}

export interface AddRepuestoInput {
  id_item: number
  cantidad: number
  precio_cobrado: number
  costo_unitario_momento: number
}

export interface CreatePagoInput {
  metodo_pago: string
  monto: number
  es_adelanto?: boolean
  referencia_transaccion?: string
}

export interface BoletaReparacion {
  id_boleta: number
  numero: string
  fecha_emision: string
  id_reparacion: number
  total: number
  estado: string
  url_pdf: string | null
}

export function getReparaciones(query?: QueryReparaciones): Promise<PaginatedReparaciones> {
  const params = new URLSearchParams()
  if (query?.page)        params.set('page',        String(query.page))
  if (query?.limit)       params.set('limit',       String(query.limit))
  if (query?.id_estado)   params.set('id_estado',   String(query.id_estado))
  if (query?.id_cliente)  params.set('id_cliente',  String(query.id_cliente))
  if (query?.fecha_desde) params.set('fecha_desde', query.fecha_desde)
  if (query?.fecha_hasta) params.set('fecha_hasta', query.fecha_hasta)
  if (query?.marca)       params.set('marca',       query.marca)
  if (query?.modelo)      params.set('modelo',      query.modelo)
  const qs = params.toString()
  return authRequest<PaginatedReparaciones>(`reparaciones${qs ? `?${qs}` : ''}`)
}

export function getReparacion(id: number): Promise<ReparacionResponse> {
  return authRequest<ReparacionResponse>(`reparaciones/${id}`)
}

export function createReparacion(dto: CreateReparacionInput): Promise<ReparacionResponse> {
  return authRequest<ReparacionResponse>('reparaciones', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export interface UpdateEstadoInput {
  id_estado: number
  diagnostico_tecnico?: string
  monto_cotizado?: number
  fecha_estimada?: string
}

export function updateEstadoReparacion(
  id: number,
  dto: UpdateEstadoInput,
): Promise<ReparacionResponse> {
  return authRequest<ReparacionResponse>(`reparaciones/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  })
}

export function addRepuesto(id: number, dto: AddRepuestoInput): Promise<RepuestoUsadoResponse> {
  return authRequest<RepuestoUsadoResponse>(`reparaciones/${id}/repuestos`, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function removeRepuesto(id: number, repuestoId: number): Promise<void> {
  return authRequest<void>(`reparaciones/${id}/repuestos/${repuestoId}`, { method: 'DELETE' })
}

export function createPagoReparacion(
  id: number,
  dto: CreatePagoInput,
): Promise<PagoReparacionResponse> {
  return authRequest<PagoReparacionResponse>(`reparaciones/${id}/pagos`, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function getPagosReparacion(id: number): Promise<PagoReparacionResponse[]> {
  return authRequest<PagoReparacionResponse[]>(`reparaciones/${id}/pagos`)
}

export async function getBoletaReparacion(id: number): Promise<BoletaReparacion | null> {
  try {
    return await authRequest<BoletaReparacion>(`reparaciones/${id}/boleta`)
  } catch {
    return null
  }
}

export function emitirBoletaReparacion(id: number): Promise<BoletaReparacion> {
  return authRequest<BoletaReparacion>(`reparaciones/${id}/boleta`, { method: 'POST' })
}

export interface UploadFotoInput {
  imagen_base64: string
  content_type: string
  estado: string
}

export function uploadFotoReparacion(id: number, dto: UploadFotoInput): Promise<{ url: string }> {
  return authRequest<{ url: string }>(`reparaciones/${id}/fotos`, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}
