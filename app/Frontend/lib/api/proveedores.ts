import { authRequest } from './client'

export interface Proveedor {
  id_proveedor: number
  ruc: string
  razon_social: string
  contacto_nombre: string | null
  telefono: string | null
  created_at: string
  updated_at: string | null
}

export interface CreateProveedorPayload {
  ruc: string
  razon_social: string
  contacto_nombre?: string
  telefono?: string
}

interface ProveedoresResponse {
  items: Proveedor[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getProveedores(): Promise<Proveedor[]> {
  const res = await authRequest<ProveedoresResponse>('proveedores?limit=500')
  return res.items
}

export function createProveedor(payload: CreateProveedorPayload) {
  return authRequest<Proveedor>('proveedores', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProveedor(id: number, payload: Partial<CreateProveedorPayload>) {
  return authRequest<Proveedor>(`proveedores/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
