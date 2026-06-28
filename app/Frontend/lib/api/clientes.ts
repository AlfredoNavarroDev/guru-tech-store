import { authRequest } from './client'

export interface ClienteVista {
  id_cliente: number
  tipo_documento: string
  nro_documento: string
  nombre_completo: string
  telefono: string | null
  direccion_completa: string | null
  es_extranjero: boolean
  total_compras: number
  ultima_compra: string | null
}

export interface CreateClienteInput {
  tipo_documento: 'DNI' | 'CE' | 'pasaporte'
  nro_documento: string
  nombre_completo: string
  telefono?: string
  direccion_completa?: string
}

export interface QueryClientes {
  search?: string
  nombre?: string
  nro_documento?: string
}

export function getClientes(query?: QueryClientes): Promise<ClienteVista[]> {
  const params = new URLSearchParams()
  if (query?.search) params.set('search', query.search)
  if (query?.nombre) params.set('nombre', query.nombre)
  if (query?.nro_documento) params.set('nro_documento', query.nro_documento)
  const qs = params.toString()
  return authRequest<ClienteVista[]>(`clientes${qs ? `?${qs}` : ''}`)
}

export function getCliente(id: number): Promise<ClienteVista> {
  return authRequest<ClienteVista>(`clientes/${id}`)
}

export function createCliente(dto: CreateClienteInput): Promise<ClienteVista> {
  return authRequest<ClienteVista>('clientes', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function updateCliente(id: number, dto: Partial<CreateClienteInput>): Promise<ClienteVista> {
  return authRequest<ClienteVista>(`clientes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  })
}
