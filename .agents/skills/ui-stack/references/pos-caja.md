# POS / Caja Registradora — UI Stack

---

## Arquitectura Server/Client

```tsx
// app/dashboard/caja/page.tsx — Server Component: carga catálogo
import { CajaClient } from './CajaClient'

export default async function CajaPage() {
  const productos = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/productos?activo=true`, {
    next: { revalidate: 60 },
  }).then(r => r.json())

  return <CajaClient productos={productos} />
}
```

```tsx
// app/dashboard/caja/CajaClient.tsx — Client Component: carrito + pago
'use client'
import { useReducer, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
```

---

## Estado del carrito — useReducer

```tsx
// lib/pos/cart-reducer.ts
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

type CartItem = {
  productoId: string
  nombre: string
  precio: number
  cantidad: number
  descuento: number // porcentaje 0-100 por ítem
}

type CartState = {
  items: CartItem[]
  descuentoGlobal: number // porcentaje 0-100
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin' | null
  montoRecibido: number
  status: 'vacio' | 'armando' | 'pagando' | 'completado' | 'error'
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'cantidad' | 'descuento'> }
  | { type: 'REMOVE_ITEM'; productoId: string }
  | { type: 'UPDATE_QTY'; productoId: string; cantidad: number }
  | { type: 'APPLY_ITEM_DISCOUNT'; productoId: string; descuento: number }
  | { type: 'APPLY_GLOBAL_DISCOUNT'; descuento: number }
  | { type: 'SET_METODO_PAGO'; metodo: CartState['metodoPago'] }
  | { type: 'SET_MONTO_RECIBIDO'; monto: number }
  | { type: 'SET_STATUS'; status: CartState['status'] }
  | { type: 'CLEAR' }

const initialState: CartState = {
  items: [],
  descuentoGlobal: 0,
  metodoPago: null,
  montoRecibido: 0,
  status: 'vacio',
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.productoId === action.payload.productoId)
      if (existing) {
        return {
          ...state,
          status: 'armando',
          items: state.items.map(i =>
            i.productoId === action.payload.productoId
              ? { ...i, cantidad: i.cantidad + 1 }
              : i
          ),
        }
      }
      return {
        ...state,
        status: 'armando',
        items: [...state.items, { ...action.payload, cantidad: 1, descuento: 0 }],
      }
    }
    case 'REMOVE_ITEM': {
      const items = state.items.filter(i => i.productoId !== action.productoId)
      return { ...state, items, status: items.length === 0 ? 'vacio' : 'armando' }
    }
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map(i =>
          i.productoId === action.productoId ? { ...i, cantidad: action.cantidad } : i
        ),
      }
    case 'APPLY_ITEM_DISCOUNT':
      return {
        ...state,
        items: state.items.map(i =>
          i.productoId === action.productoId ? { ...i, descuento: action.descuento } : i
        ),
      }
    case 'APPLY_GLOBAL_DISCOUNT':
      return { ...state, descuentoGlobal: action.descuento }
    case 'SET_METODO_PAGO':
      return { ...state, metodoPago: action.metodo, status: 'pagando' }
    case 'SET_MONTO_RECIBIDO':
      return { ...state, montoRecibido: action.monto }
    case 'SET_STATUS':
      return { ...state, status: action.status }
    case 'CLEAR':
      return initialState
    default:
      return state
  }
}
```

---

## Cálculo de totales

```tsx
// lib/pos/cart-totals.ts
const IGV_RATE = 0.18 // Impuesto General a las Ventas Perú

type CartTotals = {
  subtotalBruto: number
  descuentosItem: number
  subtotalConDescItem: number
  descuentoGlobal: number
  subtotalNeto: number
  igv: number
  total: number
  vuelto: number
}

export function calcularTotales(
  items: CartItem[],
  descuentoGlobal: number,
  montoRecibido: number,
  incluirIgv = false
): CartTotals {
  const subtotalBruto = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

  const descuentosItem = items.reduce(
    (acc, i) => acc + (i.precio * i.cantidad * i.descuento) / 100,
    0
  )

  const subtotalConDescItem = subtotalBruto - descuentosItem
  const descuentoGlobalMonto = (subtotalConDescItem * descuentoGlobal) / 100
  const subtotalNeto = subtotalConDescItem - descuentoGlobalMonto

  const igv = incluirIgv ? subtotalNeto * IGV_RATE : 0
  const total = subtotalNeto + igv
  const vuelto = Math.max(0, montoRecibido - total)

  return {
    subtotalBruto,
    descuentosItem,
    subtotalConDescItem,
    descuentoGlobal: descuentoGlobalMonto,
    subtotalNeto,
    igv,
    total,
    vuelto,
  }
}
```

---

## Grid de productos — catálogo visual

```tsx
// components/pos/ProductGrid.tsx
'use client'
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

type Producto = { id: string; nombre: string; sku: string; precio: number; imagen?: string; stock: number }

