import { request } from './client'

export interface AuthSession {
  access_token: string
  nombre: string
  roles: string[]
  id_sede: number
  sede: string
}

export interface LoginPayload {
  nro_documento: string
  password: string
}

export async function loginApi(payload: LoginPayload): Promise<AuthSession> {
  return request<AuthSession>('auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem('guru_auth', JSON.stringify(session))
  document.cookie = `guru_token=${session.access_token}; path=/; SameSite=Strict`
}

export function clearSession(): void {
  localStorage.removeItem('guru_auth')
  document.cookie = 'guru_token=; path=/; max-age=0'
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('guru_auth')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}
