# Inventario y Stock — UI Stack

---

## Arquitectura Server/Client

```tsx
// app/dashboard/inventario/page.tsx — Server Component: carga stock inicial
import { InventarioClient } from './InventarioClient'

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: { almacenId?: string }
}) {
  const almacenId = searchParams.almacenId ?? 'principal'
  const [stock, almacenes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/inventario?almacenId=${almacenId}`, {
      next: { revalidate: 30 },
    }).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/almacenes`, {
      next: { revalidate: 600 },
    }).then(r => r.json()),
  ])

  return <InventarioClient stock={stock} almacenes={almacenes} almacenIdInicial={almacenId} />
}
```

---

## Tipos de datos

```tsx
// types/inventario.ts
type NivelStock = 'normal' | 'bajo' | 'agotado'

type StockItem = {
  productoId: string
  nombre: string
  sku: string
  stockActual: number
  stockMinimo: number
  almacenId: string
  almacenNombre: string
  ultimoMovimiento: string // ISO date
}

type MovimientoInventario = {
  id: string
  productoId: string
  productoNombre: string
  tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia'
  cantidad: number // positivo = entrada, negativo = salida
  almacenOrigen?: string
  almacenDestino?: string
  fecha: string
  motivo: string
  usuarioNombre: string
}

function getNivelStock(item: StockItem): NivelStock {
  if (item.stockActual === 0) return 'agotado'
  if (item.stockActual <= item.stockMinimo) return 'bajo'
  return 'normal'
}
```

---

## Badges de nivel de stock

```tsx
// components/inventario/StockBadge.tsx
import { cn } from '@/lib/utils'
import type { NivelStock } from '@/types/inventario'

const stockConfig: Record<NivelStock, { label: string; classes: string }> = {
  normal:  { label: 'Normal',  classes: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  bajo:    { label: 'Stock bajo', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  agotado: { label: 'Agotado', classes: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

export function StockBadge({ nivel }: { nivel: NivelStock }) {
  const { label, classes } = stockConfig[nivel]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', classes)}>
      {label}
    </span>
  )
}
```

---

## Selector de almacén global

```tsx
// components/inventario/AlmacenSelector.tsx
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Warehouse } from 'lucide-react'

type Almacen = { id: string; nombre: string }

export function AlmacenSelector({
  almacenes,
  almacenActual,
}: {
  almacenes: Almacen[]
  almacenActual: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(almacenId: string) {
    // Actualizar URL search params — mantiene otros params intactos
    const params = new URLSearchParams(searchParams.toString())
    params.set('almacenId', almacenId)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Warehouse className="h-4 w-4 text-muted-foreground" />
      <Select value={almacenActual} onValueChange={handleChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Seleccionar almacén" />
        </SelectTrigger>
        <SelectContent>
          {almacenes.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

---

## Vista de stock actual con alertas

```tsx
// components/inventario/StockTable.tsx
'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { StockBadge } from './StockBadge'
import { getNivelStock } from '@/types/inventario'
import { cn } from '@/lib/utils'

