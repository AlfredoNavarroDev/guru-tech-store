import { authRequest } from './client'
import type { ReparacionResponse } from './reparaciones'

export interface GarantiaResponse {
  id_garantia: number
  tipo: 'venta' | 'reparacion'
  id_venta: number | null
  id_reparacion: number | null
  referencia_label: string
  fecha_inicio: string
  fecha_fin: string
  estado: 'activa' | 'vencida' | 'invalidada'
  motivo_invalidacion: string | null
  created_at: string
}

export interface PaginatedGarantias {
  items: GarantiaResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ReparacionPreview {
  id_reparacion: number
  cliente: string | null
  marca: string | null
  modelo: string | null
  estado: string | null
}

export function getGarantias(query?: {
  page?: number
  limit?: number
  estado?: string
  id_reparacion?: number
}): Promise<PaginatedGarantias> {
  const params = new URLSearchParams()
  if (query?.page) params.set('page', String(query.page))
  if (query?.limit) params.set('limit', String(query.limit))
  if (query?.estado) params.set('estado', query.estado)
  if (query?.id_reparacion) params.set('id_reparacion', String(query.id_reparacion))
  const qs = params.toString()
  return authRequest<PaginatedGarantias>(`garantias${qs ? `?${qs}` : ''}`)
}

export function getGarantia(id: number): Promise<GarantiaResponse> {
  return authRequest<GarantiaResponse>(`garantias/${id}`)
}

export function createGarantia(dto: {
  id_reparacion: number
  fecha_inicio: string
  fecha_fin: string
}): Promise<GarantiaResponse> {
  return authRequest<GarantiaResponse>('garantias', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function getReparacionPreview(id: number): Promise<ReparacionPreview> {
  return authRequest<ReparacionPreview>(`reparaciones/${id}`)
}

export interface CreateReclamoGarantiaInput {
  marca?: string
  modelo?: string
  imei?: string
  esta_encendido?: boolean
  checklist_estado?: Record<string, unknown>
  diagnostico_tecnico?: string
  fecha_estimada?: string
}

export function crearReclamoGarantia(
  idGarantia: number,
  dto: CreateReclamoGarantiaInput = {},
): Promise<ReparacionResponse> {
  return authRequest<ReparacionResponse>(`garantias/${idGarantia}/reclamos`, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}
