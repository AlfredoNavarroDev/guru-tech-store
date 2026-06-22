"use client"

import { useState } from "react"
import { X, ArrowRight, ArrowLeft, CheckCircle2, Search, ArrowLeftRight } from "lucide-react"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Static mock data ────────────────────────────────────────────────────────

const MOCK_VENTA = {
  id_venta: 1042,
  fecha_emision: "2026-06-20T14:32:00Z",
  cliente: "Juan Pérez",
  nro_documento: "47123456",
}

const MOCK_DETALLE = [
  { id_detalle_v: 1, id_item: 10, nombre: "Laptop ASUS VivoBook 15", sku: "PRD-001", precio_unitario_momento: 2200, cantidad: 1 },
  { id_detalle_v: 2, id_item: 11, nombre: "Mouse Logitech MX3", sku: "PRD-022", precio_unitario_momento: 180, cantidad: 2 },
]

const MOCK_CATALOGO = [
  { id_item: 20, nombre: "Laptop ASUS VivoBook 16", sku: "PRD-002", precio_venta_actual: 2350 },
  { id_item: 21, nombre: "Laptop HP Pavilion 15", sku: "PRD-003", precio_venta_actual: 2100 },
  { id_item: 22, nombre: "Mouse Logitech G502", sku: "PRD-031", precio_venta_actual: 210 },
  { id_item: 23, nombre: "Mouse Redragon M711", sku: "PRD-032", precio_venta_actual: 120 },
]

const METODOS_PAGO = ["efectivo", "tarjeta", "transferencia", "yape", "plin"]

// ─── Types ───────────────────────────────────────────────────────────────────

interface DetalleItem {
  id_detalle_v: number
  id_item: number
  nombre: string
  sku: string
  precio_unitario_momento: number
  cantidad: number
}

interface CatalogoItem {
  id_item: number
  nombre: string
  sku: string
  precio_venta_actual: number
}

// ─── Step indicators ─────────────────────────────────────────────────────────

