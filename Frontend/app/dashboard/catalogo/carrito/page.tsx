"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowLeft,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
  Zap,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { cn, formatNum } from "@/lib/utils"

interface CartItem {
  id_item: number
  producto: string
  sku: string
  precio_unitario_momento: number
  precio_normal_momento: number | null
  costo_unitario_momento: number
  cantidad: number
  importe: number
  stock_disponible: number
}

const fmt = (n: number) => formatNum(n)

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false
  const item = value as Record<string, unknown>

  return (
    typeof item.id_item === "number" &&
    typeof item.producto === "string" &&
    typeof item.sku === "string" &&
    typeof item.precio_unitario_momento === "number" &&
    (typeof item.precio_normal_momento === "number" || item.precio_normal_momento === null) &&
    typeof item.costo_unitario_momento === "number" &&
    typeof item.cantidad === "number" &&
    typeof item.importe === "number" &&
    typeof item.stock_disponible === "number"
  )
}

function readStoredCartItems(): CartItem[] {
  if (typeof window === "undefined") return []

  try {
    const saved = window.localStorage.getItem("guru_cart_v1")
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isCartItem)
  } catch {
    return []
  }
}

function discountPct(item: CartItem): string {
  if (!item.precio_normal_momento) return ""
  const pct = Math.round(
    ((item.precio_normal_momento - item.precio_unitario_momento) / item.precio_normal_momento) * 100
  )
  return `-${pct}%`
}

// ─── CartProductCard ──────────────────────────────────────────────────────────

interface CartProductCardProps {
  item: CartItem
  selected: boolean
  onToggle: (id: number) => void
  onUpdateQty: (id: number, delta: number) => void
  onRemove: (id: number) => void
  delay: number
}

function CartProductCard({ item, selected, onToggle, onUpdateQty, onRemove, delay }: CartProductCardProps) {
  const hasPromo = item.precio_normal_momento !== null
  const discount = discountPct(item)

  return (
    <BlurFade delay={delay} duration={0.3}>
      <div
        className={cn(
          "rounded-2xl border bg-white p-4 flex items-center gap-3 transition-all duration-200 cursor-pointer select-none",
          selected ? "border-gray-200 shadow-sm" : "border-gray-100 opacity-50"
        )}
        onClick={() => onToggle(item.id_item)}
      >
        {/* Checkbox */}
        <div
          role="checkbox"
          aria-checked={selected}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault()
              onToggle(item.id_item)
            }
          }}
          className={cn(
            "h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
            selected ? "bg-[#020617] border-[#020617]" : "bg-white border-gray-300"
          )}
          onClick={(e) => { e.stopPropagation(); onToggle(item.id_item) }}
        >
          {selected && (
            <svg className="h-3 w-3 text-lime" viewBox="0 0 10 10" fill="none">
              <path
                d="M1.5 5L4 7.5L8.5 2.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Product icon */}
        <div className="h-12 w-12 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center">
          <Package className="h-6 w-6 text-gray-300" />
        </div>

        {/* Product info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.producto}</p>
          {hasPromo && (
            <span className="inline-block mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              Con descuento
            </span>
          )}
          <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onUpdateQty(item.id_item, -1)}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
              aria-label="Reducir cantidad"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-7 text-center text-sm tabular-nums font-medium text-gray-900">{item.cantidad}</span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.id_item, 1)}
              disabled={item.cantidad >= item.stock_disponible}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Incrementar cantidad"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Prices + remove */}
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          {hasPromo && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 line-through tabular-nums">
                S/ {fmt(item.precio_normal_momento! * item.cantidad)}
              </span>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                {discount}
              </span>
            </div>
          )}
          <span className="text-base font-bold text-gray-900 tabular-nums">
            S/ {fmt(item.importe)}
          </span>
          {item.cantidad > 1 && (
            <span className="text-[10px] text-gray-400 tabular-nums">
              S/ {fmt(item.precio_unitario_momento)} c/u
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(item.id_item) }}
            className="mt-1 flex h-6 w-6 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label="Eliminar producto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </BlurFade>
  )
}

// ─── CarritoPage ──────────────────────────────────────────────────────────────

