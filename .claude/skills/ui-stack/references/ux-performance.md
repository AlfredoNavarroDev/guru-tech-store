# UX & Performance — UI Stack

---

## Patrones de Sistema

### Formateo de moneda y números (locale peruano)

```ts
// Moneda → S/ 1,234.56
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)

// Número → 1,234
const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-PE').format(value)

// Porcentaje → 12.5%
const formatPercent = (value: number) =>
  new Intl.NumberFormat('es-PE', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100)

// Fecha → 29/05/2026
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)

// Fecha larga → jueves, 29 de mayo de 2026
const formatDateLong = (date: Date) =>
  new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
```

### Badges de estado Sistema

```tsx
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        pagado:       'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        pendiente:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        cancelado:    'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        procesando:   'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        devuelto:     'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        sinStock:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      },
    },
  }
)

export function Badge({ variant, className, children }: {
  variant: keyof typeof badgeVariants
  className?: string
  children: React.ReactNode
}) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>
}
```

### Tabla de datos estándar

```tsx
'use client'
import { useState } from 'react'

interface Column<T> {
  key: keyof T
  header: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
  sortable?: boolean
}

export function DataTable<T extends { id: string }>({
  data, columns, onRowClick,
}: {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
}) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  function handleSort(key: keyof T) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-3 text-left font-medium text-muted-foreground',
                  col.sortable && 'cursor-pointer hover:text-foreground select-none'
                )}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                {col.header}
                {col.sortable && sortKey === col.key && (
                  <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map(row => (
            <tr
              key={row.id}
              className={cn(
                'hover:bg-muted/30 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td key={String(col.key)} className="px-4 py-3">
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                No hay datos para mostrar
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

### Paginación

```tsx
export function Pagination({ page, total, pageSize, onPage }: {
  page: number; total: number; pageSize: number; onPage: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between text-sm mt-4">
      <span className="text-muted-foreground">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {formatNumber(total)}
      </span>
      <div className="flex gap-1">
        <button
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >Anterior</button>
        <button
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
        >Siguiente</button>
      </div>
    </div>
  )
}
```

---

## Accesibilidad — Reglas críticas para web del sistema

### Contraste mínimo

- Texto normal vs fondo: **4.5:1** mínimo (WCAG AA)
- Texto grande (18px+): **3:1** mínimo
- Elementos interactivos vs fondo: **3:1** mínimo
- Tokens shadcn cumplen estos ratios — hardcodear hex puede romperlos

### Foco y teclado

```tsx
// Siempre visible — no eliminar outline
// En globals.css ya está configurado: * { @apply outline-ring/50 }

// Tab order coherente con orden visual
// Formularios: Tab avanza de campo a campo en orden lógico

// Botones con solo ícono: incluir texto accesible
<button aria-label="Eliminar venta">
  <Trash2 className="h-4 w-4" />
</button>
```

### ARIA en componentes interactivos

```tsx
// Tabla sorteable
<th aria-sort={sortKey === 'nombre' ? sortDir === 'asc' ? 'ascending' : 'descending' : 'none'}>

// Estado de carga
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <SkeletonCards /> : <DataTable data={data} />}
</div>

// Errores de formulario — FormMessage de shadcn ya usa role="alert"
// No agregar role="alert" manual si ya se usa FormMessage

// Modal — trap focus
// shadcn Dialog usa @radix-ui que ya maneja focus trap automáticamente
// Para modales propios con motion, agregar manualmente:
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
```

### Color no es el único indicador

```tsx
// ❌ Solo color
<span className="text-red-600">Error</span>

// ✅ Color + ícono + texto
<span className="flex items-center gap-1 text-red-600">
  <AlertCircle className="h-3.5 w-3.5" />
  Error al procesar el pago
</span>
```

### Imágenes y medios

```tsx
// Imágenes decorativas — alt vacío
<Image src="/hero.png" alt="" width={400} height={300} />

