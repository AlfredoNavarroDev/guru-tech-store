# State Management para el sistema — UI Stack

---

## Cuándo usar qué

| Caso | Herramienta | Razón |
|------|-------------|-------|
| Carrito POS | `useReducer` local | Estado complejo, acciones tipadas, sin compartir entre rutas |
| Filtros globales (almacén, fechas) | URL search params | Shareable, funciona con SSR, sobrevive recarga |
| Sesión / usuario | React Context (`AuthContext`) | Necesita estar en toda la app |
| Selección de tabla | `useState` local con `useTableSelection` | Solo vive en el componente de tabla |
| Datos del servidor | `fetch` en Server Components | La mejor estrategia — sin estado en cliente |
| Preferencias de UI (sidebar, layout) | `localStorage` + `useState` | Solo UI, no crítico |

---

## Carrito con useReducer — acciones completas

```tsx
// lib/pos/cart-reducer.ts — ver pos-caja.md para implementación completa
// Acciones disponibles:
type CartAction =
  | { type: 'ADD_ITEM';            payload: { productoId: string; nombre: string; precio: number } }
  | { type: 'REMOVE_ITEM';         productoId: string }
  | { type: 'UPDATE_QTY';          productoId: string; cantidad: number }
  | { type: 'APPLY_ITEM_DISCOUNT'; productoId: string; descuento: number }
  | { type: 'APPLY_GLOBAL_DISCOUNT'; descuento: number }
  | { type: 'SET_METODO_PAGO';     metodo: string }
  | { type: 'SET_MONTO_RECIBIDO';  monto: number }
  | { type: 'SET_STATUS';          status: CartStatus }
  | { type: 'CLEAR' }
```

---

## Filtros globales — Context + useReducer

```tsx
// lib/filters/FiltersContext.tsx
'use client'
import { createContext, useContext, useReducer, type ReactNode } from 'react'

type FiltersState = {
  almacenId: string
  sucursalId: string
  desde: string
  hasta: string
}

type FiltersAction =
  | { type: 'SET_ALMACEN'; almacenId: string }
  | { type: 'SET_SUCURSAL'; sucursalId: string }
  | { type: 'SET_RANGO_FECHAS'; desde: string; hasta: string }
  | { type: 'RESET' }

const today = () => new Date().toISOString().split('T')[0]
const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

const initialState: FiltersState = {
  almacenId: 'principal',
  sucursalId: 'lima',
  desde: firstOfMonth(),
  hasta: today(),
}

function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'SET_ALMACEN':       return { ...state, almacenId: action.almacenId }
    case 'SET_SUCURSAL':      return { ...state, sucursalId: action.sucursalId }
    case 'SET_RANGO_FECHAS':  return { ...state, desde: action.desde, hasta: action.hasta }
    case 'RESET':             return initialState
    default:                  return state
  }
}

const FiltersContext = createContext<{
  filters: FiltersState
  dispatch: React.Dispatch<FiltersAction>
}>({ filters: initialState, dispatch: () => {} })

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, dispatch] = useReducer(filtersReducer, initialState)
  return (
    <FiltersContext.Provider value={{ filters, dispatch }}>
      {children}
    </FiltersContext.Provider>
  )
}

export function useFilters() {
  return useContext(FiltersContext)
}
```

---

## Optimistic updates — patrón con rollback

```tsx
// Patrón para cambios inmediatos con rollback en error
'use client'
import { useState } from 'react'
import { toast } from 'sonner'

type EstadoVenta = 'pendiente' | 'completada' | 'anulada'

export function VentaRow({ venta }: { venta: { id: string; estado: EstadoVenta } }) {
  const [estado, setEstado] = useState<EstadoVenta>(venta.estado)
  const [isUpdating, setIsUpdating] = useState(false)

  async function cambiarEstado(nuevoEstado: EstadoVenta) {
    const estadoAnterior = estado
    setEstado(nuevoEstado) // Optimistic update — UI cambia inmediatamente
    setIsUpdating(true)

    try {
      const res = await fetch(`/api/ventas/${venta.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      toast.success(`Venta ${nuevoEstado}`)
    } catch {
      setEstado(estadoAnterior) // Rollback al estado anterior
      toast.error('No se pudo cambiar el estado — intente de nuevo')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={isUpdating ? 'opacity-60 pointer-events-none' : ''}>
      {/* Renderizar estado actual optimista */}
      <span>{estado}</span>
      <button onClick={() => cambiarEstado('anulada')}>Anular</button>
    </div>
  )
}
```

---

## useOptimistic de React 19 (alternativa)

```tsx
'use client'
import { useOptimistic } from 'react'

