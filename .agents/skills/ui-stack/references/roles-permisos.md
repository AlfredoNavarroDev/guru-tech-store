# Roles y Permisos — UI Stack

---

## Arquitectura Server/Client

```tsx
// app/dashboard/layout.tsx — Server Component: obtiene rol del backend
import { SidebarClient } from '@/components/layout/SidebarClient'
import { getSession } from '@/lib/auth/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen">
      {/* Sidebar recibe rol — renderiza items condicionalmente */}
      <SidebarClient rol={session.rol} usuario={session.usuario} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

---

## Definición de roles y permisos

```tsx
// lib/auth/permissions.ts
export type Rol = 'admin' | 'gerente' | 'vendedor' | 'almacenero'

export type Permiso =
  | 'ventas:ver' | 'ventas:crear' | 'ventas:anular'
  | 'inventario:ver' | 'inventario:ajustar' | 'inventario:transferir'
  | 'clientes:ver' | 'clientes:crear' | 'clientes:editar' | 'clientes:eliminar'
  | 'reportes:ver' | 'reportes:exportar'
  | 'config:ver' | 'config:editar'
  | 'empleados:ver' | 'empleados:gestionar'

const PERMISOS_POR_ROL: Record<Rol, Permiso[]> = {
  admin: [
    'ventas:ver', 'ventas:crear', 'ventas:anular',
    'inventario:ver', 'inventario:ajustar', 'inventario:transferir',
    'clientes:ver', 'clientes:crear', 'clientes:editar', 'clientes:eliminar',
    'reportes:ver', 'reportes:exportar',
    'config:ver', 'config:editar',
    'empleados:ver', 'empleados:gestionar',
  ],
  gerente: [
    'ventas:ver', 'ventas:anular',
    'inventario:ver', 'inventario:ajustar',
    'clientes:ver', 'clientes:editar',
    'reportes:ver', 'reportes:exportar',
    'config:ver',
    'empleados:ver',
  ],
  vendedor: [
    'ventas:ver', 'ventas:crear',
    'inventario:ver',
    'clientes:ver', 'clientes:crear',
  ],
  almacenero: [
    'inventario:ver', 'inventario:ajustar', 'inventario:transferir',
  ],
}

export function can(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol]?.includes(permiso) ?? false
}

export function canAny(rol: Rol, permisos: Permiso[]): boolean {
  return permisos.some(p => can(rol, p))
}
```

---

## Hook useRole

```tsx
// hooks/useRole.ts
'use client'
import { useContext } from 'react'
import { AuthContext } from '@/lib/auth/AuthContext'
import { can, canAny, type Permiso, type Rol } from '@/lib/auth/permissions'

export function useRole() {
  const { user } = useContext(AuthContext)
  const rol = (user?.rol ?? 'vendedor') as Rol

  return {
    rol,
    can:    (permiso: Permiso) => can(rol, permiso),
    canAny: (permisos: Permiso[]) => canAny(rol, permisos),
    isAdmin: rol === 'admin',
  }
}
```

---

## Componente Can — renderizado condicional

```tsx
// components/auth/Can.tsx
'use client'
import { useRole } from '@/hooks/useRole'
import type { Permiso } from '@/lib/auth/permissions'

export function Can({
  permission,
  anyOf,
  fallback = null,
  children,
}: {
  permission?: Permiso
  anyOf?: Permiso[]
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { can, canAny } = useRole()

  const allowed = permission
    ? can(permission)
    : anyOf
    ? canAny(anyOf)
    : false

  return allowed ? <>{children}</> : <>{fallback}</>
}

// Uso:
// <Can permission="ventas:anular">
//   <Button variant="destructive">Anular venta</Button>
// </Can>
//
// <Can anyOf={['reportes:exportar', 'config:editar']} fallback={<span>Sin acceso</span>}>
//   <ExportButton />
// </Can>
```

---

## Sidebar dinámico por rol

```tsx
// components/layout/SidebarClient.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  BarChart2, Settings, Warehouse,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { can, type Rol } from '@/lib/auth/permissions'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  permiso: import('@/lib/auth/permissions').Permiso
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',           label: 'Inicio',      icon: LayoutDashboard, permiso: 'ventas:ver'        },
  { href: '/dashboard/caja',      label: 'Caja POS',    icon: ShoppingCart,    permiso: 'ventas:crear'      },
  { href: '/dashboard/ventas',    label: 'Ventas',      icon: ShoppingCart,    permiso: 'ventas:ver'        },
  { href: '/dashboard/inventario',label: 'Inventario',  icon: Warehouse,       permiso: 'inventario:ver'    },
  { href: '/dashboard/clientes',  label: 'Clientes',    icon: Users,           permiso: 'clientes:ver'      },
  { href: '/dashboard/reportes',  label: 'Reportes',    icon: BarChart2,       permiso: 'reportes:ver'      },
  { href: '/dashboard/config',    label: 'Configuración',icon: Settings,       permiso: 'config:ver'        },
]

