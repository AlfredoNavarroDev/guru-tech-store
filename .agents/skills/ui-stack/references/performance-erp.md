# Performance Sistema — UI Stack

---

## Code splitting por módulo

```tsx
// app/dashboard/layout.tsx — lazy load de módulos pesados
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Módulos pesados — cargar solo cuando se navega a ellos
const VentasModule = dynamic(
  () => import('@/components/ventas/VentasModule').then(m => m.VentasModule),
  { loading: () => <ModuleSkeleton /> }
)

const CatalogoModule = dynamic(
  () => import('@/components/catalogo/CatalogoModule').then(m => m.CatalogoModule),
  { loading: () => <ModuleSkeleton /> }
)

const ReportesModule = dynamic(
  () => import('@/components/reportes/ReportesModule').then(m => m.ReportesModule),
  { loading: () => <ModuleSkeleton /> }
)

function ModuleSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
```

---

## Prefetching al hover sobre links del sidebar

```tsx
// components/layout/SidebarLink.tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function SidebarLink({
  href,
  children,
  isActive,
  className,
}: {
  href: string
  children: React.ReactNode
  isActive: boolean
  className?: string
}) {
  const router = useRouter()

  return (
    <Link
      href={href}
      onMouseEnter={() => router.prefetch(href)} // Prefetch al hover
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-accent/50',
        className
      )}
    >
      {children}
    </Link>
  )
}
```

---

## Memoización — cuándo y cómo

```tsx
// Regla: memoizar cálculos costosos, no renders triviales

// ✅ useMemo para cálculos derivados (totales, filtros, rankings)
const totals = useMemo(
  () => calcularTotales(cart.items, cart.descuentoGlobal, cart.montoRecibido),
  [cart.items, cart.descuentoGlobal, cart.montoRecibido]
)

const igv = useMemo(
  () => subtotal * 0.18,
  [subtotal]
)

const comision = useMemo(
  () => ventas.reduce((acc, v) => acc + v.total * 0.03, 0),
  [ventas]
)

// ✅ React.memo para filas de tablas con datos estables
const VentaRow = React.memo(function VentaRow({ venta }: { venta: Venta }) {
  return <tr>{/* ... */}</tr>
}, (prev, next) => prev.venta.id === next.venta.id && prev.venta.estado === next.venta.estado)

// ✅ useCallback para handlers pasados como props
const handleEstadoChange = useCallback(
  (id: string, estado: EstadoVenta) => {
    dispatch({ type: 'CAMBIAR_ESTADO', id, estado })
  },
  [dispatch] // dispatch es estable — no re-crear el handler
)

// ❌ NO memoizar renders triviales — el overhead supera el beneficio
// const label = useMemo(() => `Hola ${nombre}`, [nombre]) // innecesario
// const Button = React.memo(() => <button>...</button>)    // innecesario
```

---

## Charts bajo demanda con IntersectionObserver

```tsx
// components/charts/LazyChart.tsx
'use client'
import { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Recharts solo se importa cuando el chart entra en viewport
const BarChartRecharts = dynamic(
  () => import('recharts').then(m => m.BarChart),
  { ssr: false }
)
const ResponsiveContainerRecharts = dynamic(
  () => import('recharts').then(m => m.ResponsiveContainer),
  { ssr: false }
)

export function LazyBarChart({
  data,
  height = 300,
}: {
  data: unknown[]
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect() // Una vez visible, no volver a observar
        }
      },
      { rootMargin: '100px' } // Cargar 100px antes de que entre en viewport
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    // div con altura explícita — ResponsiveContainer necesita un padre con height definido
    <div ref={ref} style={{ height }} className="w-full">
      {inView ? (
        // ResponsiveContainer adapta el chart al ancho del contenedor — NUNCA width fijo
        <ResponsiveContainerRecharts width="100%" height="100%">
          <BarChartRecharts data={data}>
            {/* configuración del chart — ver references/charts.md */}
          </BarChartRecharts>
        </ResponsiveContainerRecharts>
      ) : (
        <Skeleton className="w-full h-full rounded-lg" />
      )}
    </div>
  )
}
```

---

## Imágenes optimizadas de productos

```tsx
// components/catalogo/ProductImage.tsx
import Image from 'next/image'

export function ProductImage({
  src,
  nombre,
  size = 'thumbnail',
}: {
  src?: string | null
  nombre: string
  size?: 'thumbnail' | 'card' | 'detail'
}) {
  const sizeMap = {
    thumbnail: { width: 64,  height: 64,  sizes: '64px' },
    card:      { width: 200, height: 200, sizes: '(max-width: 640px) 50vw, 200px' },
    detail:    { width: 400, height: 400, sizes: '(max-width: 768px) 100vw, 400px' },
  }

  const { width, height, sizes } = sizeMap[size]

  if (!src) {
    return (
      <div
        className="bg-muted flex items-center justify-center rounded text-muted-foreground text-xs"
        style={{ width, height }}
      >
        Sin imagen
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={nombre}
      width={width}
      height={height}
      sizes={sizes}
      placeholder="blur"
      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      className="object-cover rounded"
    />
  )
}
```

