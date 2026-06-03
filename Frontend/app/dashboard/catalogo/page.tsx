"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Package,
  Search,
  Tag,
  AlertCircle,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  X,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Zap,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { MagicCard } from "@/components/ui/magic-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getCatalogo, type CatalogoItem } from "@/lib/api/catalogo"
import { getClientes, type ClienteVista } from "@/lib/api/clientes"
import { createVenta, createPago, type CreatePagoInput } from "@/lib/api/ventas"
import { cn } from "@/lib/utils"

// ─── types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id_item: number
  producto: string
  sku: string
  precio_unitario_momento: number
  costo_unitario_momento: number
  cantidad: number
  importe: number
}

type MetodoPago = CreatePagoInput["metodo_pago"]

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "otro", label: "Otro" },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── StockBadge ───────────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock > 10) {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
        En stock ({stock})
      </Badge>
    )
  }
  if (stock >= 1) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
        Bajo stock ({stock})
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
      Sin stock
    </Badge>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  item: CatalogoItem
  delay: number
  onAdd: (item: CatalogoItem) => void
  inCart: boolean
}

function ProductCard({ item, delay, onAdd, inCart }: ProductCardProps) {
  const hasPromo = !!item.promo_nombre

  return (
    <BlurFade delay={delay} duration={0.4}>
      <div className="relative overflow-hidden rounded-2xl h-full">
        <MagicCard
          className="rounded-2xl h-full hover:shadow-md hover:border-blue-200 transition-all duration-200"
          gradientFrom="#3b82f6"
          gradientTo="#8b5cf6"
          gradientSize={180}
          gradientOpacity={0.06}
          cardBg="#ffffff"
        >
          <div className="relative z-40 flex h-full flex-col p-5">
            {/* Header: name + SKU + stock badge */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-gray-900">
                  {item.producto}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{item.sku}</p>
              </div>
              <div className="mt-0.5 shrink-0">
                <StockBadge stock={item.stock_disponible} />
              </div>
            </div>

            {/* Chips: marca + categoría */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600">
                {item.marca}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600">
                <Tag className="h-2.5 w-2.5" />
                {item.categoria}
              </span>
              {item.modelo && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-500">
                  {item.modelo}
                </span>
              )}
            </div>

            {/* Price section — pushed to bottom */}
            <div className="mt-auto">
              {hasPromo && item.precio_con_descuento !== null ? (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      S/ {Number(item.precio_con_descuento).toFixed(2)}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {item.promo_nombre}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 line-through">
                    S/ {Number(item.precio_venta_actual).toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-gray-900">
                  S/ {Number(item.precio_venta_actual).toFixed(2)}
                </span>
              )}

              {/* Add to cart button */}
              <button
                type="button"
                onClick={() => onAdd(item)}
                className={cn(
                  "mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all duration-150",
                  inCart
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    : "bg-[#020617] text-[#ACF847] hover:bg-[#0d1b38]"
                )}
              >
                <ShoppingCart className="h-4 w-4" />
                {inCart ? "Agregar más" : "Agregar"}
              </button>
            </div>
          </div>
        </MagicCard>
      </div>
    </BlurFade>
  )
}

// ─── CatalogoPage (POS) ───────────────────────────────────────────────────────

export default function CatalogoPage() {
  // ── catalog state ──
  const [catalogoItems, setCatalogoItems] = useState<CatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogoError, setCatalogoError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [soloConStock, setSoloConStock] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── cart state ──
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  // ── discount state ──
  const [tipoDescuento, setTipoDescuento] = useState<"porcentaje" | "monto_fijo">("monto_fijo")
  const [valorDescuento, setValorDescuento] = useState<string>("0")
  const [justificacionDescuento, setJustificacionDescuento] = useState<string>("")

  // ── client state ──
  const [clienteSearch, setClienteSearch] = useState("")
  const [allClientes, setAllClientes] = useState<ClienteVista[]>([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteVista | null>(null)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)

  // ── submission state ──
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── payment modal state ──
  const [ventaId, setVentaId] = useState<number | null>(null)
  const [ventaTotal, setVentaTotal] = useState<number | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [montoPago, setMontoPago] = useState<string>("")
  const [pagoSubmitting, setPagoSubmitting] = useState(false)
  const [pagoError, setPagoError] = useState<string | null>(null)

  // ── derived values ──
  const subtotal = cartItems.reduce((s, c) => s + c.importe, 0)
  const montoDescuento = (() => {
    const v = parseFloat(valorDescuento) || 0
    if (tipoDescuento === "porcentaje") return Math.min(subtotal, (subtotal * v) / 100)
    return Math.min(subtotal, Math.max(0, v))
  })()
  const total = subtotal - montoDescuento

  const filteredClientes = clienteSearch.trim()
    ? allClientes.filter(
        (c) =>
          c.nombre_completo.toLowerCase().includes(clienteSearch.toLowerCase()) ||
          c.nro_documento.includes(clienteSearch)
      )
    : allClientes

  // ── fetch catalog ──
  const fetchItems = useCallback(async (nombre: string, conStock: boolean) => {
    setLoading(true)
    setCatalogoError(null)
    try {
      const data = await getCatalogo({
        nombre: nombre.trim() || undefined,
        con_stock: conStock || undefined,
      })
      const seen = new Set<number>()
      setCatalogoItems(
        data.filter((item) => !seen.has(item.id_item) && (seen.add(item.id_item) as unknown as true))
      )
    } catch {
      setCatalogoError("No se pudo cargar el catálogo. Verifica tu conexión e intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }, [])

  // ── load on mount ──
  useEffect(() => {
    fetchItems("", true)
    getClientes().then(setAllClientes).catch(() => {})
  }, [fetchItems])

  // ── close client dropdown on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        clienteDropdownRef.current &&
        !clienteDropdownRef.current.contains(e.target as Node)
      ) {
        setShowClienteDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick, { passive: true })
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // ── search handlers ──
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchItems(value, soloConStock)
      }, 300)
    },
    [fetchItems, soloConStock]
  )

  const handleToggleStock = useCallback(
    (checked: boolean) => {
      setSoloConStock(checked)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      fetchItems(search, checked)
    },
    [fetchItems, search]
  )

  // ── cart operations ──
  const addToCart = useCallback((item: CatalogoItem) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id_item === item.id_item)
      if (existing) {
        return prev.map((c) =>
          c.id_item === item.id_item
            ? {
                ...c,
                cantidad: c.cantidad + 1,
                importe: (c.cantidad + 1) * c.precio_unitario_momento,
              }
            : c
        )
      }
      const precio = Number(item.precio_con_descuento ?? item.precio_venta_actual)
      return [
        ...prev,
        {
          id_item: item.id_item,
          producto: item.producto,
          sku: item.sku,
          precio_unitario_momento: precio,
          costo_unitario_momento: 0,
          cantidad: 1,
          importe: precio,
        },
      ]
    })
  }, [])

  const updateQty = useCallback((id_item: number, delta: number) => {
    setCartItems((prev) =>
      prev.map((c) => {
        if (c.id_item !== id_item) return c
        const newQty = Math.max(1, c.cantidad + delta)
        return { ...c, cantidad: newQty, importe: newQty * c.precio_unitario_momento }
      })
    )
  }, [])

  const removeItem = useCallback((id_item: number) => {
    setCartItems((prev) => prev.filter((c) => c.id_item !== id_item))
  }, [])

  // ── submit venta ──
  async function handleSubmit() {
    if (cartItems.length === 0 || submitting) return
    if (montoDescuento > 0 && !justificacionDescuento.trim()) {
      setError("Ingresa el motivo del descuento")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const descuentoPayload =
        montoDescuento > 0
          ? {
              monto_descuento: montoDescuento,
              tipo_descuento: tipoDescuento,
              justificacion_descuento: justificacionDescuento,
            }
          : {}
      const venta = await createVenta({
        id_cliente: selectedCliente?.id_cliente,
        items: cartItems.map((item) => ({
          id_item: item.id_item,
          cantidad: Number(item.cantidad),
          precio_unitario_momento: Number(item.precio_unitario_momento),
          costo_unitario_momento: Number(item.costo_unitario_momento),
          importe: Number(item.importe),
        })),
        ...descuentoPayload,
      })
      setVentaId(venta.id_venta)
      setVentaTotal(total)
      setMontoPago(total.toFixed(2))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la venta")
    } finally {
      setSubmitting(false)
    }
  }

  // ── submit pago ──
  async function handlePago() {
    if (!ventaId || pagoSubmitting) return
    const monto = parseFloat(montoPago)
    if (isNaN(monto) || monto <= 0) {
      setPagoError("Ingresa un monto válido")
      return
    }
    if (ventaTotal !== null && Math.abs(monto - ventaTotal) > 0.01) {
      setPagoError(`El monto debe ser exactamente S/ ${fmt(ventaTotal)}`)
      return
    }
    setPagoSubmitting(true)
    setPagoError(null)
    try {
      await createPago(ventaId, { metodo_pago: metodoPago, monto })
      // clear state, stay on page
      setCartItems([])
      setSelectedCliente(null)
      setClienteSearch("")
      setValorDescuento("0")
      setJustificacionDescuento("")
      setVentaId(null)
      setVentaTotal(null)
      setMontoPago("")
      setMetodoPago("efectivo")
    } catch (err) {
      setPagoError(err instanceof Error ? err.message : "Error al registrar el pago")
    } finally {
      setPagoSubmitting(false)
    }
  }

  function handleOmitirPago() {
    setCartItems([])
    setSelectedCliente(null)
    setClienteSearch("")
    setValorDescuento("0")
    setJustificacionDescuento("")
    setVentaId(null)
    setVentaTotal(null)
    setMontoPago("")
    setMetodoPago("efectivo")
    setPagoError(null)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-bg-main min-h-full">
      {/* ── payment modal ── */}
      {ventaId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <BlurFade delay={0} duration={0.25}>
            <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              {/* success indicator */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Venta #{ventaId} creada</p>
                  <p className="text-sm text-gray-500">Registra el método de pago</p>
                </div>
              </div>

              {/* metodo pago */}
              <div className="mb-4 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500" htmlFor="metodo_pago">
                  Método de pago
                </label>
                <div className="relative">
                  <select
                    id="metodo_pago"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                    className="h-10 w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {METODOS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* total a cobrar */}
              {ventaTotal !== null && (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                  <span className="text-sm text-gray-500">Total a cobrar</span>
                  <span className="font-bold tabular-nums text-gray-900">
                    S/ {fmt(ventaTotal)}
                  </span>
                </div>
              )}

              {/* monto */}
              <div className="mb-5 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500" htmlFor="monto_pago">
                  Monto cobrado (S/)
                </label>
                <input
                  id="monto_pago"
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  className={cn(
                    "h-10 w-full rounded-xl border bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500",
                    ventaTotal !== null &&
                      parseFloat(montoPago) > 0 &&
                      Math.abs(parseFloat(montoPago) - ventaTotal) > 0.01
                      ? "border-red-300"
                      : "border-gray-300"
                  )}
                />
                {ventaTotal !== null &&
                  parseFloat(montoPago) > 0 &&
                  Math.abs(parseFloat(montoPago) - ventaTotal) > 0.01 && (
                    <p className="text-xs text-red-500">
                      Diferencia: S/ {fmt(Math.abs(parseFloat(montoPago) - ventaTotal))}
                    </p>
                  )}
              </div>

              {/* pago error */}
              {pagoError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-xs text-red-600">{pagoError}</p>
                </div>
              )}

              {/* actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleOmitirPago}
                  className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Omitir
                </button>
                <Button
                  onClick={handlePago}
                  disabled={pagoSubmitting}
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {pagoSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Registrar pago
                </Button>
              </div>
            </div>
          </BlurFade>
        </div>
      )}

      <div className="flex">
        {/* ══════════ LEFT: product search + grid ══════════ */}
        <div className="flex-1 min-w-0 p-4 sm:p-6">
          {/* Page header */}
          <BlurFade delay={0} duration={0.5}>
            <div className="mb-8">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50">
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
                <h1 className="text-2xl font-bold text-text-heading">Catálogo</h1>
              </div>
              <p className="mt-1.5 text-sm text-text-muted">
                Selecciona productos para agregar al carrito
              </p>
            </div>
          </BlurFade>

          {/* Controls */}
          <BlurFade delay={0.08} duration={0.5}>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search input */}
              <div className="relative max-w-sm flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar producto…"
                  className="pl-9"
                />
              </div>

              {/* Stock toggle */}
              <label className="flex cursor-pointer items-center gap-2.5 select-none">
                <div
                  role="switch"
                  aria-checked={soloConStock}
                  onClick={() => handleToggleStock(!soloConStock)}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors duration-200",
                    soloConStock ? "bg-blue-500" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                      soloConStock ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </div>
                <span className="text-sm text-gray-600">Solo con stock</span>
              </label>
            </div>
          </BlurFade>

          {/* Results count */}
          {!loading && !catalogoError && (
            <BlurFade delay={0.12} duration={0.4}>
              <p className="mb-4 text-xs text-gray-500">
                {catalogoItems.length === 0
                  ? "Sin resultados"
                  : `${catalogoItems.length} producto${catalogoItems.length !== 1 ? "s" : ""}`}
              </p>
            </BlurFade>
          )}

          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && catalogoError && (
            <BlurFade delay={0} duration={0.4}>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
                <p className="mb-1 text-sm font-medium text-gray-900">Error al cargar</p>
                <p className="mb-5 max-w-xs text-xs text-gray-500">{catalogoError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchItems(search, soloConStock)}
                >
                  Reintentar
                </Button>
              </div>
            </BlurFade>
          )}

          {/* Empty state */}
          {!loading && !catalogoError && catalogoItems.length === 0 && (
            <BlurFade delay={0} duration={0.4}>
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">Sin resultados</p>
                <p className="text-xs text-gray-400">
                  {search
                    ? `No hay resultados para "${search}"`
                    : soloConStock
                      ? "No hay productos con stock disponible"
                      : "Prueba con otro término de búsqueda"}
                </p>
              </div>
            </BlurFade>
          )}

          {/* Product grid */}
          {!loading && !catalogoError && catalogoItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {catalogoItems.map((item, i) => (
                <ProductCard
                  key={item.id_item}
                  item={item}
                  delay={i * 0.05}
                  onAdd={addToCart}
                  inCart={cartItems.some((c) => c.id_item === item.id_item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ══════════ RIGHT: cart sidebar ══════════ */}
        <div className="hidden lg:flex lg:w-[380px] xl:w-[400px] shrink-0 flex-col border-l border-gray-200 bg-white min-h-screen sticky top-0 h-screen overflow-y-auto">
          {/* Cart header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Carrito</h2>
              {cartItems.length > 0 && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-500">
                  {cartItems.length}
                </span>
              )}
            </div>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => setCartItems([])}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Vaciar
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="max-h-[280px] overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 px-5">
                <ShoppingCart className="h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-400 text-center">
                  Agrega productos desde el catálogo
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 px-4 py-2">
                {cartItems.map((c) => (
                  <li key={c.id_item} className="flex items-start gap-3 py-3">
                    {/* info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{c.producto}</p>
                      <p className="font-mono text-xs text-gray-400">{c.sku}</p>
                    </div>

                    {/* qty controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(c.id_item, -1)}
                        disabled={c.cantidad <= 1}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Reducir cantidad"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums font-medium text-gray-900">
                        {c.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(c.id_item, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
                        aria-label="Incrementar cantidad"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* importe */}
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                      S/ {fmt(c.importe)}
                    </span>

                    {/* remove */}
                    <button
                      type="button"
                      onClick={() => removeItem(c.id_item)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="Eliminar producto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Summary section */}
          <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-sm tabular-nums text-gray-700">S/ {fmt(subtotal)}</span>
            </div>

            {/* Descuento */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Descuento</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setTipoDescuento("porcentaje")}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                        tipoDescuento === "porcentaje"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoDescuento("monto_fijo")}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                        tipoDescuento === "monto_fijo"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      S/
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={tipoDescuento === "porcentaje" ? 100 : subtotal}
                    step="0.01"
                    value={valorDescuento}
                    onChange={(e) => setValorDescuento(e.target.value)}
                    className="h-7 w-20 rounded-lg border border-gray-300 bg-white px-2 text-right text-xs tabular-nums text-gray-900 focus:border-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              {montoDescuento > 0 && (
                <div className="mt-1 flex justify-end">
                  <span className="text-xs tabular-nums text-emerald-600">
                    -S/ {fmt(montoDescuento)}
                  </span>
                </div>
              )}
              {montoDescuento > 0 && (
                <input
                  type="text"
                  placeholder="Motivo del descuento (requerido)"
                  value={justificacionDescuento}
                  onChange={(e) => setJustificacionDescuento(e.target.value)}
                  className="mt-2 h-8 w-full rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Divider + Total */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold tabular-nums text-gray-900">
                S/ {fmt(total)}
              </span>
            </div>

            {/* A cobrar highlight */}
            <div className="rounded-xl border border-[#ACF847]/30 bg-gradient-to-br from-[#020617] to-[#131B2E] px-4 py-3">
              <p className="text-xs font-medium text-[#94A3B8] uppercase tracking-wide">A cobrar</p>
              <p className="mt-1 text-2xl font-bold text-[#ACF847] tabular-nums">
                S/ {fmt(total)}
              </p>
            </div>
          </div>

          {/* Client search */}
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Cliente</h3>
              <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                Opcional
              </span>
            </div>

            {selectedCliente ? (
              <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 uppercase">
                  {selectedCliente.nombre_completo.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-blue-700">
                    {selectedCliente.nombre_completo}
                  </p>
                  <p className="text-xs text-gray-500">{selectedCliente.nro_documento}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCliente(null)
                    setClienteSearch("")
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Quitar cliente"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={clienteDropdownRef}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o documento…"
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    onFocus={() => setShowClienteDropdown(true)}
                    className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {showClienteDropdown && filteredClientes.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {filteredClientes.map((c) => (
                      <button
                        key={c.id_cliente}
                        type="button"
                        onClick={() => {
                          setSelectedCliente(c)
                          setClienteSearch("")
                          setShowClienteDropdown(false)
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 uppercase">
                          {c.nombre_completo.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {c.nombre_completo}
                          </p>
                          <p className="text-xs text-gray-400">
                            {c.tipo_documento} {c.nro_documento}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedCliente && (
              <p className="mt-2 text-xs text-gray-400">
                Sin cliente se registra como consumidor anónimo
              </p>
            )}
          </div>

          {/* Submit error */}
          {error && (
            <div className="mx-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Realizar venta button */}
          <div className="mt-auto border-t border-gray-100 px-5 py-4">
            <Button
              onClick={handleSubmit}
              disabled={cartItems.length === 0 || submitting}
              className="h-12 w-full gap-2 bg-[#ACF847] hover:bg-[#d4f96a] text-[#020617] text-base font-bold disabled:cursor-not-allowed disabled:opacity-40 shadow-[0_0_20px_rgba(172,248,71,0.3)]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Realizar venta
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile floating cart button — TODO: implement full mobile drawer */}
      <div className="fixed bottom-6 right-6 lg:hidden z-30">
        <button
          type="button"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#020617] text-[#ACF847] shadow-lg shadow-black/30 transition-transform active:scale-95"
          aria-label="Ver carrito"
        >
          <ShoppingCart className="h-6 w-6" />
          {cartItems.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ACF847] text-[10px] font-bold text-[#020617]">
              {cartItems.length}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