// Imágenes con contenido — alt descriptivo
<Image src={producto.imagen} alt={`Foto de ${producto.nombre}`} width={80} height={80} />
```

---

## Performance — Next.js 16 App Router

### Regla fundamental: Server Components por defecto

```tsx
// ✅ Server Component — no 'use client', puede ser async
// app/dashboard/ventas/page.tsx
export default async function VentasPage() {
  const ventas = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ventas`, {
    next: { revalidate: 60 },
  }).then(r => r.json())
  return <VentasTable ventas={ventas} />
}

// ✅ Client Component — solo cuando hay estado, eventos, o animaciones
// app/dashboard/ventas/VentasTable.tsx
'use client'
export function VentasTable({ ventas }: { ventas: Venta[] }) {
  const [filter, setFilter] = useState('')
  // ...
}
```

### Data fetching con cache

```tsx
// Revalidar cada N segundos
await fetch(url, { next: { revalidate: 60 } })

// Sin cache — datos siempre frescos (tiempo real)
await fetch(url, { cache: 'no-store' })

// Cache estático — no cambia nunca
await fetch(url, { cache: 'force-cache' })

// Revalidar por tag (útil con Server Actions)
await fetch(url, { next: { tags: ['ventas'] } })
// después en una Server Action:
// revalidateTag('ventas')
```

### Lazy loading de componentes pesados

```tsx
import dynamic from 'next/dynamic'

// Componentes con gráficos, editores, mapas
const Chart = dynamic(() => import('@/components/Chart'), {
  loading: () => <div className="h-64 animate-pulse bg-muted rounded-lg" />,
  ssr: false, // para componentes que usan APIs del browser
})

// Magic UI components con animaciones (ya son Client Components)
// No necesitan dynamic() — next.js los optimiza automáticamente
```

### Imágenes optimizadas

```tsx
import Image from 'next/image'

// Siempre width/height o fill — previene CLS
<Image
  src={producto.imagenUrl}
  alt={producto.nombre}
  width={80}
  height={80}
  className="rounded object-cover"
/>

// Imagen a pantalla completa
<div className="relative h-48">
  <Image src={url} alt={alt} fill className="object-cover" />
</div>
```

### Evitar renders innecesarios

```tsx
// Memoizar componentes de tabla costosos
import { memo } from 'react'
const TableRow = memo(({ venta }: { venta: Venta }) => (
  <tr>{/* ... */}</tr>
))

// useCallback para handlers que pasan a hijos
const handleDelete = useCallback((id: string) => {
  deleteVenta(id)
}, [])
```

### Tipado de variables de entorno

```ts
// No usar process.env directamente en Client Components
// ✅ Variables con NEXT_PUBLIC_ están disponibles en cliente
const apiUrl = process.env.NEXT_PUBLIC_API_URL

// ✅ Variables sin NEXT_PUBLIC_ solo en Server Components/Server Actions
// En Client Components acceder vía API route o pasado como prop desde Server Component
```

---

## Navegación del Dashboard

### Sidebar navegación activa

```tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/dashboard/catalogo', label: 'Catálogo', icon: Package },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-primary-lime text-bg-dark'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

### Breadcrumbs

```tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const labels: Record<string, string> = {
  dashboard: 'Dashboard',
  ventas: 'Ventas',
  catalogo: 'Catálogo',
  clientes: 'Clientes',
  nueva: 'Nueva',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        const label = labels[seg] ?? seg

        return (
          <span key={href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {isLast
              ? <span className="text-foreground font-medium">{label}</span>
              : <Link href={href} className="hover:text-foreground transition-colors">{label}</Link>}
          </span>
        )
      })}
    </nav>
  )
}
```

---

## Estados vacíos

Siempre proveer un estado vacío con mensaje y acción cuando no hay datos:

```tsx
export function EmptyState({ message, action }: {
  message: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
      {action && (
        <button
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// Uso
<EmptyState
  message="No hay ventas registradas este día"
  action={{ label: 'Nueva venta', onClick: () => router.push('/dashboard/ventas/nueva') }}
/>
```

---

## Confirmación antes de acciones destructivas

```tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'

export function DeleteButton({ onDelete, label }: {
  onDelete: () => Promise<void>
  label: string
}) {
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000) // reset tras 3s
      return
    }
    await toast.promise(onDelete(), {
      loading: 'Eliminando…',
      success: `${label} eliminado`,
      error: 'Error al eliminar',
    })
    setConfirming(false)
  }

  return (
    <button
      onClick={handleDelete}
      className={cn(
        buttonVariants({ variant: confirming ? 'destructive' : 'ghost', size: 'sm' })
      )}
    >
      {confirming ? '¿Confirmar?' : 'Eliminar'}
    </button>
  )
}
```

---

## Responsive del Dashboard

Sistema es principalmente desktop. Target: funcional en tablet (768px+), tolerable en móvil (375px+).

### Breakpoints

| Token | px | Dispositivo |
|-------|----|-------------|
| `sm`  | 640px | Móvil landscape / tablet pequeña |
| `md`  | 768px | Tablet portrait |
| `lg`  | 1024px | Desktop pequeño |
| `xl`  | 1280px | Desktop estándar |

### Layout principal

```tsx
// Shell del dashboard
<div className="flex h-screen overflow-hidden">
  {/* Sidebar: oculto en móvil, visible md+ */}
  <aside className="hidden md:flex md:flex-col md:w-64 shrink-0 border-r">
    <Sidebar />
  </aside>

  <div className="flex flex-col flex-1 overflow-hidden">
    {/* Header: muestra hamburger en móvil */}
    <header className="flex items-center gap-3 h-14 border-b px-4">
      <MobileMenuButton className="md:hidden" />
      <h1 className="text-sm font-semibold md:text-base">Dashboard</h1>
    </header>

    {/* Contenido */}
    <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI cards */}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* charts */}
      </div>
    </main>
  </div>
