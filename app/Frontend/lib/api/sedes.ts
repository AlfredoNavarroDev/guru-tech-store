// app/Frontend/lib/api/sedes.ts
import { authRequest } from './client'

export interface Sede {
  id_sede: number
  nombre: string
  direccion: string
}

export function getSedes(): Promise<Sede[]> {
  return authRequest<Sede[]>('sedes')
}
