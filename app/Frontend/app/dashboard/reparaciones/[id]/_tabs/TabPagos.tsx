"use client"

import { useState } from "react"
import { Loader2, Plus, ChevronDown, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatNum } from "@/lib/utils"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import {
  createPagoReparacion,
  getReparacion,
  type ReparacionResponse,
} from "@/lib/api/reparaciones"

const METODOS_PAGO = ["efectivo", "tarjeta", "transferencia", "yape", "plin", "otro"]

function fmtDatetime(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(iso)
  }
}

interface TabPagosProps {
  rep: ReparacionResponse
  onRepUpdated: (rep: ReparacionResponse) => void
}

export function TabPagos({ rep, onRepUpdated }: TabPagosProps) {
  const [metodo, setMetodo]         = useState("efectivo")
  const [monto, setMonto]           = useState("")
  const [esAdelanto, setEsAdelanto] = useState(true)
  const [savingPago, setSavingPago] = useState(false)
  const [pagoError, setPagoError]   = useState<string | null>(null)

  const estadoEsFinal = rep.estado === "entregado"

  const handleRegistrarPago = async () => {
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) return
    setSavingPago(true)
    setPagoError(null)
    try {
      const pago = await createPagoReparacion(rep.id_reparacion, {
        metodo_pago: metodo,
        monto: montoNum,
        es_adelanto: esAdelanto,
      })
      const updated = await getReparacion(rep.id_reparacion)
      onRepUpdated(updated)
      setMonto("")
      toast.success(
        `${esAdelanto ? "Adelanto" : "Pago final"} de S/${formatNum(pago.monto)} registrado`,
      )
    } catch (e) {
      setPagoError(e instanceof ApiError ? e.message : "Error registrando pago")
    } finally {
      setSavingPago(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
          <FileText className="h-3.5 w-3.5 text-gray-700" />
        </div>
        <h2 className="text-sm font-semibold text-text-heading">Pagos</h2>
      </div>
      <div className="p-5">
        {/* Resumen financiero */}
        <div className="mb-4 rounded-xl bg-gray-50 p-4 space-y-1.5">
          {rep.monto_cotizado != null && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Cotización</span>
              <span className="font-semibold text-text-heading">
                S/{formatNum(rep.monto_cotizado)}
              </span>
            </div>
          )}
          {rep.total_pagado != null && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total pagado</span>
              <span className="font-semibold text-green-600">
                S/{formatNum(rep.total_pagado)}
              </span>
            </div>
          )}
          {rep.saldo_pendiente != null && rep.saldo_pendiente > 0 && (
            <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm">
              <span className="font-semibold text-text-heading">Saldo pendiente</span>
              <span className="font-bold text-text-heading">
                S/{formatNum(rep.saldo_pendiente)}
              </span>
            </div>
          )}
          {rep.monto_cotizado == null && rep.total_pagado == null && (
            <p className="text-sm text-center text-gray-400">Sin cotización definida</p>
          )}
        </div>

        {/* Historial de pagos */}
        {(rep.pagos ?? []).length > 0 && (
          <div className="mb-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Historial de pagos
            </p>
            {(rep.pagos ?? []).map((p) => (
              <div
                key={p.id_pago}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2"
              >
                <div>
                  <span className="text-xs font-medium capitalize text-gray-700">
                    {p.metodo_pago}
                  </span>
                  <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500">
                    {p.es_adelanto ? "Adelanto" : "Pago final"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-text-heading">
                    S/{formatNum(p.monto)}
                  </p>
                  <p className="text-[10px] text-gray-400">{fmtDatetime(p.fecha_pago)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Registrar nuevo pago */}
        {!estadoEsFinal && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Registrar pago
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEsAdelanto(true)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  esAdelanto
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                Adelanto parcial
              </button>
              <button
                type="button"
                onClick={() => setEsAdelanto(false)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  !esAdelanto
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                )}
              >
                Pago final
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-500">Método</label>
                <div className="relative">
                  <select
                    value={metodo}
                    onChange={(e) => setMetodo(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-7 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m} className="capitalize">{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-500">
                  Monto (S/)
                </label>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl"
                />
              </div>
            </div>
            {pagoError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{pagoError}</p>
            )}
            <Button
              onClick={handleRegistrarPago}
              disabled={savingPago || !monto || parseFloat(monto) <= 0}
              className="w-full rounded-xl bg-[#020617] hover:bg-[#0f172a] text-white"
            >
              {savingPago ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  Registrar {esAdelanto ? "adelanto" : "pago final"}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
