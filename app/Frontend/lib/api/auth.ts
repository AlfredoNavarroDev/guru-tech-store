import { request } from './client'
import { normalizeSession, type AuthSession, type StoredSession } from './session'
import { setCookie, getCookie, deleteCookie } from './cookie'
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
  setCookie('guru_auth', raw)
  _cachedRaw = raw
  _cachedSession = normalized
  if (refreshToken) setCookie('guru_refresh_token', refreshToken)
}

export function clearSession(): void {
  const raw = getCookie('guru_auth')
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { id_empleado?: number }
      if (parsed.id_empleado) {
        localStorage.removeItem(`guru_chat_${parsed.id_empleado}`)
      }
    } catch { /* ignorar */ }
  }
  deleteCookie('guru_auth')
  deleteCookie('guru_refresh_token')
  deleteCookie('guru_token')
  _cachedRaw = null
  _cachedSession = null
}

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = getCookie('guru_auth')
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