export function SidebarClient({ rol, usuario }: { rol: Rol; usuario: { nombre: string } }) {
  const pathname = usePathname()

  // Filtrar items accesibles por rol
  const items = NAV_ITEMS.filter(item => can(rol, item.permiso))

  return (
    <aside className="w-56 flex flex-col border-r bg-card dark:bg-card h-full">
      <div className="p-4 border-b dark:border-border">
        <span className="font-bold text-sm">Sistema</span>
        <div className="text-xs text-muted-foreground mt-0.5">{usuario.nombre} · {rol}</div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-accent/50'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

---

## KPIs específicos por rol

El endpoint del backend debe devolver solo los datos que el rol puede ver.
**No filtrar en el cliente datos que el servidor no debería haber enviado.**

```
// Patrón recomendado:
// GET /api/dashboard/kpis  →  el backend lee el rol de la sesión y devuelve solo los KPIs permitidos
// El Server Component pasa exactamente lo que llegó — el Client Component solo decide cómo mostrarlos
```

```tsx
// app/dashboard/page.tsx — Server Component: solicita KPIs según sesión del usuario
import { KpisByRole } from '@/components/dashboard/KpisByRole'
import { getSession } from '@/lib/auth/session'

export default async function DashboardPage() {
  const session = await getSession()

  // El backend usa session.rol internamente — devuelve solo los campos permitidos
  const kpiData = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/kpis`, {
    headers: { Authorization: `Bearer ${session?.token}` },
    next: { revalidate: 60 },
  }).then(r => r.json())

  return <KpisByRole data={kpiData} rol={session!.rol} />
}
```

```tsx
// components/dashboard/KpisByRole.tsx — Client Component: solo presentación
'use client'
import { NumberTicker } from '@/components/ui/number-ticker'
import type { Rol } from '@/lib/auth/permissions'

// El backend garantiza que los campos no permitidos vienen null/undefined
type KpiData = {
  ventasHoy?: number        // admin, gerente, vendedor
  stockCritico?: number     // admin, almacenero
  clientesNuevos?: number   // admin
  margenMensual?: number    // admin, gerente
  pendienteEntrega?: number // almacenero
}

// Mapa de KPIs visibles por rol — coincide con lo que el backend devuelve
const KPIS_POR_ROL: Record<Rol, Array<{ label: string; key: keyof KpiData; formato: 'moneda' | 'numero' | 'porcentaje' }>> = {
  admin: [
    { label: 'Ventas hoy',      key: 'ventasHoy',      formato: 'moneda'     },
    { label: 'Margen mensual',  key: 'margenMensual',  formato: 'porcentaje' },
    { label: 'Clientes nuevos', key: 'clientesNuevos', formato: 'numero'     },
    { label: 'Stock crítico',   key: 'stockCritico',   formato: 'numero'     },
  ],
  gerente: [
    { label: 'Ventas hoy',     key: 'ventasHoy',     formato: 'moneda'     },
    { label: 'Margen mensual', key: 'margenMensual', formato: 'porcentaje' },
  ],
  vendedor: [
    { label: 'Mis ventas hoy', key: 'ventasHoy', formato: 'moneda' },
  ],
  almacenero: [
    { label: 'Stock crítico',    key: 'stockCritico',   formato: 'numero' },
    { label: 'Pendiente entrega',key: 'pendienteEntrega',formato: 'numero' },
  ],
}

