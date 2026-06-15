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

let _cachedRaw: string | null = undefined as unknown as string | null
let _cachedSession: AuthSession | null = null

export function saveSession(session: AuthSession, refreshToken?: string): void {
  const normalized = normalizeSession(session)
  const raw = JSON.stringify(normalized)
  localStorage.setItem('guru_auth', raw)
  _cachedRaw = raw
  _cachedSession = normalized
  setAuthCookie(normalized.access_token)
  if (refreshToken) localStorage.setItem('guru_refresh_token', refreshToken)
}

export function setAuthCookie(token: string): void {
  document.cookie = `guru_token=${token}; path=/; SameSite=Strict; max-age=604800`
}

export function clearSession(): void {
  localStorage.removeItem('guru_auth')
  localStorage.removeItem('guru_refresh_token')
  document.cookie = 'guru_token=; path=/; max-age=0'
  _cachedRaw = null
  _cachedSession = null
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('guru_auth')
  if (raw === _cachedRaw) return _cachedSession
  _cachedRaw = raw
  if (!raw) { _cachedSession = null; return null }
  try {
    _cachedSession = normalizeSession(JSON.parse(raw) as StoredSession)
  } catch {
    _cachedSession = null
  }
  return _cachedSession
}
