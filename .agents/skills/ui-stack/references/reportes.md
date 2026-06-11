# Reportes y Análisis — UI Stack

---

## Arquitectura Server/Client

```tsx
// app/dashboard/reportes/page.tsx — Server Component: datos del período
import { ReportesClient } from './ReportesClient'

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; tipo?: string }
}) {
  const desde = searchParams.desde ?? getFirstDayOfMonth()
  const hasta = searchParams.hasta ?? getTodayISO()

  const [ventasData, vendedoresData] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reportes/ventas?desde=${desde}&hasta=${hasta}`, {
      next: { revalidate: 300 },
    }).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reportes/vendedores?desde=${desde}&hasta=${hasta}`, {
      next: { revalidate: 300 },
    }).then(r => r.json()),
  ])

  return <ReportesClient ventas={ventasData} vendedores={vendedoresData} desde={desde} hasta={hasta} />
}

function getFirstDayOfMonth() { return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] }
function getTodayISO() { return new Date().toISOString().split('T')[0] }
```

---

## DateRangePicker

```tsx
// components/reportes/DateRangePicker.tsx
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CalendarRange } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function DateRangePicker({
  desde,
  hasta,
}: {
  desde: string
  hasta: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function aplicar(nuevoDe: string, nuevoHasta: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('desde', nuevoDe)
    params.set('hasta', nuevoHasta)
    router.push(`${pathname}?${params.toString()}`)
  }

  // Accesos rápidos a períodos comunes
  const periodos = [
    { label: 'Hoy', fn: () => { const t = today(); aplicar(t, t) } },
    { label: 'Esta semana', fn: () => aplicar(startOfWeek(), today()) },
    { label: 'Este mes', fn: () => aplicar(startOfMonth(), today()) },
    { label: 'Mes anterior', fn: () => aplicar(startOfPrevMonth(), endOfPrevMonth()) },
    { label: 'Este año', fn: () => aplicar(startOfYear(), today()) },
  ]

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      {/* Atajos de período */}
      <div className="flex flex-wrap gap-1">
        {periodos.map(p => (
          <button
            key={p.label}
            onClick={p.fn}
            className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent transition-colors dark:hover:bg-accent/50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Selector manual */}
      <div className="flex items-center gap-1">
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          defaultValue={desde}
          max={hasta}
          className="h-8 w-36 text-xs"
          onBlur={e => aplicar(e.target.value, hasta)}
        />
        <span className="text-muted-foreground text-xs">—</span>
        <Input
          type="date"
          defaultValue={hasta}
          min={desde}
          className="h-8 w-36 text-xs"
          onBlur={e => aplicar(desde, e.target.value)}
        />
      </div>
    </div>
  )
}

// Helpers de fecha
const today = () => new Date().toISOString().split('T')[0]
const startOfWeek = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0] }
const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const startOfPrevMonth = () => new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]
const endOfPrevMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
const startOfYear = () => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
```

---

## Períodos comparativos con variación

```tsx
// components/reportes/ComparativoKpi.tsx
'use client'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type ComparativoData = {
  label: string
  actual: number
  anterior: number
  formato: 'moneda' | 'numero' | 'porcentaje'
}

function formatValue(v: number, formato: ComparativoData['formato']) {
  if (formato === 'moneda') return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v)
  if (formato === 'porcentaje') return `${v.toFixed(1)}%`
  return new Intl.NumberFormat('es-PE').format(v)
}

export function ComparativoKpi({ data }: { data: ComparativoData[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {data.map(item => {
        const variacion = item.anterior !== 0
          ? ((item.actual - item.anterior) / item.anterior) * 100
          : 0
        const esPositivo = variacion > 0
        const esNeutro = variacion === 0

        return (
          <div key={item.label} className="rounded-lg border p-4 bg-card dark:bg-card">
            <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
            <div className="text-xl font-bold">{formatValue(item.actual, item.formato)}</div>
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              esNeutro    ? 'text-muted-foreground' :
              esPositivo  ? 'text-green-600 dark:text-green-400' :
                            'text-red-600 dark:text-red-400'
            )}>
              {esNeutro ? <Minus className="h-3 w-3" /> :
               esPositivo ? <TrendingUp className="h-3 w-3" /> :
                            <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(variacion).toFixed(1)}% vs período anterior</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

---

## Exportación client-side a Excel

```tsx
// lib/export/excel.ts
// Requiere: npm i xlsx
import * as XLSX from 'xlsx'