</div>
```

### Navegación móvil — Sheet lateral

```tsx
'use client'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-md hover:bg-muted"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />
            {/* Sheet */}
            <motion.aside
              key="nav"
              className="fixed left-0 top-0 h-full w-64 bg-card shadow-xl z-50 md:hidden overflow-y-auto"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {children}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

### Tabla — scroll horizontal en móvil

```tsx
<div className="overflow-x-auto rounded-lg border">
  <table className="w-full min-w-[640px] text-sm">
    {/* thead, tbody */}
  </table>
</div>
```

Para tablets, mostrar columnas prioritarias y ocultar las secundarias:

```tsx
<th className="hidden lg:table-cell">Fecha creación</th>  {/* solo desktop */}
<th className="hidden md:table-cell">Vendedor</th>         {/* tablet+ */}
<th>Cliente</th>                                           {/* siempre visible */}
<th>Total</th>                                             {/* siempre visible */}
```

### Typography responsive

```tsx
{/* Títulos de sección */}
<h2 className="text-base font-semibold md:text-lg lg:text-xl">Ventas del mes</h2>

{/* KPI value */}
<p className="text-2xl font-bold md:text-3xl lg:text-4xl">S/ 12,450</p>

{/* Body / descripción */}
<p className="text-xs text-muted-foreground md:text-sm">Actualizado hace 5 min</p>
```

### Botones / acciones en móvil

```tsx
{/* Icon-only en móvil, texto completo en desktop */}
<button className="flex items-center gap-2">
  <Plus className="h-4 w-4" />
  <span className="hidden sm:inline">Nueva venta</span>
</button>

{/* Acción flotante en móvil (FAB) */}
<button className="fixed bottom-4 right-4 z-30 sm:hidden
                   flex items-center justify-center w-14 h-14
                   rounded-full bg-primary text-primary-foreground shadow-lg">
  <Plus className="h-6 w-6" />
</button>

{/* Grupo de acciones: stack vertical en móvil, row en desktop */}
<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
  <Button variant="outline" size="sm">Exportar</Button>
  <Button size="sm">Nueva venta</Button>
</div>
```

### Padding y spacing responsive

```tsx
// Secciones
<section className="space-y-4 md:space-y-6">

// Cards
<div className="p-4 md:p-6 rounded-xl border bg-card">

// Page header
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
  <h1 className="text-lg font-bold md:text-xl">Ventas</h1>
  <div className="flex gap-2">{/* acciones */}</div>
</div>
```
