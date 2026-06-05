import { authRequest } from './client'

export interface CatalogoItem {
  id_item: number
  sku: string
  producto: string
  marca: string
  categoria: string
  modelo: string | null
  precio_venta_actual: number
  stock_disponible: number
  promo_nombre: string | null
  promo_tipo: string | null
  promo_valor: number | null
  precio_con_descuento: number | null
}

export interface QueryCatalogo {
  categoria?: number
  marca?: number
  nombre?: string
  con_stock?: boolean
}

export function getCatalogo(query?: QueryCatalogo): Promise<CatalogoItem[]> {
  const params = new URLSearchParams()
  if (query?.categoria !== undefined) params.set('categoria', String(query.categoria))
  if (query?.marca !== undefined) params.set('marca', String(query.marca))
  if (query?.nombre) params.set('nombre', query.nombre)
  if (query?.con_stock !== undefined) params.set('con_stock', String(query.con_stock))
  const qs = params.toString()
  return authRequest<CatalogoItem[]>(`catalogos${qs ? `?${qs}` : ''}`)
}