type ExportColumn<T> = { header: string; key: keyof T; formatter?: (v: T[keyof T]) => string }

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string
) {
  const rows = data.map(row =>
    Object.fromEntries(columns.map(col => [
      col.header,
      col.formatter ? col.formatter(row[col.key]) : row[col.key],
    ]))
  )

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

// Uso:
// exportToExcel(
//   ventas,
//   [
//     { header: 'Fecha', key: 'fecha', formatter: v => new Date(v as string).toLocaleDateString('es-PE') },
//     { header: 'Cliente', key: 'clienteNombre' },
//     { header: 'Total', key: 'total', formatter: v => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v as number) },
//   ],
//   `ventas-${desde}-${hasta}`
// )
```

---

## Botón de exportar con vista previa

```tsx
// components/reportes/ExportButton.tsx
'use client'
import { useState } from 'react'
import { Download, Eye } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { exportToExcel } from '@/lib/export/excel'

type ExportButtonProps<T extends Record<string, unknown>> = {
  data: T[]
  columns: Array<{ header: string; key: keyof T; formatter?: (v: T[keyof T]) => string }>
  fileName: string
  label?: string
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  fileName,
  label = 'Exportar Excel',
}: ExportButtonProps<T>) {
  const [preview, setPreview] = useState(false)

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setPreview(true)}>
          <Eye className="h-4 w-4 mr-1" />
          Vista previa
        </Button>
        <Button size="sm" onClick={() => exportToExcel(data, columns, fileName)}>
          <Download className="h-4 w-4 mr-1" />
          {label}
        </Button>
      </div>

      {/* Vista previa de los primeros 5 registros */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-lg p-4 max-w-2xl w-full shadow-xl dark:bg-card max-h-[80vh] overflow-auto">
            <h3 className="font-semibold mb-3 text-sm">Vista previa — primeros {Math.min(5, data.length)} registros</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-muted/50 dark:bg-muted/20">
                    {columns.map(c => (
                      <th key={c.header} className="border p-2 text-left">{c.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b">
                      {columns.map(c => (
                        <td key={c.header} className="border p-2">
                          {String(c.formatter ? c.formatter(row[c.key]) : row[c.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setPreview(false)}>Cerrar</Button>
              <Button size="sm" onClick={() => { exportToExcel(data, columns, fileName); setPreview(false) }}>
                <Download className="h-4 w-4 mr-1" />
                Descargar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

---

## Reportes predefinidos

```tsx
// components/reportes/ReportesPredefinidos.tsx
'use client'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { BarChart2, Users, Package, AlertTriangle } from 'lucide-react'

const REPORTES = [
  {
    id: 'ventas-diarias',
    label: 'Ventas diarias',
    desc: 'Totales por día en el período',
    icon: BarChart2,
    href: '/dashboard/reportes/ventas-diarias',
  },
  {
    id: 'ventas-vendedor',
    label: 'Ventas por vendedor',
    desc: 'Comparativo de rendimiento',
    icon: Users,
    href: '/dashboard/reportes/ventas-vendedor',
  },
  {
    id: 'top-productos',
    label: 'Productos más vendidos',
    desc: 'Ranking por unidades y monto',
    icon: Package,
    href: '/dashboard/reportes/top-productos',
  },
  {
    id: 'stock-critico',
    label: 'Stock crítico',
    desc: 'Productos bajo mínimo o agotados',
    icon: AlertTriangle,
    href: '/dashboard/reportes/stock-critico',
  },
]

export function ReportesPredefinidos() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {REPORTES.map(r => {
        const Icon = r.icon
        return (
          <Link
            key={r.id}
            href={r.href}
            className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-accent transition-colors dark:hover:bg-accent/50 group"
          >
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div>
              <div className="font-medium text-sm">{r.label}</div>
              <div className="text-xs text-muted-foreground">{r.desc}</div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` |
| Hex hardcodeados en indicadores de variación | `text-green-600 dark:text-green-400` semántico |
| Exportar a Excel con `window.open` o iframes | `xlsx` client-side — `XLSX.writeFile()` |
| Cargar librería xlsx siempre | `dynamic(() => import('xlsx'))` bajo demanda |
| Filtros de fecha en Context global | URL search params — shareable y SSR-friendly |
| Variación % calculada en render | Calcular antes de pasar al componente |

---

## Quick Reference

```
DateRangePicker →  URL search params desde/hasta — router.push con params
Comparativo     →  ComparativoKpi.tsx — variación % con flecha verde/rojo
Exportar Excel  →  lib/export/excel.ts + npm i xlsx (solo instalar si se usa)
Vista previa    →  ExportButton.tsx — primeros 5 registros antes de descargar
Predefinidos    →  ventas-diarias | ventas-vendedor | top-productos | stock-critico
Moneda          →  Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
Períodos rápidos→  Hoy | Esta semana | Este mes | Mes anterior | Este año
```
