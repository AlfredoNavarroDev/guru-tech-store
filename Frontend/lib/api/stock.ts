import { authRequest } from './client'

export interface StockActual {
  id_inventario: number
  id_sede: number
  sede: string
  id_item: number
  sku: string
  item: string
  tipo: string
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

export function getStock() {
  return authRequest<StockActual[]>('stock')
}

export function getStockCritico() {
  return authRequest<StockCritico[]>('stock/critico')
}
