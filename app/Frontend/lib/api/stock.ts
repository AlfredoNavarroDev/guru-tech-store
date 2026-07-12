import { authRequest } from './client'

export interface StockActual {
  id_inventario: number
  id_sede: number
  sede: string
  id_item: number
  sku: string
  item: string
  tipo: string
  id_marca: number | null
  marca: string | null
  categoria: string | null
  modelo: string | null
  calidad: string | null
  cantidad_actual: number
  stock_minimo: number
  diferencia_stock: number
  requiere_reposicion: boolean
  precio_compra_actual: number
}

export interface StockCritico {
  id_sede: number
  sede: string
  id_item: number
  sku: string
  item: string
  tipo: string
  marca: string | null
  modelo: string | null
  cantidad_actual: number
  stock_minimo: number
  unidades_faltantes: number
  precio_compra_actual: number
}

export interface StockResponse {
  items: StockActual[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function getStock(params?: {
  tipo?: 'producto' | 'repuesto'
  id_marca?: number
  requiere_reposicion?: boolean
  page?: number
  limit?: number
  id_sede?: number | null
}) {
  const qs = new URLSearchParams()
  if (params?.tipo)     qs.set('tipo',     params.tipo)
  if (params?.id_marca) qs.set('id_marca', String(params.id_marca))
  if (params?.requiere_reposicion !== undefined)
    qs.set('requiere_reposicion', String(params.requiere_reposicion))
  if (params?.page)  qs.set('page',  String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.id_sede != null) qs.set('id_sede', String(params.id_sede))
  const query = qs.toString()
  return authRequest<StockResponse>(`stock${query ? `?${query}` : ''}`)
}

export function getStockCritico(idSede?: number | null) {
  const qs = idSede != null ? `?id_sede=${idSede}` : ''
  return authRequest<StockCritico[]>(`stock/critico${qs}`)
}
