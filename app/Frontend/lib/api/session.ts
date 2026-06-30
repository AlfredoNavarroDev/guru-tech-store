export interface AuthSession {
  access_token: string
  nombre: string
  rol: string
  id_sede: number
  sede: string
  id_empleado: number
}

type BaseSession = Omit<AuthSession, 'rol'>
type BackendSession<R extends string = string> = BaseSession & {
  rol: R
  roles?: readonly string[]
}
type LegacySession<R extends string = string> = BaseSession & {
  rol?: string
  roles: readonly [R, ...string[]]
}
export type StoredSession = BackendSession | LegacySession

export function normalizeSession<const R extends string>(session: BackendSession<R>): AuthSession & { rol: R }
export function normalizeSession<const R extends string>(session: LegacySession<R>): AuthSession & { rol: R }
export function normalizeSession(session: StoredSession): AuthSession
export function normalizeSession(session: StoredSession): AuthSession {
  const role = session.rol ?? session.roles?.[0]
  if (!role) throw new Error('Session role missing')

  return {
    access_token: session.access_token,
    nombre: session.nombre,
    rol: role,
    id_sede: session.id_sede,
    sede: session.sede,
    id_empleado: session.id_empleado,
  }
}
