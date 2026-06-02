"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  X,
  Package,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { getCatalogo, type CatalogoItem } from "@/lib/api/catalogo"
import { getClientes, type ClienteVista } from "@/lib/api/clientes"
import { createVenta, createPago, type CreatePagoInput } from "@/lib/api/ventas"

// ─── types ───────────────────────────────────────────────────────────────────

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

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── component ───────────────────────────────────────────────────────────────

export default function NuevaVentaPage() {
  const router = useRouter()

  // catalog
  const [catalogoItems, setCatalogoItems] = useState<CatalogoItem[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(true)
  const [catalogoError, setCatalogoError] = useState<string | null>(null)

  // product search (client-side filter)
  const [busquedaProducto, setBusquedaProducto] = useState("")

  // cart
  const [items, setItems] = useState<CartItem[]>([])

  // client search
  const [clienteSearch, setClienteSearch] = useState("")
  const [allClientes, setAllClientes] = useState<ClienteVista[]>([])
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteVista | null>(null)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)

  // submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // payment modal (shown after venta created)
  const [ventaId, setVentaId] = useState<number | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [montoPago, setMontoPago] = useState<string>("")
  const [pagoSubmitting, setPagoSubmitting] = useState(false)
  const [pagoError, setPagoError] = useState<string | null>(null)

  // discount
  const [tipoDescuento, setTipoDescuento] = useState<"porcentaje" | "monto_fijo">("monto_fijo")
  const [valorDescuento, setValorDescuento] = useState<string>("0")
  const [justificacionDescuento, setJustificacionDescuento] = useState<string>("")
  const [ventaTotal, setVentaTotal] = useState<number | null>(null)

  // ── load catalog + all clients on mount ──
  useEffect(() => {
    getCatalogo({ con_stock: true })
      .then((data) => {
        const seen = new Set<number>()
        setCatalogoItems(
          data.filter(
            (i) => !seen.has(i.id_item) && (seen.add(i.id_item) as unknown as true)
          )
        )
      })
      .catch((err) =>
        setCatalogoError(err instanceof Error ? err.message : "Error al cargar catálogo")
      )
      .finally(() => setCatalogoLoading(false))
    getClientes().then(setAllClientes).catch(() => {})
  }, [])

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

  const filteredClientes = clienteSearch.trim()
    ? allClientes.filter(
        (c) =>
          c.nombre_completo.toLowerCase().includes(clienteSearch.toLowerCase()) ||
          c.nro_documento.includes(clienteSearch)
      )
    : allClientes

  // ── cart operations ──
  const addToCart = useCallback((item: CatalogoItem) => {
    setItems((prev) => {
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
    setItems((prev) =>
      prev.map((c) => {
        if (c.id_item !== id_item) return c
        const newQty = Math.max(1, c.cantidad + delta)
        return { ...c, cantidad: newQty, importe: newQty * c.precio_unitario_momento }
      })
    )
  }, [])

  const removeItem = useCallback((id_item: number) => {
    setItems((prev) => prev.filter((c) => c.id_item !== id_item))
  }, [])

  // ── derived ──
  const subtotal = items.reduce((s, c) => s + c.importe, 0)
  const montoDescuento = (() => {
    const v = parseFloat(valorDescuento) || 0
    if (tipoDescuento === "porcentaje") return Math.min(subtotal, (subtotal * v) / 100)
    return Math.min(subtotal, Math.max(0, v))
  })()
  const total = subtotal - montoDescuento

  const filteredCatalogo = catalogoItems.filter((item) =>
    busquedaProducto.trim()
      ? item.producto.toLowerCase().includes(busquedaProducto.toLowerCase().trim()) ||
        item.sku.toLowerCase().includes(busquedaProducto.toLowerCase().trim())
      : true
  )

  // ── submit venta ──
  async function handleSubmit() {
    if (items.length === 0 || submitting) return
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
        items: items.map((item) => ({
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
      await createPago(ventaId, {
        metodo_pago: metodoPago,
        monto,
      })
      router.push(`/dashboard/ventas/${ventaId}`)
    } catch (err) {
      setPagoError(err instanceof Error ? err.message : "Error al registrar el pago")
    } finally {
      setPagoSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-bg-main p-6 lg:p-8">
      {/* ── header ── */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/ventas")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
            aria-label="Volver a ventas"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nueva venta</h1>
            <p className="text-sm text-gray-500">Selecciona productos y registra el pago</p>
          </div>
        </div>
      </BlurFade>

      {/* ── payment modal (appears after venta created) ── */}
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
                  className={`h-10 w-full rounded-xl border bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    ventaTotal !== null &&
                    parseFloat(montoPago) > 0 &&
                    Math.abs(parseFloat(montoPago) - ventaTotal) > 0.01
                      ? "border-red-300"
                      : "border-gray-300"
                  }`}
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
                  onClick={() => router.push(`/dashboard/ventas/${ventaId}`)}
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

      {/* ── main layout ── */}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* ══════════ LEFT: search + cart ══════════ */}
        <div className="flex flex-col gap-5 lg:w-2/3">
          {/* product search */}
          <BlurFade delay={0.06} duration={0.4}>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Catálogo</h2>
              </div>

              {/* search input */}
              <div className="p-4 pb-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o SKU…"
                    value={busquedaProducto}
                    onChange={(e) => setBusquedaProducto(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* catalog state */}
              {catalogoLoading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}

              {!catalogoLoading && catalogoError && (
                <div className="flex items-center gap-2 px-5 py-4 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {catalogoError}
                </div>
              )}

              {/* product list */}
              {!catalogoLoading && !catalogoError && (
                <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto px-4 pb-4">
                  {filteredCatalogo.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Package className="h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-400">
                        {busquedaProducto ? "Sin resultados" : "Sin productos disponibles"}
                      </p>
                    </div>
                  ) : (
                    filteredCatalogo.map((item) => {
                      const precio = item.precio_con_descuento ?? item.precio_venta_actual
                      const inCart = items.some((c) => c.id_item === item.id_item)
                      return (
                        <button
                          key={item.id_item}
                          type="button"
                          onClick={() => addToCart(item)}
                          className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gray-50"
                        >
                          {/* icon */}
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                            <Package className="h-4 w-4 text-blue-500" />
                          </div>

                          {/* info */}
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {item.producto}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-400">{item.sku}</span>
                              {item.promo_nombre && (
                                <span className="rounded bg-amber-50 px-1 text-[10px] font-medium text-amber-600">
                                  {item.promo_nombre}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* price + stock */}
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-gray-900">
                              S/ {fmt(precio)}
                            </p>
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                item.stock_disponible > 0
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {item.stock_disponible} stock
                            </span>
                          </div>

                          {/* add indicator */}
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                              inCart
                                ? "bg-blue-100 text-blue-500"
                                : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                            }`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </BlurFade>

          {/* cart */}
          <BlurFade delay={0.12} duration={0.4}>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900">Carrito</h2>
                </div>
                {items.length > 0 && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-500">
                    {items.length} ítem{items.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <ShoppingCart className="h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">El carrito está vacío</p>
                  <p className="text-xs text-gray-300">Agrega productos desde el catálogo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-600">
                        <th className="px-5 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-white/80 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-white/80 uppercase tracking-wider">
                          P. Unit.
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-white/80 uppercase tracking-wider">
                          Importe
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((c) => (
                        <tr key={c.id_item} className="hover:bg-gray-50">
                          {/* producto */}
                          <td className="px-5 py-3">
                            <p className="max-w-[180px] truncate font-medium text-gray-900">
                              {c.producto}
                            </p>
                            <span className="font-mono text-xs text-gray-400">{c.sku}</span>
                          </td>

                          {/* qty controls */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
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
                          </td>

                          {/* unit price */}
                          <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                            S/ {fmt(c.precio_unitario_momento)}
                          </td>

                          {/* importe */}
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                            S/ {fmt(c.importe)}
                          </td>

                          {/* remove */}
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeItem(c.id_item)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              aria-label="Eliminar producto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </BlurFade>
        </div>

        {/* ══════════ RIGHT: order summary ══════════ */}
        <div className="flex flex-col gap-5 lg:w-1/3">
          <BlurFade delay={0.08} duration={0.4}>
            <div className="sticky top-6 flex flex-col gap-4">
              {/* summary card */}
              <div className="rounded-2xl border border-blue-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">Resumen</h2>
                </div>
                <div className="p-5">
                  {/* subtotal */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Subtotal</span>
                    <span className="text-sm tabular-nums text-gray-700">
                      S/ {fmt(subtotal)}
                    </span>
                  </div>

                  {/* descuento */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Descuento</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                          <button
                            type="button"
                            onClick={() => setTipoDescuento("porcentaje")}
                            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                              tipoDescuento === "porcentaje"
                                ? "bg-white shadow-sm text-gray-900"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setTipoDescuento("monto_fijo")}
                            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                              tipoDescuento === "monto_fijo"
                                ? "bg-white shadow-sm text-gray-900"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
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

                  <div className="mb-5 flex items-center justify-between border-t border-gray-200 pt-4">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold tabular-nums text-gray-900">
                      S/ {fmt(total)}
                    </span>
                  </div>

                  {/* total highlight */}
                  <div className="rounded-lg bg-blue-50 px-4 py-3 mb-3">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                      A cobrar
                    </p>
                    <p className="mt-1 text-2xl font-bold text-blue-700 tabular-nums">
                      S/ {fmt(total)}
                    </p>
                  </div>

                  {/* items count */}
                  <p className="text-center text-xs text-gray-400">
                    {items.length === 0
                      ? "Sin productos en el carrito"
                      : `${items.reduce((s, c) => s + c.cantidad, 0)} unidad${
                          items.reduce((s, c) => s + c.cantidad, 0) !== 1 ? "es" : ""
                        } · ${items.length} producto${items.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              {/* client search */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">Cliente</h3>
                  <span className="ml-auto text-xs text-gray-400">Opcional</span>
                </div>

                {selectedCliente ? (
                  /* selected client chip */
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
                  /* client search input + dropdown */
                  <div className="relative" ref={clienteDropdownRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar cliente por nombre o documento…"
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        onFocus={() => setShowClienteDropdown(true)}
                        className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* results dropdown */}
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
                    Opcional — sin cliente se registra como consumidor anónimo
                  </p>
                )}
              </div>

              {/* submit error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* CTA */}
              <Button
                onClick={handleSubmit}
                disabled={items.length === 0 || submitting}
                className="h-12 w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registrando…
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Registrar venta
                  </>
                )}
              </Button>

              {items.length === 0 && (
                <p className="text-center text-xs text-gray-400">
                  Agrega al menos un producto para continuar
                </p>
              )}
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  )
}
