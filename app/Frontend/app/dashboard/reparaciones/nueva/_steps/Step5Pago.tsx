"use client"

import { useMemo } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown, PlusCircle, X } from "lucide-react"
import { cn, formatNum } from "@/lib/utils"
import { useNuevaReparacion, type MetodoPago } from "../_context/nueva-reparacion.context"

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "otro", label: "Otro" },
]

const fmt = (n: number) => formatNum(n)

export function Step5Pago() {
  const {
    cotizado, setCotizado,
    repuestos,
    tipoDescuento, setTipoDescuento,
    valorDescuento, setValorDescuento,
    justificacionDescuento, setJustificacionDescuento,
    pagos, setPagos,
  } = useNuevaReparacion()

  const laborCost = parseFloat(cotizado) || 0
  const repuestosCost = useMemo(
    () => repuestos.reduce((sum, r) => sum + r.precio_cobrado * r.cantidad, 0),
    [repuestos],
  )
  const subtotal = laborCost + repuestosCost

  const montoDescuento = useMemo(() => {
    const v = parseFloat(valorDescuento) || 0
    if (tipoDescuento === "porcentaje") return Math.min(subtotal, (subtotal * v) / 100)
    return Math.min(subtotal, Math.max(0, v))
  }, [subtotal, tipoDescuento, valorDescuento])

  const total = subtotal - montoDescuento
  const totalPagado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const restante = Math.max(0, total - totalPagado)
  const vuelto = Math.max(0, totalPagado - total)

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

  return (
    <div className="space-y-4">
      {/* Presupuesto breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Presupuesto
        </h2>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Servicio (S/)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={cotizado}
            onChange={(e) => setCotizado(e.target.value)}
            placeholder="0.00"
            className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm tabular-nums text-gray-900 placeholder-gray-400 focus:border-[#020617]/50 focus:outline-none focus:ring-2 focus:ring-[#020617]/10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Mano de obra / servicio</span>
            <span className="tabular-nums text-gray-900">S/ {fmt(laborCost)}</span>
          </div>
          {repuestosCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Repuestos ({repuestos.length})
              </span>
              <span className="tabular-nums text-gray-900">S/ {fmt(repuestosCost)}</span>
            </div>
          )}
          <div className="mt-1 border-t border-gray-100 pt-2 flex justify-between">
            <span className="text-sm font-semibold text-gray-700">Total bruto</span>
            <span className="text-sm font-bold tabular-nums text-gray-900">S/ {fmt(subtotal)}</span>
          </div>
        </div>
      </div>

      {/* Descuento */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Descuento
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setTipoDescuento("porcentaje")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                tipoDescuento === "porcentaje"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-400 hover:text-gray-600",
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
                  : "text-gray-400 hover:text-gray-600",
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
            placeholder="0"
            className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm tabular-nums text-gray-900 placeholder-gray-400 focus:border-[#020617]/50 focus:outline-none focus:ring-2 focus:ring-[#020617]/10"
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
                  className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#020617]/50 focus:outline-none focus:ring-2 focus:ring-[#020617]/10"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Total neto */}
      <div className="rounded-2xl bg-[#020617] p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-white/70">Total a cobrar</span>
          <span className="text-2xl font-bold tabular-nums text-lime">S/ {fmt(total)}</span>
        </div>
        {montoDescuento > 0 && (
          <p className="mt-1 text-xs text-white/40">
            Incluye descuento de S/ {fmt(montoDescuento)}
          </p>
        )}
      </div>

      {/* Pagos / Adelantos */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Pagos / Adelantos
        </h2>
        <p className="mb-3 text-[11px] text-gray-400">
          Opcional — registra si el cliente deja un pago o adelanto ahora
        </p>

        <div className="flex flex-col gap-2">
          {pagos.map((pago, idx) => (
            <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-36 sm:shrink-0">
                <select
                  value={pago.metodo}
                  onChange={(e) => updatePago(idx, "metodo", e.target.value)}
                  className="h-9 w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 pr-7 text-sm text-gray-900 focus:border-[#020617]/50 focus:outline-none focus:ring-2 focus:ring-[#020617]/10"
                >
                  {METODOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    S/
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pago.monto}
                    onChange={(e) => updatePago(idx, "monto", e.target.value)}
                    placeholder={fmt(restante > 0 ? restante : 0)}
                    className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm tabular-nums text-gray-900 placeholder-gray-400 focus:border-[#020617]/50 focus:outline-none focus:ring-2 focus:ring-[#020617]/10"
                  />
                </div>
                {restante > 0.01 && !pago.monto && (
                  <button
                    type="button"
                    onClick={() => fillRestante(idx)}
                    className="shrink-0 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-400 hover:border-[#020617]/40 hover:text-[#020617] transition-colors whitespace-nowrap"
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
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPago}
          className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-[#020617]/30 hover:text-[#020617] hover:bg-[#020617]/5"
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
                  <span className="tabular-nums font-medium text-gray-900">
                    S/ {fmt(totalPagado)}
                  </span>
                </div>
                {restante > 0.01 && (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                    <span className="text-sm text-amber-700">Pendiente de cobro</span>
                    <span className="text-sm font-bold tabular-nums text-amber-700">
                      S/ {fmt(restante)}
                    </span>
                  </div>
                )}
                {vuelto > 0.01 && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <span className="text-sm text-emerald-700">Vuelto</span>
                    <span className="text-sm font-bold tabular-nums text-emerald-700">
                      S/ {fmt(vuelto)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