const STEPS = ["Venta origen", "Item devuelto", "Item entregado", "Confirmar"]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 px-5 pt-4 pb-3">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
          <div className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
            i < current ? "bg-blue-600 text-white" :
            i === current ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400" :
            "bg-gray-100 text-gray-400"
          )}>
            {i < current ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={cn(
            "hidden sm:block truncate text-xs font-medium",
            i === current ? "text-blue-700" : i < current ? "text-blue-500" : "text-gray-400"
          )}>
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn("h-px flex-1 ml-1", i < current ? "bg-blue-300" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Buscar venta ─────────────────────────────────────────────────────

function Step1({
  ventaId,
  setVentaId,
  ventaFound,
  onSearch,
}: {
  ventaId: string
  setVentaId: (v: string) => void
  ventaFound: boolean
  onSearch: () => void
}) {
  const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Ingresa el número de venta para buscar los productos vendidos.</p>
      <div className="flex gap-2">
        <input
          type="number"
          className={inputCls}
          placeholder="Nº de venta (ej: 1042)"
          value={ventaId}
          onChange={(e) => setVentaId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <button
          onClick={onSearch}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          <Search className="h-4 w-4" />
          Buscar
        </button>
      </div>

      {ventaFound && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-semibold text-green-800">Venta #{MOCK_VENTA.id_venta} encontrada</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
            <span className="text-gray-400">Cliente</span>
            <span className="font-medium text-gray-800">{MOCK_VENTA.cliente}</span>
            <span className="text-gray-400">DNI</span>
            <span className="font-mono">{MOCK_VENTA.nro_documento}</span>
            <span className="text-gray-400">Fecha</span>
            <span>{new Date(MOCK_VENTA.fecha_emision).toLocaleDateString("es-PE")}</span>
            <span className="text-gray-400">Productos</span>
            <span>{MOCK_DETALLE.length} ítems</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Seleccionar item devuelto ────────────────────────────────────────

function Step2({
  selected,
  onSelect,
  cantidad,
  setCantidad,
}: {
  selected: DetalleItem | null
  onSelect: (item: DetalleItem) => void
  cantidad: number
  setCantidad: (n: number) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Selecciona el producto que el cliente devuelve.</p>
      <div className="space-y-2">
        {MOCK_DETALLE.map((item) => (
          <button
            key={item.id_detalle_v}
            onClick={() => onSelect(item)}
            className={cn(
              "w-full rounded-xl border p-3 text-left transition-all",
              selected?.id_detalle_v === item.id_detalle_v
                ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                <p className="mt-0.5 font-mono text-xs text-gray-400">{item.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">S/ {item.precio_unitario_momento.toFixed(2)}</p>
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

// ─── Step 3: Seleccionar item entregado ───────────────────────────────────────

function Step3({
  selected,
  onSelect,
  search,
  setSearch,
}: {
  selected: CatalogoItem | null
  onSelect: (item: CatalogoItem) => void
  search: string
  setSearch: (s: string) => void
}) {
  const filtered = MOCK_CATALOGO.filter((i) =>
    i.nombre.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Selecciona el producto que entregas como reemplazo.</p>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-2 max-h-52 overflow-y-auto">
        {filtered.map((item) => (
          <button
            key={item.id_item}
            onClick={() => onSelect(item)}
            className={cn(
              "w-full rounded-xl border p-3 text-left transition-all",
              selected?.id_item === item.id_item
                ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                <p className="mt-0.5 font-mono text-xs text-gray-400">{item.sku}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">S/ {item.precio_venta_actual.toFixed(2)}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Sin resultados</p>
        )}
      </div>
    </div>
  )
}

// ─── Step 4: Confirmar ────────────────────────────────────────────────────────

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
  itemDevuelto: DetalleItem
  cantidadDevuelta: number
  itemEntregado: CatalogoItem
  motivo: string
  setMotivo: (s: string) => void
  detalle: string
  setDetalle: (s: string) => void
  metodoPago: string
  setMetodoPago: (s: string) => void
}) {
  const precioDevuelto = itemDevuelto.precio_unitario_momento * cantidadDevuelta
  const precioEntregado = itemEntregado.precio_venta_actual * cantidadDevuelta
  const diferencia = precioEntregado - precioDevuelto
  const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  return (
    <div className="space-y-4">
      {/* Exchange summary */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400">Devuelve</p>
            <p className="truncate text-sm font-medium text-gray-900">{itemDevuelto.nombre}</p>
            <p className="text-xs text-gray-500">x{cantidadDevuelta} · S/ {precioDevuelto.toFixed(2)}</p>
          </div>
          <ArrowLeftRight className="h-4 w-4 shrink-0 text-gray-400" />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-xs text-gray-400">Recibe</p>
            <p className="truncate text-sm font-medium text-gray-900">{itemEntregado.nombre}</p>
            <p className="text-xs text-gray-500">x{cantidadDevuelta} · S/ {precioEntregado.toFixed(2)}</p>
          </div>
        </div>
        <div className={cn(
          "mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold",
          diferencia > 0 ? "bg-amber-50 text-amber-700" :
          diferencia < 0 ? "bg-green-50 text-green-700" :
          "bg-gray-100 text-gray-600"
        )}>
          <span>{diferencia > 0 ? "Diferencia a cobrar" : diferencia < 0 ? "Diferencia a devolver" : "Sin diferencia"}</span>
          <span>S/ {Math.abs(diferencia).toFixed(2)}</span>
        </div>
      </div>

      {/* Payment method if difference */}
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
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
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
        <input
          className={inputCls}
          placeholder="Ej: Defecto de fábrica, error en la venta..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>

      {/* Detalle */}
      <div>
        <label className={labelCls}>Detalle (opcional)</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Descripción adicional..."
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Main drawer ─────────────────────────────────────────────────────────────

interface CambioDrawerProps {
  open: boolean
  onClose: () => void
}

export function CambioDrawer({ open, onClose }: CambioDrawerProps) {
  const [step, setStep] = useState(0)

  // Step 1 state
  const [ventaId, setVentaId] = useState("")
  const [ventaFound, setVentaFound] = useState(false)

  // Step 2 state
  const [itemDevuelto, setItemDevuelto] = useState<DetalleItem | null>(null)
  const [cantidadDevuelta, setCantidadDevuelta] = useState(1)

  // Step 3 state
  const [itemEntregado, setItemEntregado] = useState<CatalogoItem | null>(null)
  const [catalogSearch, setCatalogSearch] = useState("")

  // Step 4 state
  const [motivo, setMotivo] = useState("")
  const [detalle, setDetalle] = useState("")
  const [metodoPago, setMetodoPago] = useState("")

  function reset() {
    setStep(0)
    setVentaId("")
    setVentaFound(false)
    setItemDevuelto(null)
    setCantidadDevuelta(1)
    setItemEntregado(null)
    setCatalogSearch("")
    setMotivo("")
    setDetalle("")
    setMetodoPago("")
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSearch() {
    if (ventaId.trim()) setVentaFound(true)
  }

  function canNext(): boolean {
    if (step === 0) return ventaFound
    if (step === 1) return itemDevuelto !== null
    if (step === 2) return itemEntregado !== null
    return false
  }

  function handleNext() {
    if (step < 3) setStep((s) => s + 1)
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  function handleSubmit() {
    if (!motivo.trim()) {
      toast.error("El motivo es obligatorio")
      return
    }
    toast.success("Cambio registrado correctamente (mockup)")
    handleClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="max-h-[92vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Nuevo cambio de producto</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* Step content */}
        <div className="px-5 pb-5">
          {step === 0 && (
            <Step1
              ventaId={ventaId}
              setVentaId={setVentaId}
              ventaFound={ventaFound}
              onSearch={handleSearch}
            />
          )}
          {step === 1 && (
            <Step2
              selected={itemDevuelto}
              onSelect={(item) => { setItemDevuelto(item); setCantidadDevuelta(1) }}
              cantidad={cantidadDevuelta}
              setCantidad={setCantidadDevuelta}
            />
          )}
          {step === 2 && (
            <Step3
              selected={itemEntregado}
              onSelect={setItemEntregado}
              search={catalogSearch}
              setSearch={setCatalogSearch}
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

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
          <button
            onClick={step === 0 ? handleClose : handleBack}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {step > 0 && <ArrowLeft className="h-4 w-4" />}
            {step === 0 ? "Cancelar" : "Atrás"}
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canNext()}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Registrar cambio
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
