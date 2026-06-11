# Operaciones Masivas — UI Stack

---

## Estado de selección múltiple

```tsx
// hooks/useTableSelection.ts
'use client'
import { useState, useCallback } from 'react'

export function useTableSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected(prev =>
      prev.size === items.length ? new Set() : new Set(items.map(i => i.id))
    )
  }, [items])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  return {
    selected,
    toggle,
    toggleAll,
    clearSelection,
    isSelected: (id: string) => selected.has(id),
    isAllSelected: selected.size === items.length && items.length > 0,
    isPartialSelected: selected.size > 0 && selected.size < items.length,
    count: selected.size,
    selectedIds: Array.from(selected),
  }
}
```

---

## Tabla con checkboxes de selección

```tsx
// components/bulk/SelectableTable.tsx
'use client'
import { useTableSelection } from '@/hooks/useTableSelection'
import { BulkActionToolbar } from './BulkActionToolbar'
import { cn } from '@/lib/utils'

type Item = { id: string; nombre: string; precio: number; categoria: string; estado: string }

export function SelectableTable({ items }: { items: Item[] }) {
  const selection = useTableSelection(items)

  return (
    <div className="space-y-2">
      {/* Toolbar masivo — aparece solo al seleccionar */}
      <BulkActionToolbar
        count={selection.count}
        selectedIds={selection.selectedIds}
        onClear={selection.clearSelection}
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 dark:bg-muted/20">
              {/* Checkbox "select all" */}
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={selection.isAllSelected}
                  ref={el => {
                    if (el) el.indeterminate = selection.isPartialSelected
                  }}
                  onChange={selection.toggleAll}
                  className="h-4 w-4 rounded border-border cursor-pointer"
                  aria-label="Seleccionar todo"
                />
              </th>
              <th className="text-left p-3 font-medium">Producto</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Categoría</th>
              <th className="text-right p-3 font-medium">Precio</th>
              <th className="text-center p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                onClick={() => selection.toggle(item.id)}
                className={cn(
                  'border-b cursor-pointer transition-colors',
                  selection.isSelected(item.id)
                    ? 'bg-primary/5 dark:bg-primary/10'
                    : 'hover:bg-muted/30 dark:hover:bg-muted/20'
                )}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(item.id)}
                    onChange={() => selection.toggle(item.id)}
                    onClick={e => e.stopPropagation()}
                    className="h-4 w-4 rounded border-border cursor-pointer"
                  />
                </td>
                <td className="p-3 font-medium">{item.nombre}</td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{item.categoria}</td>
                <td className="p-3 text-right">
                  {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(item.precio)}
                </td>
                <td className="p-3 text-center">
                  <span className="rounded-full px-2 py-0.5 text-xs bg-muted">{item.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## Toolbar de acciones masivas

```tsx
// components/bulk/BulkActionToolbar.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Trash2, Download, ToggleLeft, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BulkConfirmDialog } from './BulkConfirmDialog'
import { cn } from '@/lib/utils'

type BulkStatus = 'idle' | 'ejecutando' | 'completado' | 'error'

