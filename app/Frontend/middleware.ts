import { NextRequest, NextResponse } from 'next/server'

interface JwtPayload {
  sub: number
  id_sede: number | null
  rol: string
  nombre: string
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1]
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload
  } catch {
    return null
  }
}

const ROUTE_ROLES: [string, string[]][] = [
  ['/dashboard/empleados',   ['admin', 'administrador', 'propietario']],
  ['/dashboard/compras',     ['abastecedor']],
  ['/dashboard/proveedores', ['abastecedor', 'propietario']],
  ['/dashboard/stock',       ['abastecedor', 'propietario']],
  ['/dashboard/items',       ['abastecedor']],
  ['/dashboard/ventas',      ['vendedor', 'propietario', 'gerente']],
  ['/dashboard/clientes',    ['vendedor', 'propietario', 'gerente', 'tecnico']],
  ['/dashboard/catalogo',    ['vendedor', 'propietario', 'gerente']],
  ['/dashboard/sedes',       ['propietario']],
]

export function middleware(request: NextRequest) {
  const authRaw = request.cookies.get('guru_auth')?.value
  let jwtToken: string | null = null
  if (authRaw) {
    try {
      const decoded = decodeURIComponent(authRaw)
      const parsed = JSON.parse(decoded) as { access_token?: string }
      jwtToken = parsed.access_token ?? null
    } catch {
      jwtToken = null
    }
  }

  if (!jwtToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = decodeJwt(jwtToken)
  if (!payload?.rol) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { pathname } = request.nextUrl
  for (const [route, roles] of ROUTE_ROLES) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      if (!roles.includes(payload.rol)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
