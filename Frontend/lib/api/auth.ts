import { request } from './client'
import { normalizeSession, type AuthSession, type StoredSession } from './session'
export { normalizeSession, type AuthSession } from './session'

export interface LoginPayload {
  nro_documento: string
  password: string
}

interface LoginResponse extends AuthSession {
  refresh_token: string
}

export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>('auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function saveSession(session: AuthSession, refreshToken?: string): void {
  const normalized = normalizeSession(session)
  localStorage.setItem('guru_auth', JSON.stringify(normalized))
  document.cookie = `guru_token=${normalized.access_token}; path=/; SameSite=Strict`
  if (refreshToken) localStorage.setItem('guru_refresh_token', refreshToken)
}

export function clearSession(): void {
  localStorage.removeItem('guru_auth')
  localStorage.removeItem('guru_refresh_token')
  document.cookie = 'guru_token=; path=/; max-age=0'
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('guru_auth')
  if (!raw) return null
  try {
    return normalizeSession(JSON.parse(raw) as StoredSession)
  } catch {
    return null
  }
}
