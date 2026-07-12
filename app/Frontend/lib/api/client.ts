import { normalizeSession } from './session'
import { getCookie, setCookie, deleteCookie } from './cookie'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function parseError(status: number, data: Record<string, unknown>): ApiError {
  const msg = Array.isArray(data.message)
    ? (data.message as string[])[0]
    : ((data.message as string) ?? 'Error desconocido')
  return new ApiError(
    (data.statusCode as number) ?? status,
    (data.errorCode as string) ?? 'UNKNOWN',
    msg,
  )
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw parseError(res.status, data)
  return data as T
}

let _refreshPromise: Promise<string | null> | null = null

async function _doRefresh(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? getCookie('guru_refresh_token') : null
  if (!refreshToken) return null

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return null

    const data = await res.json()

    const raw = getCookie('guru_auth')
    if (raw) {
      const session = normalizeSession(JSON.parse(raw))
      session.access_token = data.access_token
      setCookie('guru_auth', JSON.stringify(session))
    }
    setCookie('guru_refresh_token', data.refresh_token)

    return data.access_token as string
  } catch {
    return null
  }
}

function tryRefresh(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise
  _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null })
  return _refreshPromise
}

export async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const getToken = (): string => {
    const raw = typeof window !== 'undefined' ? getCookie('guru_auth') : null
    return raw ? (JSON.parse(raw) as { access_token: string }).access_token : ''
  }

  const doFetch = (token: string) =>
    fetch(`${BASE}/${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    })

  let res = await doFetch(getToken())

  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (!newToken) {
      if (typeof window !== 'undefined') {
        deleteCookie('guru_auth')
        deleteCookie('guru_refresh_token')
        window.location.href = '/login'
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Sesión expirada')
    }
    res = await doFetch(newToken)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw parseError(res.status, data)
  return data as T
}