type Item = { id: string; activo: boolean }

export function ToggleItem({ item }: { item: Item }) {
  const [optimisticItem, setOptimisticItem] = useOptimistic(
    item,
    (current, activo: boolean) => ({ ...current, activo })
  )

  async function toggle() {
    setOptimisticItem(!optimisticItem.activo) // UI cambia inmediatamente
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ activo: !item.activo }),
    })
    // Si falla, React revierte automáticamente al valor original
  }

  return (
    <button onClick={toggle}>
      {optimisticItem.activo ? 'Desactivar' : 'Activar'}
    </button>
  )
}
```

---

## Invalidación de caché — Server Actions

```tsx
// app/actions/ventas.ts
'use server'
import { revalidateTag, revalidatePath } from 'next/cache'

export async function crearVenta(data: NuevaVenta) {
  const res = await fetch(`${process.env.API_URL}/ventas`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al crear venta')

  // Invalidar cache de ventas y stock (afecta inventario)
  revalidateTag('ventas')
  revalidateTag('inventario')
  return res.json()
}

export async function actualizarPrecio(productoId: string, precio: number) {
  // Después de actualizar precio, solo invalidar catálogo
  revalidatePath('/dashboard/catalogo')
  revalidateTag('productos')
}

// Taggear fetches para invalidación selectiva:
// fetch('/api/ventas', { next: { tags: ['ventas'], revalidate: 60 } })
// fetch('/api/inventario', { next: { tags: ['inventario'], revalidate: 30 } })
```

---

## Sincronización entre pestañas — BroadcastChannel

```tsx
// hooks/useCrossTabSync.ts
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type SyncMessage =
  | { type: 'VENTA_CREADA'; ventaId: string }
  | { type: 'STOCK_ACTUALIZADO'; productoId: string }
  | { type: 'LOGOUT' }

export function useCrossTabSync() {
  const router = useRouter()

  useEffect(() => {
    const channel = new BroadcastChannel('erp-sync')

    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      switch (event.data.type) {
        case 'VENTA_CREADA':
          router.refresh() // Recargar datos en esta pestaña
          toast.info('Nueva venta registrada en otra pestaña')
          break
        case 'STOCK_ACTUALIZADO':
          router.refresh()
          break
        case 'LOGOUT':
          // Cerrar sesión en todas las pestañas
          window.location.href = '/login'
          break
      }
    }

    return () => channel.close()
  }, [router])

  // Función para notificar a otras pestañas
  return {
    broadcast: (msg: SyncMessage) => {
      const channel = new BroadcastChannel('erp-sync')
      channel.postMessage(msg)
      channel.close()
    },
  }
}
```

---

## Data fetching — estados loading, error, data, refetch

```tsx
// hooks/useFetch.ts — wrapper con estados para fetch nativo de Next.js
'use client'
import { useState, useEffect, useCallback } from 'react'

type FetchState<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFetch<T>(url: string): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [url, tick])

  const refetch = useCallback(() => setTick(t => t + 1), [])

  return { data, loading, error, refetch }
}

// Uso:
// const { data: ventas, loading, error, refetch } = useFetch<Venta[]>('/api/ventas')
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| `useContext` + `useState` para datos del servidor | Server Components con `fetch` directo |
| Almacén/sucursal en Context global | URL search params — SSR-friendly, shareable |
| Rollback manual con estado complejo | `useOptimistic` de React 19 |
| Invalidar toda la caché con `revalidatePath('/')` | Tags granulares: `revalidateTag('ventas')` |
| BroadcastChannel sin cleanup | `channel.close()` en cleanup del useEffect |
| `revalidatePath` en el cliente | Solo en Server Actions o Route Handlers |

---

## Quick Reference

```
Carrito POS     →  useReducer en pos-caja.md — 8 acciones tipadas
Filtros globales→  FiltersContext + useReducer — almacen, sucursal, fechas
Optimistic      →  useState + rollback manual, o useOptimistic (React 19)
Cache tags      →  fetch(..., { next: { tags: ['X'] } }) + revalidateTag('X')
Cross-tab       →  BroadcastChannel('erp-sync') — broadcast VENTA_CREADA, LOGOUT
useFetch()      →  hooks/useFetch.ts — data, loading, error, refetch
Context vs URL  →  UI local → Context; estado shareable/navegable → URL search params
```