export function ProductGrid({
  productos,
  onAdd,
}: {
  productos: Producto[]
  onAdd: (p: Omit<CartItem, 'cantidad' | 'descuento'>) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return productos.filter(
      p => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [productos, query])

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Búsqueda por nombre o SKU */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar producto o SKU…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid responsive: 2 cols móvil, 3 tablet, 4 desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 overflow-y-auto">
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => onAdd({ productoId: p.id, nombre: p.nombre, precio: p.precio })}
            disabled={p.stock === 0}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-2 text-left transition-colors',
              'hover:bg-accent hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'dark:hover:bg-accent/50',
              p.stock === 0 && 'opacity-40 cursor-not-allowed'
            )}
          >
            {p.imagen ? (
              <img src={p.imagen} alt={p.nombre} className="h-16 w-full object-cover rounded" />
            ) : (
              <div className="h-16 w-full rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                Sin imagen
              </div>
            )}
            <span className="text-xs font-medium line-clamp-2 w-full">{p.nombre}</span>
            <span className="text-xs text-muted-foreground">{p.sku}</span>
            <span className="text-sm font-semibold text-primary">
              {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.precio)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## Carrito — lista de ítems

```tsx
// components/pos/CartList.tsx
'use client'
import { Trash2, Minus, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CartList({
  items,
  onRemove,
  onUpdateQty,
  onItemDiscount,
}: {
  items: CartItem[]
  onRemove: (id: string) => void
  onUpdateQty: (id: string, qty: number) => void
  onItemDiscount: (id: string, desc: number) => void
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
        <span className="text-sm">Carrito vacío</span>
      </div>
    )
  }

  return (
    <ul className="space-y-2 overflow-y-auto max-h-80">
      <AnimatePresence initial={false}>
        {items.map(item => (
          <motion.li
            key={item.productoId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1 rounded-lg border p-2 bg-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium flex-1 line-clamp-1">{item.nombre}</span>
              <button
                onClick={() => onRemove(item.productoId)}
                className="text-destructive hover:text-destructive/80 p-1"
                aria-label="Eliminar ítem"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Control de cantidad */}
              <div className="flex items-center border rounded-md">
                <button
                  onClick={() => onUpdateQty(item.productoId, Math.max(1, item.cantidad - 1))}
                  className="px-2 py-1 hover:bg-muted"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm">{item.cantidad}</span>
                <button
                  onClick={() => onUpdateQty(item.productoId, item.cantidad + 1)}
                  className="px-2 py-1 hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Descuento por ítem */}
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={item.descuento}
                  onChange={e => onItemDiscount(item.productoId, Number(e.target.value))}
                  className="w-16 h-7 text-xs"
                  placeholder="0%"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>

              {/* Subtotal ítem */}
              <span className="ml-auto text-sm font-semibold">
                {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
                  item.precio * item.cantidad * (1 - item.descuento / 100)
                )}
              </span>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
```

---

## Panel de totales y pago

```tsx
// components/pos/PaymentPanel.tsx
'use client'
import { CreditCard, Banknote, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'yape', label: 'Yape', icon: Smartphone },
  { value: 'plin', label: 'Plin', icon: Smartphone },
  { value: 'transferencia', label: 'Transf.', icon: CreditCard },
] as const

export function PaymentPanel({
  totals,
  state,
  onSetMetodo,
  onSetMontoRecibido,
  onConfirm,
  onClear,
}: {
  totals: CartTotals
  state: CartState
  onSetMetodo: (m: CartState['metodoPago']) => void
  onSetMontoRecibido: (n: number) => void
  onConfirm: () => Promise<void>
  onClear: () => void
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

  return (
    <div className="flex flex-col gap-4 p-4 border-t dark:border-border">
      {/* Resumen de totales */}
      <div className="space-y-1 text-sm">
        {totals.descuentosItem > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Descuentos por ítem</span>
            <span className="text-destructive">-{fmt(totals.descuentosItem)}</span>
          </div>
        )}
        {totals.descuentoGlobal > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Descuento global ({state.descuentoGlobal}%)</span>
            <span className="text-destructive">-{fmt(totals.descuentoGlobal)}</span>
          </div>
        )}
        {totals.igv > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>IGV (18%)</span>
            <span>{fmt(totals.igv)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base border-t pt-1 dark:border-border">
          <span>TOTAL</span>
          <span>{fmt(totals.total)}</span>
        </div>
      </div>

      {/* Selección de método de pago */}
      <div className="grid grid-cols-5 gap-1">
        {METODOS_PAGO.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onSetMetodo(value)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-md border p-2 text-xs transition-colors',
              state.metodoPago === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent dark:hover:bg-accent/50'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Monto recibido y vuelto — solo efectivo */}
      {state.metodoPago === 'efectivo' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm whitespace-nowrap">Recibido</label>
            <Input
              type="number"
              min={totals.total}
              step={0.5}
              value={state.montoRecibido || ''}
              onChange={e => onSetMontoRecibido(Number(e.target.value))}
              className="flex-1"
              placeholder={fmt(totals.total)}
            />
          </div>
          {state.montoRecibido > 0 && (
            <div className="flex justify-between text-sm font-semibold text-green-700 dark:text-green-400">
              <span>Vuelto</span>
              <span>{fmt(totals.vuelto)}</span>
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClear} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={
            state.items.length === 0 ||
            !state.metodoPago ||
            state.status === 'completado' ||
            (state.metodoPago === 'efectivo' && state.montoRecibido < totals.total)
          }
          className="flex-2"
        >
          Confirmar venta
        </Button>
      </div>
    </div>
  )
}
```

