// app/Frontend/lib/api/propietario.ts
import { authRequest } from './client'

export interface ResumenHoy {
  ventas_hoy:                number
  ingresos_ventas_hoy:       number
  ingresos_reparaciones_hoy: number
  ingresos_total_hoy:        number
  ingresos_mes:              number
  ingresos_mes_ant:          number
  ticket_promedio:           number
  transacciones_hoy:         number
  ingresos_total_ayer:       number
  ventas_ayer:               number
}

export interface VentaReciente {
  id_venta: number
  hora:     string
  cliente:  string | null
  vendedor: string
  total:    number
}

export interface TopProducto {
  id_item:  number
  nombre:   string
  sku:      string
  unidades: number
  ingresos: number
  pct:      number
}

export interface EmpleadoVsMeta {
  id_empleado:        number
  nombre_completo:    string
  nombre_rol:         string
  total_hoy:          number
  meta_ventas_diaria: number
}

export interface ReporteDia {
  fecha:        string
  total_ventas: number
  ingresos:     number
}

export interface ReporteReparacion {
  estado:   string
  total:    number
  ingresos: number
}

export interface ReporteEmpleado {
  nombre_completo:    string
  nombre_rol:         string
  total_ventas:       number
  total_reparaciones: number
}

export interface ReporteData {
  ventas:       ReporteDia[]
  reparaciones: ReporteReparacion[]
  compras:      { total_compras: number; monto_total: number }
  empleados:    ReporteEmpleado[]
  inventario:   { total_items: number; items_bajo_stock: number }
  desde:        string
  hasta:        string
}

function sedeQs(idSede?: number | null): string {
  return idSede != null ? `?id_sede=${idSede}` : ''
}

export function getResumenHoy(idSede?: number | null): Promise<ResumenHoy> {
  return authRequest<ResumenHoy>(`propietario/resumen-hoy${sedeQs(idSede)}`)
}

export function getVentasRecientes(idSede?: number | null): Promise<VentaReciente[]> {
  return authRequest<VentaReciente[]>(`propietario/ventas-recientes${sedeQs(idSede)}`)
}

export function getTopProductos(idSede?: number | null): Promise<TopProducto[]> {
  return authRequest<TopProducto[]>(`propietario/top-productos${sedeQs(idSede)}`)
}

export function getEmpleadosVsMetaHoy(idSede?: number | null): Promise<EmpleadoVsMeta[]> {
  return authRequest<EmpleadoVsMeta[]>(`propietario/empleados-vs-meta-hoy${sedeQs(idSede)}`)
}

export function getReportes(params: {
  id_sede?: number | null
  fecha_desde?: string
  fecha_hasta?: string
}): Promise<ReporteData> {
  const qs = new URLSearchParams()
  if (params.id_sede != null) qs.set('id_sede', String(params.id_sede))
  if (params.fecha_desde) qs.set('fecha_desde', params.fecha_desde)
  if (params.fecha_hasta) qs.set('fecha_hasta', params.fecha_hasta)
  const q = qs.toString()
  return authRequest<ReporteData>(`propietario/reportes${q ? `?${q}` : ''}`)
}
