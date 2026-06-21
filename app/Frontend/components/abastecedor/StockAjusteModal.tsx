"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import type { StockActual } from "@/lib/api/stock"
import { ajusteStock, type AjusteStockPayload } from "@/lib/api/items"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

const MOTIVOS: { value: AjusteStockPayload['motivo']; label: string }[] = [
  { value: 'ajuste_inventario', label: 'Ajuste de inventario' },
  { value: 'merma', label: 'Merma' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'otro', label: 'Otro' },
]

interface StockAjusteModalProps {
  item: StockActual | null
  onClose: () => void
  onSaved?: () => void
}

export function StockAjusteModal({ item, onClose, onSaved }: StockAjusteModalProps) {
  const [cantidad, setCantidad] = useState(0)
  const [motivo, setMotivo] = useState<AjusteStockPayload['motivo']>('ajuste_inventario')
  const [observacion, setObservacion] = useState('')
  const [saving, setSaving] = useState(false)

  if (!item) return null

  const nuevoStock = item.cantidad_actual + cantidad
  const invalido = cantidad === 0 || nuevoStock < 0

  async function handleSubmit() {
    if (invalido) return
    setSaving(true)
    try {
      await ajusteStock(item!.id_item, {
        cantidad,
        motivo,
        observacion: observacion.trim() || undefined,
      })
      toast.success("Stock ajustado")
      onSaved?.()
      handleClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al ajustar stock")
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setCantidad(0)
    setMotivo('ajuste_inventario')
    setObservacion('')
    onClose()
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-heading">Ajuste de stock</h2>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-heading">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-0.5">
          <p className="text-sm font-medium text-text-heading">{item.item}</p>
          <p className="text-xs text-text-muted font-mono">{item.sku}</p>
          <p className="text-xs text-text-muted mt-1">
            Stock actual: <span className="font-medium text-text-heading">{item.cantidad_actual}</span>
            {" · "}Mínimo: <span className="text-text-heading">{item.stock_minimo}</span>
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Cantidad <span className="text-text-muted/70">(+ entrada · - salida)</span>
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
              className={inputCls}
            />
            {cantidad !== 0 && (
              <p className={`mt-1 text-xs ${nuevoStock < 0 ? 'text-rose-600' : 'text-text-muted'}`}>
                Stock resultante:{" "}
                <span className="font-medium">{nuevoStock}</span>
                {nuevoStock < 0 && " — no puede ser negativo"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as AjusteStockPayload['motivo'])}
              className={inputCls}
            >
              {MOTIVOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Observación (opcional)</label>
            <input
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Detalle adicional..."
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-text-muted hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || invalido}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Ajustando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  )
}
