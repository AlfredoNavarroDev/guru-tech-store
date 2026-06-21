import { authRequest } from './client'

export interface DetalleVentaInput {
  id_item: number
  cantidad: number
  precio_unitario_momento: number
  precio_normal_momento?: number | null
  costo_unitario_momento: number
  importe: number
}

export interface CreateVentaInput {
  id_cliente?: number
  items: DetalleVentaInput[]
  monto_descuento?: number
  tipo_descuento?: 'porcentaje' | 'monto_fijo'
  justificacion_descuento?: string
}

export interface VentaVista {
  id_venta: number
  id_sede: number
  sede: string
  id_empleado: number
  vendedor: string
  fecha_emision: string
  cliente: string | null
  producto: string
  sku: string
  cantidad: number
  precio_unitario_momento: number
  precio_normal_momento: number | null
  importe: number
  monto_descuento: number
  total_venta_cabecera: number
  nro_boleta: string | null
}

export interface PaginatedVentas {
  items: VentaVista[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface QueryVentas {
  page?: number
  limit?: number
  fecha_desde?: string
  fecha_hasta?: string
  id_cliente?: number
  nombre_cliente?: string
}

export interface CreatePagoInput {
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin' | 'otro'
  monto: number
  referencia_transaccion?: string
}

export interface Pago {
  id_pago: number
  id_venta: number
  metodo_pago: string
  monto: number
  referencia_transaccion: string | null
  fecha_pago: string
}

export function createVenta(dto: CreateVentaInput): Promise<{ id_venta: number }> {
  return authRequest('ventas', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function getVentas(query?: QueryVentas): Promise<PaginatedVentas> {
  const params = new URLSearchParams()
  if (query?.page) params.set('page', String(query.page))
  if (query?.limit) params.set('limit', String(query.limit))
  if (query?.fecha_desde) params.set('fecha_desde', query.fecha_desde)
  if (query?.fecha_hasta) params.set('fecha_hasta', query.fecha_hasta)
  if (query?.id_cliente !== undefined) params.set('id_cliente', String(query.id_cliente))
  if (query?.nombre_cliente) params.set('nombre_cliente', query.nombre_cliente)
  const qs = params.toString()
  return authRequest<PaginatedVentas>(`ventas${qs ? `?${qs}` : ''}`)
}

export function getVenta(id: number): Promise<VentaVista[]> {
  return authRequest<VentaVista[]>(`ventas/${id}`)
}

export function createPago(ventaId: number, dto: CreatePagoInput): Promise<Pago> {
  return authRequest<Pago>(`ventas/${ventaId}/pagos`, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function getPagos(ventaId: number): Promise<Pago[]> {
  return authRequest<Pago[]>(`ventas/${ventaId}/pagos`)
}

export interface VentaReciente {
  id_venta: number
  cliente: string | null
  total_venta_cabecera: number
  fecha_emision: string
}

export interface EstadisticasHoy {
  ventas_hoy: number
  ingresos_hoy: number
  clientes_hoy: number
  ventas_ayer: number
  ingresos_ayer: number
  clientes_ayer: number
  recientes: VentaReciente[]
}

export function getEstadisticas(): Promise<EstadisticasHoy> {
  return authRequest<EstadisticasHoy>('ventas/estadisticas')
}

export interface Boleta {
  id_boleta: number
  numero: string
  fecha_emision: string
  id_venta: number
  total: number
  estado: string
  url_pdf: string | null
}

export function emitirBoleta(ventaId: number): Promise<Boleta> {
  return authRequest<Boleta>(`ventas/${ventaId}/boletas`, { method: 'POST' })
}

export async function getBoleta(ventaId: number): Promise<Boleta | null> {
  try {
    return await authRequest<Boleta>(`ventas/${ventaId}/boletas`)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
      return null
    }
    throw err
  }
}