export default function CarritoPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>(readStoredCartItems)
  const [deselected, setDeselected] = useState<Set<number>>(new Set())

  useEffect(() => {
    window.localStorage.setItem("guru_cart_v1", JSON.stringify(cartItems))
  }, [cartItems])

  const selectedItems = useMemo(
    () => cartItems.filter((i) => !deselected.has(i.id_item)),
    [cartItems, deselected]
  )

  const subtotal = useMemo(
    () => selectedItems.reduce((s, c) => s + c.importe, 0),
    [selectedItems]
  )

  const subtotalOriginal = useMemo(
    () =>
      selectedItems.reduce((s, c) => {
        const base = c.precio_normal_momento ?? c.precio_unitario_momento
        return s + base * c.cantidad
      }, 0),
    [selectedItems]
  )

  const totalItems = useMemo(
    () => selectedItems.reduce((s, c) => s + c.cantidad, 0),
    [selectedItems]
  )

  const totalDescuento = subtotalOriginal - subtotal
  const allSelected = cartItems.length > 0 && deselected.size === 0
  const noneSelected = selectedItems.length === 0

  function updateQty(id: number, delta: number) {
    setCartItems((prev) => {
      const item = prev.find((i) => i.id_item === id)
      if (!item) return prev
      const newQty = item.cantidad + delta
      if (newQty <= 0) {
        setDeselected((d) => { const n = new Set(d); n.delete(id); return n })
        return prev.filter((i) => i.id_item !== id)
      }
      if (newQty > item.stock_disponible) return prev
      return prev.map((i) =>
        i.id_item === id ? { ...i, cantidad: newQty, importe: newQty * i.precio_unitario_momento } : i
      )
    })
  }

  function removeItem(id: number) {
    setDeselected((d) => { const n = new Set(d); n.delete(id); return n })
    setCartItems((prev) => prev.filter((i) => i.id_item !== id))
  }

  function toggleSelect(id: number) {
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setDeselected(new Set(cartItems.map((i) => i.id_item)))
    } else {
      setDeselected(new Set())
    }
  }

  function vaciarCarrito() {
    setCartItems([])
    setDeselected(new Set())
    localStorage.setItem("guru_cart_v1", JSON.stringify([]))
  }

  function realizarVenta() {
    const items = cartItems.filter((i) => !deselected.has(i.id_item))
    localStorage.setItem("guru_cart_v1", JSON.stringify(items))
    router.push("/dashboard/catalogo/carrito/venta")
  }

  return (
    <div className="bg-bg-main min-h-full">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">

        {/* Header */}
        <BlurFade delay={0} duration={0.4}>
          <div className="flex items-center gap-3 mb-8">
            <motion.button
              initial="rest"
              whileHover="hover"
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/dashboard/catalogo")}
              className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-2.5 cursor-pointer"
              aria-label="Volver al catálogo"
            >
              <motion.div
                variants={{
                  rest: { scaleX: 0 },
                  hover: { scaleX: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                }}
                className="absolute inset-0 origin-left bg-[#020617]"
              />
              <motion.span
                variants={{
                  rest: { x: 0 },
                  hover: { x: -3, transition: { duration: 0.25 } },
                }}
                className="relative z-10"
              >
                <ArrowLeft className="h-4 w-4 text-gray-500 group-hover:text-lime transition-colors duration-500" />
              </motion.span>
              <span className="relative z-10 text-sm font-semibold text-gray-600 group-hover:text-lime transition-colors duration-500">
                Catálogo
              </span>
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <ShoppingCart className="h-4 w-4 text-gray-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-heading">Carrito</h1>
                <p className="text-sm text-text-muted">
                  {cartItems.length === 0
                    ? "Vacío"
                    : `${cartItems.length} producto${cartItems.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Empty state */}
        {cartItems.length === 0 && (
          <BlurFade delay={0.1} duration={0.4}>
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <ShoppingCart className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-base font-medium text-gray-500">Tu carrito está vacío</p>
              <p className="text-sm text-gray-400">Agrega productos desde el catálogo</p>
              <button
                onClick={() => router.push("/dashboard/catalogo")}
                className="mt-2 flex items-center gap-2 rounded-xl bg-[#020617] text-lime px-5 py-2.5 text-sm font-semibold hover:bg-[#0d1b38] transition-colors"
              >
                Ir al catálogo
              </button>
            </div>
          </BlurFade>
        )}

        {/* Main layout */}
        {cartItems.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* LEFT: product list */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">

              {/* List header */}
              <BlurFade delay={0.05} duration={0.4}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      role="checkbox"
                      aria-checked={allSelected}
                      tabIndex={0}
                      onClick={toggleSelectAll}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault()
                          toggleSelectAll()
                        }
                      }}
                      className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
                        allSelected
                          ? "bg-[#020617] border-[#020617]"
                          : "bg-white border-gray-300"
                      )}
                    >
                      {allSelected && (
                        <svg className="h-3 w-3 text-lime" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M1.5 5L4 7.5L8.5 2.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      Seleccionar todo ({cartItems.length})
                    </span>
                  </label>

                  <InteractiveHoverButton
                    onClick={vaciarCarrito}
                    text="Vaciar"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    fillClassName="bg-red-700"
                    className="h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm px-4"
                  />
                </div>
              </BlurFade>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {cartItems.map((item, i) => (
                    <CartProductCard
                      key={item.id_item}
                      item={item}
                      selected={!deselected.has(item.id_item)}
                      onToggle={toggleSelect}
                      onUpdateQty={updateQty}
                      onRemove={removeItem}
                      delay={0.07 + i * 0.03}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT: order summary */}
            <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-6">
              <BlurFade delay={0.1} duration={0.4}>
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-4">
                  <h2 className="text-sm font-bold text-gray-900">Resumen del pedido</h2>

                  <div className="flex flex-col gap-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total de artículos</span>
                      <span className="tabular-nums font-medium text-gray-900">
                        {totalDescuento > 0 ? (
                          <span className="text-gray-400 line-through">S/ {fmt(subtotalOriginal)}</span>
                        ) : (
                          `S/ ${fmt(subtotal)}`
                        )}
                      </span>
                    </div>

                    {totalDescuento > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Descuento de artículo(s)</span>
                        <span className="tabular-nums font-semibold text-emerald-600">
                          -S/ {fmt(totalDescuento)}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-gray-100 pt-2.5 flex justify-between items-baseline">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold tabular-nums text-[#020617]">
                        S/ {fmt(subtotal)}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {noneSelected && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 overflow-hidden"
                      >
                        Selecciona al menos un producto para continuar
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <InteractiveHoverButton
                    onClick={realizarVenta}
                    disabled={noneSelected}
                    text="Realizar venta"
                    icon={<Zap className="h-4 w-4" />}
                    className="h-12 w-full rounded-xl bg-lime text-[#020617] text-sm shadow-[0_0_20px_rgba(172,248,71,0.3)]"
                  />

                  <p className="text-[11px] text-gray-400 text-center">
                    {totalItems} producto{totalItems !== 1 ? "s" : ""} seleccionado{totalItems !== 1 ? "s" : ""}
                  </p>
                </div>
              </BlurFade>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