---

## CajaClient — composición completa

```tsx
// app/dashboard/caja/CajaClient.tsx
'use client'
import { useReducer, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { cartReducer, initialState } from '@/lib/pos/cart-reducer'
import { calcularTotales } from '@/lib/pos/cart-totals'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartList } from '@/components/pos/CartList'
import { PaymentPanel } from '@/components/pos/PaymentPanel'

export function CajaClient({ productos }: { productos: Producto[] }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState)

  const totals = useMemo(
    () => calcularTotales(cart.items, cart.descuentoGlobal, cart.montoRecibido),
    [cart.items, cart.descuentoGlobal, cart.montoRecibido]
  )

  async function handleConfirm() {
    dispatch({ type: 'SET_STATUS', status: 'pagando' })
    try {
      await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items,
          descuentoGlobal: cart.descuentoGlobal,
          metodoPago: cart.metodoPago,
          total: totals.total,
        }),
      })
      dispatch({ type: 'SET_STATUS', status: 'completado' })
      toast.success('Venta registrada', {
        description: `Total cobrado: ${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(totals.total)}`,
      })
      setTimeout(() => dispatch({ type: 'CLEAR' }), 1500)
    } catch {
      dispatch({ type: 'SET_STATUS', status: 'error' })
      toast.error('Error al registrar la venta — intente de nuevo')
    }
  }

  return (
    // Layout: catálogo izquierda, carrito+pago derecha
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-4rem)] p-4">
      {/* Catálogo de productos */}
      <div className="flex-1 min-h-0">
        <ProductGrid
          productos={productos}
          onAdd={p => dispatch({ type: 'ADD_ITEM', payload: p })}
        />
      </div>

      {/* Panel de carrito y pago */}
      <div className="w-full lg:w-96 flex flex-col border rounded-xl bg-card dark:bg-card shadow-sm">
        <div className="p-4 border-b dark:border-border">
          <h2 className="font-semibold text-sm">
            Carrito ({cart.items.reduce((a, i) => a + i.cantidad, 0)} ítems)
          </h2>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <CartList
            items={cart.items}
            onRemove={id => dispatch({ type: 'REMOVE_ITEM', productoId: id })}
            onUpdateQty={(id, qty) => dispatch({ type: 'UPDATE_QTY', productoId: id, cantidad: qty })}
            onItemDiscount={(id, d) => dispatch({ type: 'APPLY_ITEM_DISCOUNT', productoId: id, descuento: d })}
          />
        </div>

        {/* Estado de éxito — overlay sobre el carrito */}
        <AnimatePresence>
          {cart.status === 'completado' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-xl"
            >
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ¡Venta completada!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <PaymentPanel
          totals={totals}
          state={cart}
          onSetMetodo={m => dispatch({ type: 'SET_METODO_PAGO', metodo: m })}
          onSetMontoRecibido={n => dispatch({ type: 'SET_MONTO_RECIBIDO', monto: n })}
          onConfirm={handleConfirm}
          onClear={() => dispatch({ type: 'CLEAR' })}
        />
      </div>
    </div>
  )
}
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` |
| Calcular totales dentro del render | `useMemo` para subtotales e IGV |
| Estado del carrito con múltiples `useState` | `useReducer` con `cartReducer` |
| Hex en colores de botones de método de pago | `bg-primary`, `bg-accent` semánticos |
| Confirmar venta sin validar método de pago | Deshabilitar botón si `!state.metodoPago` |
| `<Button asChild><Link /></Button>` | `<Link className={buttonVariants()} />` |

---

## Quick Reference

```
Reducer POS     →  lib/pos/cart-reducer.ts (ADD_ITEM, REMOVE_ITEM, UPDATE_QTY, APPLY_DISCOUNT, CLEAR)
Totales         →  lib/pos/cart-totals.ts — calcularTotales(items, descGlobal, montoRecibido)
IGV Perú        →  18% — solo si incluirIgv=true
Métodos pago    →  efectivo | tarjeta | transferencia | yape | plin
Vuelto          →  solo si metodoPago === 'efectivo' && montoRecibido > 0
Estado POS      →  vacio → armando → pagando → completado | error
Moneda          →  Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
Catálogo        →  Server Component carga, Client Component filtra con useMemo
```