export function StockTable({ items }: { items: StockItem[] }) {
  const [soloAlertas, setSoloAlertas] = useState(false)

  const filtered = useMemo(
    () => soloAlertas ? items.filter(i => getNivelStock(i) !== 'normal') : items,
    [items, soloAlertas]
  )

  const alertCount = items.filter(i => getNivelStock(i) !== 'normal').length

  return (
    <div className="space-y-3">
      {/* Filtro rápido de alertas */}
      {alertCount > 0 && (
        <button
          onClick={() => setSoloAlertas(v => !v)}
          className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
            soloAlertas
              ? 'bg-yellow-100 border-yellow-400 text-yellow-900 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-200'
              : 'hover:bg-accent dark:hover:bg-accent/50'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          {alertCount} productos con alerta
        </button>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 dark:bg-muted/20">
              <th className="text-left p-3 font-medium">Producto</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">SKU</th>
              <th className="text-right p-3 font-medium">Stock actual</th>
              <th className="text-right p-3 font-medium hidden md:table-cell">Stock mínimo</th>
              <th className="text-center p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const nivel = getNivelStock(item)
              return (
                <tr
                  key={item.productoId}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/30',
                    nivel === 'agotado' && 'bg-red-50/50 dark:bg-red-950/20',
                    nivel === 'bajo' && 'bg-yellow-50/50 dark:bg-yellow-950/20'
                  )}
                >
                  <td className="p-3 font-medium">{item.nombre}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{item.sku}</td>
                  <td className="p-3 text-right font-mono">{item.stockActual}</td>
                  <td className="p-3 text-right text-muted-foreground font-mono hidden md:table-cell">
                    {item.stockMinimo}
                  </td>
                  <td className="p-3 text-center">
                    <StockBadge nivel={nivel} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## Registrar movimiento de inventario

```tsx
// components/inventario/MovimientoForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export function MovimientoForm({
  productoId,
  productoNombre,
  stockActual,
  almacenId,
}: {
  productoId: string
  productoNombre: string
  stockActual: number
  almacenId: string
}) {
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoMovimiento>('entrada')
  const [cantidad, setCantidad] = useState(1)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId, almacenId, tipo, cantidad, motivo }),
      })
      toast.success(`Movimiento registrado: ${tipo} de ${cantidad} unidades`)
      router.refresh() // Revalida Server Component
    } catch {
      toast.error('Error al registrar movimiento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{productoNombre}</span>
        <span className="text-muted-foreground">— Stock actual: {stockActual}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Tipo</label>
          <Select value={tipo} onValueChange={v => setTipo(v as TipoMovimiento)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada (compra)</SelectItem>
              <SelectItem value="salida">Salida manual</SelectItem>
              <SelectItem value="ajuste">Ajuste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Cantidad</label>
          <Input
            type="number"
            min={1}
            value={cantidad}
            onChange={e => setCantidad(Number(e.target.value))}
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Motivo</label>
        <Input
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Ej. Compra OC-123, merma, corrección conteo"
          className="h-9"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Registrando…' : 'Registrar movimiento'}
      </Button>
    </form>
  )
}
```

---

## Historial de movimientos — tabla con filtros

```tsx
// components/inventario/MovimientosHistorial.tsx
'use client'
import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import type { MovimientoInventario } from '@/types/inventario'

const TIPO_ICON = {
  entrada: { icon: ArrowDownCircle, classes: 'text-green-600 dark:text-green-400' },
  salida:  { icon: ArrowUpCircle,   classes: 'text-red-600 dark:text-red-400' },
  ajuste:  { icon: RefreshCw,       classes: 'text-blue-600 dark:text-blue-400' },
  transferencia: { icon: RefreshCw, classes: 'text-purple-600 dark:text-purple-400' },
}

export function MovimientosHistorial({ movimientos }: { movimientos: MovimientoInventario[] }) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')

  const filtered = movimientos.filter(m => {
    if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
    if (filtroFechaDesde && m.fecha < filtroFechaDesde) return false
    return true
  })

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="h-9 rounded-md border px-2 text-sm bg-background"
        >
          <option value="todos">Todos los tipos</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
          <option value="ajuste">Ajustes</option>
          <option value="transferencia">Transferencias</option>
        </select>
        <Input
          type="date"
          value={filtroFechaDesde}
          onChange={e => setFiltroFechaDesde(e.target.value)}
          className="h-9 w-auto"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 dark:bg-muted/20">
              <th className="text-left p-3 font-medium">Producto</th>
              <th className="text-left p-3 font-medium">Tipo</th>
              <th className="text-right p-3 font-medium">Cantidad</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Motivo</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const { icon: Icon, classes } = TIPO_ICON[m.tipo] ?? TIPO_ICON.ajuste
              return (
                <tr key={m.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{m.productoNombre}</td>
                  <td className="p-3">
                    <span className={cn('flex items-center gap-1', classes)}>
                      <Icon className="h-4 w-4" />
                      <span className="capitalize">{m.tipo}</span>
                    </span>
                  </td>
                  <td className={cn('p-3 text-right font-mono font-medium', m.cantidad > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                    {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{m.motivo}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">
                    {new Date(m.fecha).toLocaleDateString('es-PE')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## Conteo físico — comparar vs sistema

```tsx
// components/inventario/ConteoFisico.tsx
'use client'
import { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ConteoItem = { productoId: string; nombre: string; sku: string; stockSistema: number; conteoFisico?: number }

export function ConteoFisico({ items }: { items: Omit<ConteoItem, 'conteoFisico'>[] }) {
  const [conteos, setConteos] = useState<Record<string, number>>({})

  const itemsConDiff = items.map(i => ({
    ...i,
    conteoFisico: conteos[i.productoId],
    diferencia: conteos[i.productoId] != null ? conteos[i.productoId] - i.stockSistema : null,
  }))

  const hasDiff = itemsConDiff.some(i => i.diferencia !== null && i.diferencia !== 0)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 dark:bg-muted/20">
              <th className="text-left p-3 font-medium">Producto</th>
              <th className="text-right p-3 font-medium">Sistema</th>
              <th className="text-center p-3 font-medium">Conteo físico</th>
              <th className="text-right p-3 font-medium">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {itemsConDiff.map(item => (
              <tr
                key={item.productoId}
                className={cn(
                  'border-b transition-colors',
                  item.diferencia !== null && item.diferencia !== 0
                    ? 'bg-yellow-50/50 dark:bg-yellow-950/20'
                    : 'hover:bg-muted/30'
                )}
              >
                <td className="p-3">
                  <div className="font-medium">{item.nombre}</div>
                  <div className="text-xs text-muted-foreground">{item.sku}</div>
                </td>
                <td className="p-3 text-right font-mono">{item.stockSistema}</td>
                <td className="p-3 text-center">
                  <Input
                    type="number"
                    min={0}
                    value={conteos[item.productoId] ?? ''}
                    onChange={e => setConteos(prev => ({ ...prev, [item.productoId]: Number(e.target.value) }))}
                    className="w-24 h-8 text-center mx-auto"
                    placeholder="—"
                  />
                </td>
                <td className="p-3 text-right font-mono">
                  {item.diferencia !== null ? (
                    <span className={cn(
                      'flex items-center justify-end gap-1',
                      item.diferencia === 0 ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
                    )}>
                      {item.diferencia === 0
                        ? <CheckCircle2 className="h-4 w-4" />
                        : <AlertCircle className="h-4 w-4" />
                      }
                      {item.diferencia > 0 ? '+' : ''}{item.diferencia}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasDiff && (
        <Button className="w-full sm:w-auto">
          Aplicar ajustes de inventario ({itemsConDiff.filter(i => i.diferencia !== 0 && i.diferencia !== null).length})
        </Button>
      )}
    </div>
  )
}
```

---

## Optimistic update tras venta

```tsx
// Patrón: actualizar stock visualmente antes de confirmación del servidor
'use client'
import { useOptimistic } from 'react'

export function StockOptimisticRow({
  item,
  onVenta,
}: {
  item: StockItem
  onVenta: (cantidad: number) => Promise<void>
}) {
  const [optimisticStock, setOptimisticStock] = useOptimistic(
    item.stockActual,
    (current: number, cantidadVendida: number) => current - cantidadVendida
  )

  async function handleVenta(cantidad: number) {
    setOptimisticStock(cantidad) // Actualiza UI inmediatamente
    await onVenta(cantidad)      // Confirma en servidor
  }

  return (
    <span className="font-mono">{optimisticStock}</span>
  )
}
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| Calcular nivel de stock en el render | `getNivelStock(item)` — función pura importada |
| Colores hex en badges | Clases semánticas `bg-green-100 dark:bg-green-900/40` |
| Re-fetch manual tras movimiento | `router.refresh()` — revalida Server Component |
| Almacén en Context global pesado | URL search params `?almacenId=X` — shareable y SSR-friendly |
| Virtual scrolling para tablas Sistema | Paginación server-side |

---

## Quick Reference

```
Nivel stock     →  getNivelStock(item): 'normal' | 'bajo' | 'agotado'
StockBadge      →  components/inventario/StockBadge.tsx
Almacén global  →  URL search param almacenId — cambiar con router.push
Movimientos     →  POST /api/inventario/movimientos + router.refresh()
Conteo físico   →  ConteoFisico.tsx — diff sistema vs conteo, luego ajuste masivo
Optimistic      →  useOptimistic(stockActual, (current, vendido) => current - vendido)
Alertas         →  filtrar items donde getNivelStock !== 'normal'
```
