import { authRequest } from './client'

export interface Item {
  id_item: number
  tipo: 'producto' | 'repuesto'
  sku: string
  nombre: string
  id_marca: number | null
  marca: string | null
  modelo: string | null
  calidad: string | null
  especificaciones: Record<string, unknown> | null
  precio_compra_actual: number
  precio_venta_actual: number
  categorias: string[]
  created_at: string
  updated_at: string | null
}

export interface ItemsResponse {
  data: Item[]
  total: number
  page: number
  limit: number
}

export interface Categoria {
  id_categoria: number
  nombre_categoria: string
}

export interface Marca {
  id_marca: number
  nombre: string
}

export interface CreateItemPayload {
  tipo: 'producto' | 'repuesto'
  sku: string
  nombre: string
  id_marca?: number
  precio_compra_actual: number
  precio_venta_actual: number
  categoria_ids?: number[]
  modelo?: string
  calidad?: string
  especificaciones?: Record<string, unknown>
  stock_inicial?: number
}

export interface UpdateItemPayload extends Partial<CreateItemPayload> {}

export function getItems(params?: {
  page?: number
  limit?: number
  tipo?: 'producto' | 'repuesto'
  nombre?: string
  sku?: string
  categoria_id?: number
}) {
  const qs = new URLSearchParams()
  if (params?.page)        qs.set('page',        String(params.page))
  if (params?.limit)       qs.set('limit',       String(params.limit))
  if (params?.tipo)        qs.set('tipo',        params.tipo)
  if (params?.nombre)      qs.set('nombre',      params.nombre)
  if (params?.sku)         qs.set('sku',         params.sku)
  if (params?.categoria_id) qs.set('categoria_id', String(params.categoria_id))
  return authRequest<ItemsResponse>(`items?${qs}`)
}

export function createItem(payload: CreateItemPayload) {
  return authRequest<Item>('items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateItem(id: number, payload: UpdateItemPayload) {
  return authRequest<Item>(`items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteItem(id: number) {
  return authRequest<void>(`items/${id}`, { method: 'DELETE' })
}

export function getCategorias() {
  return authRequest<Categoria[]>('items/categorias')
}

export function getMarcas() {
  return authRequest<Marca[]>('items/marcas')
}
