"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftRight, CheckCircle2, ArrowLeft, ArrowRight,
  Search, Loader2, CalendarDays,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getVentaDetalle,
  searchVentas,
  createCambio,
  type VentaDetalle,
  type VentaDetalleItem,
  type VentaListItem,
} from "@/lib/api/cambios"
import { getCatalogo, type CatalogoItem } from "@/lib/api/catalogo"
import { ApiError } from "@/lib/api/client"

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Venta origen", "Item devuelto", "Item entregado", "Confirmar"]
const METODOS_PAGO = ["efectivo", "tarjeta", "transferencia", "yape", "plin"]
const MOTIVOS_CAMBIO = [
  { value: "defecto", label: "Defecto" },
  { value: "garantia", label: "Garantía" },
  { value: "otro", label: "Otro" },
] as const

const STEP_DESCRIPTIONS = [
  "Ingresa el número de venta para buscar los productos vendidos.",
  "Selecciona el producto que el cliente devuelve.",
  "Selecciona el producto que entregas como reemplazo.",
  "Revisa el resumen y completa los datos del cambio.",
]

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"

// ─── Step 1: Buscar venta ────────────────────────────────────────────────────

function Step1({
  ventaId,
  setVentaId,
  ventaData,
  loading,
  onSearch,
  fecha,
  setFecha,
  listaVentas,
  loadingLista,
  listaVisible,
  onListar,
  onSelectVenta,
}: {
  ventaId: string
  setVentaId: (v: string) => void
  ventaData: VentaDetalle | null
  loading: boolean
  onSearch: () => void
  fecha: string
  setFecha: (v: string) => void
  listaVentas: VentaListItem[]
  loadingLista: boolean
  listaVisible: boolean
  onListar: () => void
  onSelectVenta: (id: number) => void
}) {
  return (
    <div className="space-y-4">
      {/* ID search */}
      <div className="flex gap-2">
        <input
          type="number"
          className={inputCls}
          placeholder="Nº de venta (ej: 1042)"
          value={ventaId}
          onChange={(e) => setVentaId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          disabled={loading}
        />
        <button
          onClick={onSearch}
          disabled={loading || !ventaId.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </button>
      </div>

      {ventaData && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-semibold text-green-800">
              Venta #{ventaData.id_venta} encontrada
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
            <span className="text-gray-400">Cliente</span>
            <span className="font-medium text-gray-800">{ventaData.cliente ?? "Sin cliente"}</span>
            <span className="text-gray-400">Fecha</span>
            <span>{new Date(ventaData.fecha_emision).toLocaleDateString("es-PE")}</span>
            <span className="text-gray-400">Productos</span>
            <span>
              {ventaData.detalles.length} ítem{ventaData.detalles.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">o buscar por fecha</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Date search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <CalendarDays className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            className={cn(inputCls, "pl-8")}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            disabled={loadingLista}
          />
        </div>
        <button
          onClick={onListar}
          disabled={loadingLista || !fecha}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingLista ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
          Listar
        </button>
      </div>

      {/* Ventas list */}
      {listaVisible && (
        <div className="space-y-2">
          {loadingLista ? (
            <>
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </>
          ) : listaVentas.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin resultados</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pb-1">
              {listaVentas.map((v) => (
                <button
                  key={v.id_venta}
                  onClick={() => onSelectVenta(v.id_venta)}
                  disabled={loading || loadingLista}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-all",
                    ventaData?.id_venta === v.id_venta
                      ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Venta #{v.id_venta}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {v.cliente ?? "Sin cliente"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(v.fecha_emision).toLocaleDateString("es-PE")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {v.total_items} ítem{v.total_items !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Seleccionar item devuelto ───────────────────────────────────────

function Step2({
  selected,
  onSelect,
  cantidad,
  setCantidad,
  detalles,
}: {
  selected: VentaDetalleItem | null
  onSelect: (item: VentaDetalleItem) => void
  cantidad: number
  setCantidad: (n: number) => void
  detalles: VentaDetalleItem[]
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {detalles.map((item) => (
          <button
            key={item.id_item}
            onClick={() => onSelect(item)}
            className={cn(
              "w-full rounded-xl border p-3 text-left transition-all",
              selected?.id_item === item.id_item
                ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50",
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                <p className="mt-0.5 font-mono text-xs text-gray-400">{item.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  S/ {Number(item.precio_unitario_momento).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">Cant: {item.cantidad}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <span className="text-xs font-medium text-gray-500">Cantidad a devolver:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCantidad(Math.max(1, cantidad - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-gray-900">{cantidad}</span>
            <button
              onClick={() => setCantidad(Math.min(selected.cantidad, cantidad + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
            >
              +
            </button>
          </div>
          <span className="ml-auto text-xs text-gray-400">máx {selected.cantidad}</span>
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Seleccionar item entregado ─────────────────────────────────────

function Step3({
  selected,
  onSelect,
  search,
  setSearch,
  items,
  loading,
}: {
  selected: CatalogoItem | null
  onSelect: (item: CatalogoItem) => void
  search: string
  setSearch: (s: string) => void
  items: CatalogoItem[]
  loading: boolean
}) {
  const filtered = items.filter(
    (i) =>
      i.producto.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 max-h-72 overflow-y-auto pb-1">
          {filtered.map((item) => (
            <button
              key={item.id_item}
              onClick={() => onSelect(item)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-all",
                selected?.id_item === item.id_item
                  ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.producto}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">{item.sku}</p>
                </div>
                <div className="ml-2 shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    S/ {Number(item.precio_venta_actual).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">Stock: {item.stock_disponible}</p>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-2 py-8 text-center text-sm text-gray-400">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Confirmar ───────────────────────────────────────────────────────

function Step4({
  itemDevuelto,
  cantidadDevuelta,
  itemEntregado,
  motivo,
  setMotivo,
  detalle,
  setDetalle,
  metodoPago,
  setMetodoPago,
}: {
  itemDevuelto: VentaDetalleItem
  cantidadDevuelta: number
  itemEntregado: CatalogoItem
  motivo: string
  setMotivo: (s: string) => void
  detalle: string
  setDetalle: (s: string) => void
  metodoPago: string
  setMetodoPago: (s: string) => void
}) {
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"
  const precioDevuelto = Number(itemDevuelto.precio_unitario_momento) * cantidadDevuelta
  const precioEntregado = Number(itemEntregado.precio_venta_actual) * cantidadDevuelta
  const diferencia = precioEntregado - precioDevuelto

  return (
    <div className="space-y-5">
      {/* Resumen intercambio */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400">Devuelve</p>
            <p className="truncate text-sm font-semibold text-gray-900">{itemDevuelto.nombre}</p>
            <p className="text-xs text-gray-500">
              x{cantidadDevuelta} · S/ {precioDevuelto.toFixed(2)}
            </p>
          </div>
          <ArrowLeftRight className="h-4 w-4 shrink-0 text-gray-400" />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-xs text-gray-400">Recibe</p>
            <p className="truncate text-sm font-semibold text-gray-900">{itemEntregado.producto}</p>
            <p className="text-xs text-gray-500">
              x{cantidadDevuelta} · S/ {precioEntregado.toFixed(2)}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold",
            diferencia > 0
              ? "text-[var(--color-lime)]"
              : diferencia < 0
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600",
          )}
          style={diferencia > 0 ? { background: "var(--color-bg-dark)" } : undefined}
        >
          <span>
            {diferencia > 0
              ? "Diferencia a cobrar"
              : diferencia < 0
                ? "Diferencia a devolver"
                : "Sin diferencia"}
          </span>
          <span>S/ {Math.abs(diferencia).toFixed(2)}</span>
        </div>
      </div>

      {/* Método de pago (solo si hay diferencia) */}
      {diferencia !== 0 && (
        <div>
          <label className={labelCls}>Método de pago diferencia *</label>
          <div className="flex flex-wrap gap-2">
            {METODOS_PAGO.map((m) => (
              <button
                key={m}
                onClick={() => setMetodoPago(m)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  metodoPago === m
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Motivo */}
      <div>
        <label className={labelCls}>Motivo *</label>
        <select
          className={inputCls}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        >
          <option value="">Selecciona un motivo</option>
          {MOTIVOS_CAMBIO.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Detalle */}
      <div>
        <label className={labelCls}>Detalle (opcional)</label>
        <textarea
          className={cn(inputCls, "resize-none")}
          rows={3}
          placeholder="Descripción adicional..."
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NuevoCambioPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1
  const [ventaId, setVentaId] = useState("")
  const [loadingVenta, setLoadingVenta] = useState(false)
  const [ventaData, setVentaData] = useState<VentaDetalle | null>(null)

  // Step 1 — date search
  const today = new Date().toISOString().slice(0, 10)
  const [fechaBusqueda, setFechaBusqueda] = useState(today)
  const [listaVentas, setListaVentas] = useState<VentaListItem[]>([])
  const [loadingLista, setLoadingLista] = useState(false)
  const [listaVisible, setListaVisible] = useState(false)

  // Step 2
  const [itemDevuelto, setItemDevuelto] = useState<VentaDetalleItem | null>(null)
  const [cantidadDevuelta, setCantidadDevuelta] = useState(1)

  // Step 3
  const [itemEntregado, setItemEntregado] = useState<CatalogoItem | null>(null)
  const [catalogItems, setCatalogItems] = useState<CatalogoItem[]>([])
  const [catalogSearch, setCatalogSearch] = useState("")
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  // Step 4
  const [motivo, setMotivo] = useState("")
  const [detalle, setDetalle] = useState("")
  const [metodoPago, setMetodoPago] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (step !== 2) return
    setLoadingCatalog(true)
    getCatalogo({ con_stock: true })
      .then(setCatalogItems)
      .catch(() => toast.error("Error cargando catálogo"))
      .finally(() => setLoadingCatalog(false))
  }, [step])

  function canNext(): boolean {
    if (step === 0) return ventaData !== null
    if (step === 1) return itemDevuelto !== null
    if (step === 2) return itemEntregado !== null
    return false
  }

  async function handleSearch() {
    const id = parseInt(ventaId, 10)
    if (!id || id <= 0) return
    setLoadingVenta(true)
    setVentaData(null)
    try {
      const data = await getVentaDetalle(id)
      setVentaData(data)
      setListaVisible(false)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Venta no encontrada")
    } finally {
      setLoadingVenta(false)
    }
  }

  async function handleListar() {
    setLoadingLista(true)
    setListaVisible(true)
    try {
      const data = await searchVentas({ fecha: fechaBusqueda })
      setListaVentas(data)
    } catch {
      toast.error("Error al listar ventas")
    } finally {
      setLoadingLista(false)
    }
  }

  async function handleSelectVentaFromList(id: number) {
    setVentaId(String(id))
    setLoadingVenta(true)
    setVentaData(null)
    try {
      const data = await getVentaDetalle(id)
      setVentaData(data)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Venta no encontrada")
    } finally {
      setLoadingVenta(false)
    }
  }

  async function handleSubmit() {
    if (!motivo.trim()) {
      toast.error("El motivo es obligatorio")
      return
    }
    if (!ventaData || !itemDevuelto || !itemEntregado) return

    const precioDevuelto = Number(itemDevuelto.precio_unitario_momento) * cantidadDevuelta
    const precioEntregado = Number(itemEntregado.precio_venta_actual) * cantidadDevuelta
    const diferencia = Math.max(0, precioEntregado - precioDevuelto)

    if (diferencia > 0 && !metodoPago) {
      toast.error("Selecciona el método de pago para la diferencia")
      return
    }

    setSaving(true)
    try {
      await createCambio({
        id_venta_origen: ventaData.id_venta,
        id_item_devuelto: itemDevuelto.id_item,
        cantidad: cantidadDevuelta,
        precio_devuelto: Number(itemDevuelto.precio_unitario_momento),
        id_item_entregado: itemEntregado.id_item,
        precio_entregado: Number(itemEntregado.precio_venta_actual),
        diferencia_cobrada: diferencia,
        metodo_pago_dif: diferencia > 0 ? metodoPago : undefined,
        motivo: motivo.trim(),
        detalle: detalle.trim() || undefined,
      })
      toast.success("Cambio registrado correctamente")
      router.push("/dashboard/cambios")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al registrar el cambio")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Mobile header */}
      <div className="mb-5 md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/cambios")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Paso {step + 1} / 4
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-1 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Layout */}
      <div className="flex gap-6">
        {/* Sidebar (desktop only) */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                <ArrowLeftRight className="h-4 w-4 text-gray-700" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Nuevo cambio</span>
            </div>

            <nav className="space-y-1">
              {STEPS.map((label, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      i < step
                        ? "bg-blue-600 text-white"
                        : i === step
                          ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400"
                          : "bg-gray-100 text-gray-400",
                    )}
                  >
                    {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      i === step
                        ? "text-blue-700"
                        : i < step
                          ? "text-gray-600"
                          : "text-gray-400",
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </nav>

            <button
              onClick={() => router.push("/dashboard/cambios")}
              className="mt-6 w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <BlurFade key={step} delay={0} duration={0.25}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {/* Card header */}
              <div className="border-b border-gray-100 px-6 py-5">
                <h1 className="text-base font-semibold text-gray-900">{STEPS[step]}</h1>
                <p className="mt-0.5 text-sm text-gray-500">{STEP_DESCRIPTIONS[step]}</p>
              </div>

              {/* Card body */}
              <div className="p-6">
                {step === 0 && (
                  <Step1
                    ventaId={ventaId}
                    setVentaId={setVentaId}
                    ventaData={ventaData}
                    loading={loadingVenta}
                    onSearch={handleSearch}
                    fecha={fechaBusqueda}
                    setFecha={setFechaBusqueda}
                    listaVentas={listaVentas}
                    loadingLista={loadingLista}
                    listaVisible={listaVisible}
                    onListar={handleListar}
                    onSelectVenta={handleSelectVentaFromList}
                  />
                )}
                {step === 1 && ventaData && (
                  <Step2
                    selected={itemDevuelto}
                    onSelect={(item) => {
                      setItemDevuelto(item)
                      setCantidadDevuelta(1)
                    }}
                    cantidad={cantidadDevuelta}
                    setCantidad={setCantidadDevuelta}
                    detalles={ventaData.detalles}
                  />
                )}
                {step === 2 && (
                  <Step3
                    selected={itemEntregado}
                    onSelect={setItemEntregado}
                    search={catalogSearch}
                    setSearch={setCatalogSearch}
                    items={catalogItems}
                    loading={loadingCatalog}
                  />
                )}
                {step === 3 && itemDevuelto && itemEntregado && (
                  <Step4
                    itemDevuelto={itemDevuelto}
                    cantidadDevuelta={cantidadDevuelta}
                    itemEntregado={itemEntregado}
                    motivo={motivo}
                    setMotivo={setMotivo}
                    detalle={detalle}
                    setDetalle={setDetalle}
                    metodoPago={metodoPago}
                    setMetodoPago={setMetodoPago}
                  />
                )}
              </div>

              {/* Card footer */}
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <button
                  onClick={
                    step === 0
                      ? () => router.push("/dashboard/cambios")
                      : () => setStep((s) => s - 1)
                  }
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {step > 0 && <ArrowLeft className="h-4 w-4" />}
                  {step === 0 ? "Cancelar" : "Atrás"}
                </button>

                {step < 3 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canNext()}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Registrar cambio
                  </button>
                )}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  )
}
