"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PlusCircle,
  Receipt,
  Search,
  UserPlus,
  X,
  Zap,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import { cn, formatNum } from "@/lib/utils"
import { toast } from "sonner"
import { getClientes, createCliente, type ClienteVista } from "@/lib/api/clientes"
import { createVenta, createPago, emitirBoleta, type CreatePagoInput } from "@/lib/api/ventas"

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

type MetodoPago = CreatePagoInput["metodo_pago"]

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "otro", label: "Otro" },
]

const TIPOS_DOC = ["DNI", "CE", "pasaporte"] as const

const fmt = (n: number) => formatNum(n)

export default function VentaPage() {
  const router = useRouter()

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)

  useEffect(() => {
    // Razonamiento: diferir hidratación evita setState síncrono dentro del efecto inicial.
    const loadCartTimeout = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("guru_cart_v1")
        if (saved) setCartItems(JSON.parse(saved) as CartItem[])
      } catch { /* ignore */ }
      setCartLoaded(true)
    }, 0)
    return () => window.clearTimeout(loadCartTimeout)
  }, [])

  // redirect if cart is empty after load
  useEffect(() => {
    if (cartLoaded && cartItems.length === 0) {
      router.replace("/dashboard/catalogo/carrito")
    }
  }, [cartLoaded, cartItems, router])

  // discount
  const [tipoDescuento, setTipoDescuento] = useState<"porcentaje" | "monto_fijo">("monto_fijo")
  const [valorDescuento, setValorDescuento] = useState("0")
  const [justificacionDescuento, setJustificacionDescuento] = useState("")

  // client
  const [allClientes, setAllClientes] = useState<ClienteVista[]>([])
  const [clienteSearch, setClienteSearch] = useState("")
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteVista | null>(null)
  const clienteDropdownRef = useRef<HTMLDivElement>(null)
  const clientesLoadedRef = useRef(false)

  // create client
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTipoDoc, setNewTipoDoc] = useState<"DNI" | "CE" | "pasaporte">("DNI")
  const [newNroDoc, setNewNroDoc] = useState("")
  const [newNombre, setNewNombre] = useState("")
  const [newTelefono, setNewTelefono] = useState("")
  const [newDireccion, setNewDireccion] = useState("")
  const [creatingCliente, setCreatingCliente] = useState(false)

  // payments
  const [pagos, setPagos] = useState<{ metodo: MetodoPago; monto: string }[]>([
    { metodo: "efectivo", monto: "" },
  ])

  // submission
  const [submitting, setSubmitting] = useState(false)
  const [saleSuccess, setSaleSuccess] = useState(false)
  const [boletaUrl, setBoletaUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!clientesLoadedRef.current) {
      clientesLoadedRef.current = true
      getClientes().then(setAllClientes).catch(() => {})
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick, { passive: true })
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const subtotal = useMemo(() => cartItems.reduce((s, c) => s + c.importe, 0), [cartItems])

  const montoDescuento = useMemo(() => {
    const v = parseFloat(valorDescuento) || 0
    if (tipoDescuento === "porcentaje") return Math.min(subtotal, (subtotal * v) / 100)
    return Math.min(subtotal, Math.max(0, v))
  }, [subtotal, tipoDescuento, valorDescuento])

  const total = subtotal - montoDescuento

  const totalPagado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const restante = Math.max(0, total - totalPagado)
  const vuelto = Math.max(0, totalPagado - total)

  const totalItems = useMemo(() => cartItems.reduce((s, c) => s + c.cantidad, 0), [cartItems])

  const filteredClientes = useMemo(
    () =>
      clienteSearch.trim()
        ? allClientes.filter(
            (c) =>
              c.nombre_completo.toLowerCase().includes(clienteSearch.toLowerCase()) ||
              c.nro_documento.includes(clienteSearch)
          )
        : allClientes,
    [clienteSearch, allClientes]
  )

  function addPago() {
    setPagos((prev) => [...prev, { metodo: "efectivo", monto: "" }])
  }

  function removePago(idx: number) {
    setPagos((prev) => prev.filter((_, i) => i !== idx))
  }

  function updatePago(idx: number, field: "metodo" | "monto", value: string) {
    setPagos((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
  }

  function fillRestante(idx: number) {
    const otros = pagos.reduce((s, p, i) => (i === idx ? s : s + (parseFloat(p.monto) || 0)), 0)
    const needed = Math.max(0, total - otros)
    updatePago(idx, "monto", needed > 0 ? needed.toFixed(2) : "")
  }

  async function handleCreateCliente() {
    if (!newNroDoc.trim() || !newNombre.trim()) {
      toast.error("Nro. documento y nombre son requeridos")
      return
    }
    setCreatingCliente(true)
    try {
      const cliente = await createCliente({
        tipo_documento: newTipoDoc,
        nro_documento: newNroDoc.trim(),
        nombre_completo: newNombre.trim(),
        telefono: newTelefono.trim() || undefined,
        direccion_completa: newDireccion.trim() || undefined,
      })
      setSelectedCliente(cliente)
      setAllClientes((prev) => [cliente, ...prev])
      setShowCreateForm(false)
      setNewNroDoc("")
      setNewNombre("")
      setNewTelefono("")
      setNewDireccion("")
      setNewTipoDoc("DNI")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear cliente")
    } finally {
      setCreatingCliente(false)
    }
  }

  async function handleConfirmSale() {
    if (cartItems.length === 0 || submitting) return

    if (montoDescuento > 0 && !justificacionDescuento.trim()) {
      toast.error("Ingresa el motivo del descuento")
      return
    }
    const pagosValidos = pagos.filter((p) => parseFloat(p.monto) > 0)
    if (pagosValidos.length === 0) {
      toast.error("Ingresa al menos un pago")
      return
    }
    if (restante > 0.01) {
      toast.error(`Falta cubrir S/ ${fmt(restante)} del total`)
      return
    }

    setSubmitting(true)
    try {
      const descuentoPayload =
        montoDescuento > 0
          ? {
              monto_descuento: parseFloat(valorDescuento) || 0,
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
          precio_normal_momento: item.precio_normal_momento ?? null,
          costo_unitario_momento: Number(item.costo_unitario_momento),
          importe: Number(item.importe),
        })),
        ...descuentoPayload,
      })

      await Promise.all(
        pagosValidos.map((pago) =>
          createPago(venta.id_venta, { metodo_pago: pago.metodo, monto: parseFloat(pago.monto) })
        )
      )

      try {
        const boleta = await emitirBoleta(venta.id_venta)
        setBoletaUrl(boleta.url_pdf)
      } catch {
        setBoletaUrl(null)
      }

      localStorage.setItem("guru_cart_v1", JSON.stringify([]))
      setSaleSuccess(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar la venta")
    } finally {
      setSubmitting(false)
    }
  }

  if (!cartLoaded) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (saleSuccess) {
    return (
      <div className="bg-bg-main min-h-full flex items-center justify-center px-4">
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center gap-5 text-center max-w-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">¡Venta registrada!</p>
              <p className="mt-1 text-sm text-gray-500">Total cobrado: S/ {fmt(total)}</p>
            </div>
            {boletaUrl ? (
              <a
                href={boletaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <Receipt className="h-4 w-4" />
                Ver boleta PDF
              </a>
            ) : (
              <p className="text-xs text-gray-400">Boleta disponible en historial de ventas</p>
            )}
            <button
              onClick={() => router.push("/dashboard/catalogo")}
              className="mt-2 flex items-center gap-2 rounded-xl bg-[#020617] text-lime px-5 py-2.5 text-sm font-semibold hover:bg-[#0d1b38] transition-colors"
            >
              Volver al catálogo
            </button>
          </div>
        </BlurFade>
      </div>
    )
  }

  return (
    <div className="bg-bg-main min-h-full">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">

        {/* Header */}
        <BlurFade delay={0} duration={0.4}>
          <div className="flex items-center gap-3 mb-8">
            <motion.button
              initial="rest"
              whileHover="hover"
              whileTap={{ scale: 0.96 }}
              onClick={() => router.back()}
              className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-2.5 cursor-pointer"
              aria-label="Volver al carrito"
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
                Carrito
              </span>
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <Receipt className="h-4 w-4 text-gray-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-heading">Registrar venta</h1>
                <p className="text-sm text-text-muted">
                  {totalItems} producto{totalItems !== 1 ? "s" : ""} · S/ {fmt(subtotal)}
                </p>
              </div>
            </div>
          </div>
        </BlurFade>

        <div className="flex flex-col gap-6">

          {/* Resumen de productos */}
          <BlurFade delay={0.05} duration={0.4}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Productos</h2>
              <ul className="divide-y divide-gray-100">
                {cartItems.map((item) => (
                  <li key={item.id_item} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{item.producto}</p>
                      <p className="text-xs text-gray-400">
                        {item.cantidad} × S/ {fmt(item.precio_unitario_momento)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                      S/ {fmt(item.importe)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </BlurFade>

          {/* Descuento */}
          <BlurFade delay={0.08} duration={0.4}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Descuento</h2>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTipoDescuento("porcentaje")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
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
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
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
                  className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm tabular-nums text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {montoDescuento > 0 && (
                  <span className="shrink-0 text-sm font-semibold text-emerald-600 tabular-nums">
                    -S/ {fmt(montoDescuento)}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {montoDescuento > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Motivo del descuento (requerido)"
                        value={justificacionDescuento}
                        onChange={(e) => setJustificacionDescuento(e.target.value)}
                        className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </BlurFade>

          {/* Cliente */}
          <BlurFade delay={0.11} duration={0.4}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cliente</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">Opcional</span>
              </div>

              {selectedCliente ? (
                <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 uppercase">
                    {selectedCliente.nombre_completo.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-blue-700">
                      {selectedCliente.nombre_completo}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedCliente.tipo_documento} {selectedCliente.nro_documento}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedCliente(null); setClienteSearch("") }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 transition-colors"
                    aria-label="Quitar cliente"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="relative" ref={clienteDropdownRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o documento…"
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        onFocus={() => setShowClienteDropdown(true)}
                        className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {showClienteDropdown && filteredClientes.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
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
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 uppercase">
                              {c.nombre_completo.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">{c.nombre_completo}</p>
                              <p className="text-xs text-gray-400">{c.tipo_documento} {c.nro_documento}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateForm((v) => !v)}
                    className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <UserPlus className="h-4 w-4" />
                    Crear cliente nuevo
                    <ChevronDown
                      className={cn(
                        "ml-auto h-4 w-4 transition-transform duration-200",
                        showCreateForm && "rotate-180"
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {showCreateForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <div className="flex gap-2">
                            <div className="relative w-28 shrink-0">
                              <select
                                value={newTipoDoc}
                                onChange={(e) => setNewTipoDoc(e.target.value as typeof newTipoDoc)}
                                className="h-9 w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 pr-7 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {TIPOS_DOC.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Nro. documento *"
                              value={newNroDoc}
                              onChange={(e) => setNewNroDoc(e.target.value)}
                              className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Nombre completo *"
                            value={newNombre}
                            onChange={(e) => setNewNombre(e.target.value)}
                            className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              placeholder="Teléfono"
                              value={newTelefono}
                              onChange={(e) => setNewTelefono(e.target.value)}
                              className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="Dirección"
                              value={newDireccion}
                              onChange={(e) => setNewDireccion(e.target.value)}
                              className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <Button
                            onClick={handleCreateCliente}
                            disabled={creatingCliente || !newNroDoc.trim() || !newNombre.trim()}
                            size="sm"
                            className="h-9 w-full gap-2 bg-[#020617] text-white hover:bg-[#0d1b38] disabled:opacity-40"
                          >
                            {creatingCliente ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" />
                            )}
                            Crear cliente
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </BlurFade>

          {/* Pagos */}
          <BlurFade delay={0.14} duration={0.4}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Pagos</h2>

              <div className="flex flex-col gap-2">
                {pagos.map((pago, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative w-36 shrink-0">
                      <select
                        value={pago.metodo}
                        onChange={(e) => updatePago(idx, "metodo", e.target.value)}
                        className="h-9 w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 pr-7 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {METODOS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S/</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pago.monto}
                        onChange={(e) => updatePago(idx, "monto", e.target.value)}
                        placeholder={fmt(restante > 0 ? restante : 0)}
                        className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm tabular-nums text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {restante > 0.01 && !pago.monto && (
                      <button
                        type="button"
                        onClick={() => fillRestante(idx)}
                        className="shrink-0 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors whitespace-nowrap"
                      >
                        +{fmt(restante)}
                      </button>
                    )}
                    {pagos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePago(idx)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        aria-label="Quitar pago"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addPago}
                className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
              >
                <PlusCircle className="h-4 w-4" />
                Agregar otro medio de pago
              </button>

              <AnimatePresence>
                {totalPagado > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Pagado</span>
                        <span className="tabular-nums font-medium text-gray-900">S/ {fmt(totalPagado)}</span>
                      </div>
                      {restante > 0.01 && (
                        <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                          <span className="text-sm text-red-700">Pendiente</span>
                          <span className="text-sm font-bold tabular-nums text-red-700">S/ {fmt(restante)}</span>
                        </div>
                      )}
                      {vuelto > 0.01 && (
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                          <span className="text-sm text-emerald-700">Vuelto</span>
                          <span className="text-sm font-bold tabular-nums text-emerald-700">S/ {fmt(vuelto)}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </BlurFade>

          {/* Footer total + confirm */}
          <BlurFade delay={0.17} duration={0.4}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                {montoDescuento > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Descuento</span>
                    <span className="tabular-nums text-emerald-600">-S/ {fmt(montoDescuento)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-3xl font-bold tabular-nums text-[#020617]">S/ {fmt(total)}</span>
                </div>
              </div>

              <InteractiveHoverButton
                onClick={handleConfirmSale}
                disabled={submitting || cartItems.length === 0}
                text={submitting ? "Registrando…" : "Confirmar venta"}
                icon={submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                className="h-14 w-full rounded-xl bg-lime text-[#020617] text-base shadow-[0_0_20px_rgba(172,248,71,0.3)]"
              />
            </div>
          </BlurFade>

        </div>
      </div>
    </div>
  )
}
