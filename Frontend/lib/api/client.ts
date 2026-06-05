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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message[0]
      : (data.message ?? 'Error desconocido')
    throw new ApiError(data.statusCode ?? res.status, data.errorCode ?? 'UNKNOWN', msg)
  }

  return data as T
}

export function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('guru_auth') : null
  const token = raw ? (JSON.parse(raw) as { access_token: string }).access_token : ''
  return request<T>(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  })
}

export { request }