export function KpisByRole({ data, rol }: { data: KpiData; rol: Rol }) {
  const kpis = KPIS_POR_ROL[rol] ?? KPIS_POR_ROL.vendedor

  function formatValue(value: number | undefined, formato: 'moneda' | 'numero' | 'porcentaje') {
    if (value == null) return '—'
    if (formato === 'moneda') return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
    if (formato === 'porcentaje') return `${value.toFixed(1)}%`
    return new Intl.NumberFormat('es-PE').format(value)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map(kpi => {
        const value = data[kpi.key]
        return (
          <div key={kpi.label} className="rounded-lg border p-4 bg-card dark:bg-card">
            <div className="text-xs text-muted-foreground">{kpi.label}</div>
            <div className="text-2xl font-bold mt-1">
              {typeof value === 'number' && kpi.formato === 'numero'
                ? <NumberTicker value={value} />
                : formatValue(value, kpi.formato)
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

---

## Guards visuales — ocultar columnas y botones

```tsx
// Ejemplo: tabla de ventas con columnas y acciones condicionales por permiso
'use client'
import { useRole } from '@/hooks/useRole'
import { Can } from '@/components/auth/Can'

export function VentasTable({ ventas }: { ventas: Venta[] }) {
  const { can } = useRole()

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Cliente</th>
          {/* Columna "Vendedor" solo para admin/gerente */}
          {can('empleados:ver') && <th>Vendedor</th>}
          <th>Total</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {ventas.map(v => (
          <tr key={v.id}>
            <td>{new Date(v.fecha).toLocaleDateString('es-PE')}</td>
            <td>{v.clienteNombre}</td>
            {can('empleados:ver') && <td>{v.vendedorNombre}</td>}
            <td>{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v.total)}</td>
            <td>
              <div className="flex gap-1">
                <Can permission="ventas:ver">
                  <button className="text-xs underline">Ver</button>
                </Can>
                <Can permission="ventas:anular">
                  <button className="text-xs text-destructive underline">Anular</button>
                </Can>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## Cambio de rol (impersonación para admin)

```tsx
// components/auth/RoleSwitcher.tsx — solo visible para admin
'use client'
import { useRole } from '@/hooks/useRole'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Can } from '@/components/auth/Can'
import type { Rol } from '@/lib/auth/permissions'

export function RoleSwitcher({
  rolActual,
  onCambiar,
}: {
  rolActual: Rol
  onCambiar: (rol: Rol) => void
}) {
  return (
    // Solo admin puede cambiar rol
    <Can permission="config:editar">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Vista de rol:</span>
        <Select value={rolActual} onValueChange={v => onCambiar(v as Rol)}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="gerente">Gerente</SelectItem>
            <SelectItem value="vendedor">Vendedor</SelectItem>
            <SelectItem value="almacenero">Almacenero</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Can>
  )
}
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| Verificar permisos solo en UI | Siempre verificar también en Server Actions / Route Handlers |
| `if (rol === 'admin')` dispersos en componentes | `can(rol, 'permiso:accion')` centralizado en `permissions.ts` |
| Ocultar vía `display:none` elementos sensibles | No renderizar nunca — `<Can>` condiciona el render |
| Roles hardcodeados como strings en componentes | Importar tipo `Rol` de `permissions.ts` |
| `<Button asChild><Link /></Button>` | `<Link className={buttonVariants()} />` |

---

## Quick Reference

```
Permisos        →  lib/auth/permissions.ts — can(rol, permiso) / canAny(rol, permisos[])
Hook cliente    →  useRole() → { rol, can, canAny, isAdmin }
Guard visual    →  <Can permission="X"> o <Can anyOf={[...]}> con fallback opcional
Sidebar         →  items filtrados por can(rol, item.permiso) en NAV_ITEMS
Roles Perú  →  admin | gerente | vendedor | almacenero
KPIs por rol    →  KpisByRole.tsx — diferentes métricas según rol activo
Impersonación   →  RoleSwitcher.tsx — solo visible con permiso config:editar
```