export function BulkActionToolbar({
  count,
  selectedIds,
  onClear,
}: {
  count: number
  selectedIds: string[]
  onClear: () => void
}) {
  const [status, setStatus] = useState<BulkStatus>('idle')
  const [progreso, setProgreso] = useState(0)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  async function ejecutarAccion(accion: string) {
    setConfirmAction(null)
    setStatus('ejecutando')
    setProgreso(0)

    try {
      // Simula progreso — reemplazar con stream real si el backend soporta
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(r => setTimeout(r, 100))
        setProgreso(i)
      }

      await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ids: selectedIds }),
      })

      setStatus('completado')
      setTimeout(() => { setStatus('idle'); onClear() }, 1500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  return (
    <>
      {/* Toolbar — aparece con animación cuando hay selección */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm dark:bg-card"
          >
            {/* Contador */}
            <span className="text-sm font-medium px-2">
              {count} seleccionado{count !== 1 ? 's' : ''}
            </span>

            <div className="flex-1" />

            {/* Acciones masivas */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmAction('activar')}
              disabled={status === 'ejecutando'}
            >
              <ToggleLeft className="h-4 w-4 mr-1" />
              Cambiar estado
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => ejecutarAccion('exportar')}
              disabled={status === 'ejecutando'}
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmAction('eliminar')}
              disabled={status === 'ejecutando'}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>

            {/* Limpiar selección */}
            <button
              onClick={onClear}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Limpiar selección"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Barra de progreso */}
            {status === 'ejecutando' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progreso}%` }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diálogo de confirmación */}
      <BulkConfirmDialog
        open={confirmAction !== null}
        accion={confirmAction ?? ''}
        count={count}
        onConfirm={() => confirmAction && ejecutarAccion(confirmAction)}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  )
}
```

---

## Diálogo de confirmación masiva

```tsx
// components/bulk/BulkConfirmDialog.tsx
'use client'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BulkConfirmDialog({
  open,
  accion,
  count,
  onConfirm,
  onCancel,
}: {
  open: boolean
  accion: string
  count: number
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg p-6 max-w-sm w-full shadow-xl dark:bg-card">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h2 className="font-semibold">Confirmar acción masiva</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          ¿Ejecutar &ldquo;{accion}&rdquo; en {count} elemento{count !== 1 ? 's' : ''}? Esta acción no se puede deshacer fácilmente.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            variant={accion === 'eliminar' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## Actualización masiva de precios

```tsx
// components/bulk/BulkPriceUpdate.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type TipoAjuste = 'porcentaje_aumento' | 'porcentaje_descuento' | 'monto_fijo'

export function BulkPriceUpdate({
  selectedIds,
  categoria,
  onDone,
}: {
  selectedIds: string[]
  categoria?: string
  onDone: () => void
}) {
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoAjuste>('porcentaje_aumento')
  const [valor, setValor] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  async function handleApply() {
    if (valor <= 0) return
    setLoading(true)
    try {
      await fetch('/api/productos/bulk-price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, categoria, tipo, valor }),
      })
      toast.success(`Precios actualizados para ${selectedIds.length} productos`)
      router.refresh()
      onDone()
    } catch {
      toast.error('Error al actualizar precios')
    } finally {
      setLoading(false)
    }
  }

  const labelValor = tipo === 'monto_fijo' ? 'Monto (S/)' : 'Porcentaje (%)'

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card dark:bg-card">
      <h3 className="text-sm font-medium">Actualización masiva de precios</h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={tipo} onValueChange={v => setTipo(v as TipoAjuste)}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="porcentaje_aumento">Aumentar %</SelectItem>
            <SelectItem value="porcentaje_descuento">Descuento %</SelectItem>
            <SelectItem value="monto_fijo">Monto fijo</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            step={tipo === 'monto_fijo' ? 0.5 : 1}
            value={valor || ''}
            onChange={e => setValor(Number(e.target.value))}
            className="h-9 w-28"
            placeholder={labelValor}
          />
          <span className="text-sm text-muted-foreground">{tipo === 'monto_fijo' ? 'S/' : '%'}</span>
        </div>

        <Button onClick={handleApply} disabled={loading || valor <= 0} className="h-9">
          {loading ? 'Aplicando…' : `Aplicar a ${selectedIds.length}`}
        </Button>
      </div>
    </div>
  )
}
```

---

## Estados de operación masiva

```tsx
// Enum de estados para usar en el toolbar
type BulkStatus = 'idle' | 'seleccionando' | 'ejecutando' | 'completado' | 'error'

// Indicador visual compacto
function BulkStatusIndicator({ status, progreso }: { status: BulkStatus; progreso: number }) {
  if (status === 'idle') return null

  const config = {
    seleccionando: { text: 'Seleccionando…', classes: 'text-muted-foreground' },
    ejecutando:    { text: `Procesando… ${progreso}%`, classes: 'text-blue-600 dark:text-blue-400' },
    completado:    { text: 'Completado', classes: 'text-green-600 dark:text-green-400' },
    error:         { text: 'Error — intente de nuevo', classes: 'text-destructive' },
  }

  const { text, classes } = config[status] ?? config.ejecutando

  return (
    <span className={cn('text-xs font-medium', classes)}>{text}</span>
  )
}
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| Toolbar siempre visible aunque no haya selección | `AnimatePresence` — solo aparece al seleccionar |
| Ejecutar acción masiva sin confirmación | `BulkConfirmDialog` antes de toda acción destructiva |
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` |
| Estado de selección con múltiples `useState` | `useTableSelection` hook centralizado |
| Progress bar con JS puro | `motion.div` con `animate={{ width: '${progreso}%' }}` |

---

## Quick Reference

```
Hook selección  →  useTableSelection(items) → { selected, toggle, toggleAll, count, selectedIds }
Toolbar         →  BulkActionToolbar — animación entrada/salida con AnimatePresence
Confirmación    →  BulkConfirmDialog — siempre antes de eliminar o cambiar estado
Precios masivos →  BulkPriceUpdate — porcentaje_aumento | porcentaje_descuento | monto_fijo
Progreso        →  motion.div animate={{ width: `${progreso}%` }} — no librería extra
Checkbox all    →  el.indeterminate = isPartialSelected — estado intermedio nativo
Status          →  idle → seleccionando → ejecutando → completado | error
```
