const OPTS = 'path=/; SameSite=Strict; Secure; max-age=604800'

export function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; ${OPTS}`
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`
}
