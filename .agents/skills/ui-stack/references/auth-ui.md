# Autenticación y Autorización UI — UI Stack

---

## Flujo de login completo

```tsx
// app/login/page.tsx — Server Component wrapper
import { LoginClient } from './LoginClient'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  // Redirigir si ya hay sesión activa
  const session = await getSession()
  if (session) redirect('/dashboard')

  return <LoginClient />
}
```

```tsx
// app/login/LoginClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function LoginClient() {
  const router = useRouter()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      await login(fd.get('email') as string, fd.get('password') as string)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciales incorrectas'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Ingresar al sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema — Acceso de empleados</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Correo electrónico</label>
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="empleado@empresa.com"
              className={cn(error && 'border-destructive')}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Contraseña</label>
            <div className="relative">
              <Input
                name="password"
                type={showPass ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className={cn('pr-10', error && 'border-destructive')}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mensaje de error de credenciales */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Ingresando…' : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Ingresar
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

---

## AuthContext y useAuth

```tsx
// lib/auth/AuthContext.tsx
'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type User = { id: string; nombre: string; email: string; rol: string }

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión existente al montar
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const { message } = await res.json()
      throw new Error(message ?? 'Error al iniciar sesión')
    }
    const data = await res.json()
    setUser(data.user)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook para consumir AuthContext
export function useAuth() {
  return useContext(AuthContext)
}
```

---

## Middleware — rutas protegidas

> **Importante — dos capas de verificación:**
>
> El middleware solo hace **routing rápido**: detecta si hay token y extrae el rol para redirigir.
> No verifica la firma criptográfica del JWT (el Edge Runtime no tiene acceso fácil a `jsonwebtoken`).
>
> La **verificación real** (firma, expiración, claims) ocurre en:
> - Route Handlers (`app/api/*/route.ts`) — usando `jose` o el SDK del backend
> - Server Actions — antes de ejecutar cualquier mutación
>
> Nunca confiar en el payload del middleware para tomar decisiones de seguridad — solo para UX de redirección.

```tsx
// middleware.ts — routing rápido por autenticación y rol (NO es la verificación real)
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/api/auth/login']
const ADMIN_ONLY   = ['/dashboard/config', '/dashboard/empleados']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas — dejar pasar
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next()

  const token = request.cookies.get('auth_token')?.value

  // Sin token — redirigir a login
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Decodificar payload para routing — SIN verificar firma (solo UX, no seguridad)
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())

    if (ADMIN_ONLY.some(r => pathname.startsWith(r)) && payload.rol !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch {
    // Token malformado — redirigir a login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

```tsx
// app/api/ventas/route.ts — verificación REAL del JWT en Route Handler
// Instalar: npm i jose
import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  try {
    // Verifica firma + expiración — lanza error si el token es inválido
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (!['admin', 'vendedor'].includes(payload.rol as string)) {
      return NextResponse.json({ message: 'Sin permisos' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ message: 'Token inválido o expirado' }, { status: 401 })
  }

  const body = await request.json()
  // ... lógica de venta
  return NextResponse.json({ ok: true })
}
```

---

## Refresh token — interceptor automático

```tsx
// lib/auth/fetch-client.ts
// Wrapper sobre fetch que renueva token antes de requests

let isRefreshing = false
let refreshQueue: Array<() => void> = []

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await fetch(url, { ...options, credentials: 'include' })

  if (res.status === 401 && !isRefreshing) {
    isRefreshing = true
    try {
      const refresh = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      if (!refresh.ok) throw new Error('No se pudo renovar la sesión')

      // Reintentar requests encolados
      refreshQueue.forEach(resolve => resolve())
      refreshQueue = []

      // Reintentar request original
      res = await fetch(url, { ...options, credentials: 'include' })
    } catch {
      // Refresh falló — limpiar sesión y redirigir
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login?motivo=sesion-expirada'
      throw new Error('Sesión expirada')
    } finally {
      isRefreshing = false
    }
  } else if (res.status === 401 && isRefreshing) {
    // Encolar request mientras se renueva el token
    await new Promise<void>(resolve => refreshQueue.push(resolve))
    res = await fetch(url, { ...options, credentials: 'include' })
  }

  return res
}
```

---

## Detección de sesión expirada y logout por inactividad

```tsx
// hooks/useInactivityLogout.ts
'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutos

export function useInactivityLogout() {
  const { logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!isAuthenticated) return

    function resetTimer() {
      clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        await logout()
        toast.warning('Sesión cerrada por inactividad', {
          description: 'Por seguridad, tu sesión fue cerrada automáticamente.',
        })
        router.push('/login?motivo=inactividad')
      }, INACTIVITY_MS)
    }

    // Escuchar eventos de actividad del usuario
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(timer.current)
      events.forEach(ev => window.removeEventListener(ev, resetTimer))
    }
  }, [isAuthenticated, logout, router])
}
```

---

## Redirección post-login con mensaje en sesión expirada

```tsx
// app/login/LoginClient.tsx — detectar motivo de redirección
'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

function useLoginRedirectFeedback() {
  const params = useSearchParams()
  useEffect(() => {
    const motivo = params.get('motivo')
    if (motivo === 'sesion-expirada') {
      toast.warning('Tu sesión expiró — vuelve a ingresar')
    } else if (motivo === 'inactividad') {
      toast.info('Sesión cerrada por inactividad')
    }
  }, [params])
}

// Uso dentro de LoginClient:
// useLoginRedirectFeedback()
```

---

## Route Handler protegido

```tsx
// app/api/ventas/route.ts — verificar sesión en Route Handlers
import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }
  if (!['admin', 'vendedor'].includes(session.rol)) {
    return NextResponse.json({ message: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  // ... lógica de venta
  return NextResponse.json({ ok: true })
}
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| Guardar token JWT en `localStorage` | Cookies `httpOnly` — inaccesibles desde JS |
| Verificar autenticación solo en middleware | También verificar en Route Handlers y Server Actions |
| `router.refresh()` tras login | `router.push('/dashboard')` — navegación directa |
| Mostrar spinner de carga en toda la app para auth | `isLoading` solo en rutas protegidas |
| `<Button asChild><Link /></Button>` | `<Link className={buttonVariants()} />` |

---

## Quick Reference

```
AuthContext     →  lib/auth/AuthContext.tsx — user, login, logout, isLoading, isAuthenticated
useAuth()       →  hook que consume AuthContext
useInactivity   →  hooks/useInactivityLogout.ts — 30min inactividad → logout + toast
Middleware      →  middleware.ts — redirect a /login sin token, 403 por rol
authFetch()     →  lib/auth/fetch-client.ts — auto-refresh token en 401
Route Handler   →  getSession() + verificar rol antes de procesar
Sesión expirada →  ?motivo=sesion-expirada en URL + toast.warning en LoginClient
Cookies         →  httpOnly, secure — no accesibles desde JS del cliente
```
