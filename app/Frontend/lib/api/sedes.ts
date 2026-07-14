// app/Frontend/lib/api/sedes.ts
import { authRequest } from './client'

export interface Sede {
  id_sede: number
  nombre: string
  direccion: string | null
  telefono: string | null
  hora_apertura: string | null
  hora_cierre: string | null
  esta_habilitada: boolean
}

export interface CreateSedePayload {
  nombre: string
  direccion?: string
  telefono?: string
  hora_apertura?: string
  hora_cierre?: string
}

export type UpdateSedePayload = Partial<CreateSedePayload>

export function getSedes(): Promise<Sede[]> {
  return authRequest<Sede[]>('sedes')
}

export function createSede(payload: CreateSedePayload): Promise<Sede> {
  return authRequest<Sede>('sedes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSede(id: number, payload: UpdateSedePayload): Promise<Sede> {
  return authRequest<Sede>(`sedes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function toggleSede(id: number): Promise<Sede> {
  return authRequest<Sede>(`sedes/${id}/toggle`, { method: 'PATCH' })
}