---

## Bundle size — imports selectivos

```tsx
// ✅ CORRECTO — imports selectivos de lucide-react
import { Search, Plus, Trash2, ChevronDown, Loader2 } from 'lucide-react'

// ❌ NUNCA — import del barrel completo
// import * as Icons from 'lucide-react'

// ✅ CORRECTO — imports selectivos de Recharts
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ❌ NUNCA — import * de Recharts (enorme)
// import * as Recharts from 'recharts'

// ✅ CORRECTO — date-fns selectivo
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'

// ❌ NUNCA — import del objeto completo
// import dateFns from 'date-fns'
```

---

## Paginación server-side

```tsx
// app/dashboard/ventas/page.tsx — paginación server-side en URL
export default async function VentasPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const pageSize = parseInt(searchParams.pageSize ?? '20')

  const { data, total } = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/ventas?page=${page}&pageSize=${pageSize}`,
    { next: { revalidate: 60 } }
  ).then(r => r.json())

  return <VentasTable data={data} total={total} page={page} pageSize={pageSize} />
}
```

```tsx
// components/common/Pagination.tsx
'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number
  pageSize: number
  total: number
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / pageSize)

  function buildUrl(newPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex gap-1">
        <Link
          href={buildUrl(page - 1)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            page === 1 && 'pointer-events-none opacity-40'
          )}
          aria-disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={buildUrl(page + 1)}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            page === totalPages && 'pointer-events-none opacity-40'
          )}
          aria-disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
```

---

## Streaming SSR — Suspense por sección del dashboard

```tsx
// app/dashboard/page.tsx — KPIs primero, charts después
import { Suspense } from 'react'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { VentasChart } from '@/components/dashboard/VentasChart'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4">
      {/* KPIs: carga rápida — sin Suspense, datos simples */}
      <Suspense fallback={<KpiSkeleton />}>
        <KpiCards />
      </Suspense>

      {/* Charts: carga lenta — stream independiente */}
      <Suspense fallback={<ChartSkeleton />}>
        <VentasChart />
      </Suspense>

      {/* Tabla: carga después — no bloquea KPIs ni charts */}
      <Suspense fallback={<TableSkeleton />}>
        <UltimasVentas />
      </Suspense>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
```

---

## CSS sobre JS — animaciones Tailwind para micro-interactions

```tsx
// ✅ Tailwind para micro-interactions (más performant que motion/react)
<button className="hover:scale-105 active:scale-95 transition-transform duration-150">
  Guardar
</button>

<div className="animate-pulse bg-muted rounded-lg h-8" /> {/* Skeleton */}

<div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" /> {/* Spinner */}

// ✅ motion/react para animaciones complejas que Tailwind no puede
// - AnimatePresence (entrada/salida de elementos del DOM)
// - Drag and drop
// - Animaciones con keyframes complejos
// - Transiciones coordinadas entre componentes

// ❌ NO usar motion/react para:
<motion.button whileHover={{ scale: 1.05 }}>  {/* Usar Tailwind hover:scale-105 */}
<motion.div animate={{ opacity: isLoading ? 0.5 : 1 }}>  {/* Usar conditional class opacity-50 */}
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| `import * as Icons from 'lucide-react'` | Imports selectivos: `import { X, Plus } from 'lucide-react'` |
| Virtual scrolling | Paginación server-side con URL params |
| Cargar Recharts en el bundle principal | `dynamic(() => import('recharts'))` + IntersectionObserver |
| `<img src={url}>` para fotos de productos | `next/image` con `placeholder="blur"` y `sizes` |
| `revalidate: 0` en toda la app | Tags granulares con `revalidateTag` por entidad |
| motion/react para `hover:scale` | Tailwind `hover:scale-105 transition-transform` |
| Un solo Suspense en `<body>` | Suspense boundaries por sección del dashboard |

---

## Quick Reference

```
Code splitting  →  dynamic(() => import(...), { loading: <Skeleton /> }) por módulo
Prefetch        →  onMouseEnter={() => router.prefetch(href)} en links del sidebar
useMemo         →  totales, IGV, comisiones, filtros computados — NO renders triviales
React.memo      →  filas de tabla con comparador custom — solo si el profile lo justifica
Charts lazy     →  IntersectionObserver + dynamic import — cargar solo cuando en viewport
Imágenes        →  next/image con placeholder="blur" + sizes correctos por contexto
Imports         →  siempre selectivos — lucide, recharts, date-fns
Paginación      →  server-side con URL params page + pageSize — NO virtual scrolling
Streaming SSR   →  Suspense por sección: KPIs → charts → tabla
Micro-animations→  Tailwind animate-* y hover:scale-* — motion/react solo para AnimatePresence y drag
```
