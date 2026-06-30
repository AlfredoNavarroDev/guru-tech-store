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
  ['/dashboard/empleados',   ['admin', 'administrador']],
  ['/dashboard/compras',     ['abastecedor']],
  ['/dashboard/proveedores', ['abastecedor']],
  ['/dashboard/stock',       ['abastecedor']],
  ['/dashboard/items',       ['abastecedor']],
  ['/dashboard/ventas',      ['vendedor', 'propietario', 'gerente']],
  ['/dashboard/clientes',    ['vendedor', 'propietario', 'gerente', 'tecnico']],
  ['/dashboard/catalogo',    ['vendedor', 'propietario', 'gerente']],
]

export function middleware(request: NextRequest) {
  const token = request.cookies.get('guru_token')
  if (!token?.value) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = decodeJwt(token.value)
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
