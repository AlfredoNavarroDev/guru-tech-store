"use client"

import { X } from "lucide-react"
import type { StockActual } from "@/lib/api/stock"

interface StockAjusteModalProps {
  item: StockActual | null
  onClose: () => void
}

export function StockAjusteModal({ item, onClose }: StockAjusteModalProps) {
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0a0f] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Detalle de Stock</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10 text-white/50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">Ítem</span>
            <span className="text-white font-medium">{item.item}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">SKU</span>
            <span className="text-white/70 font-mono text-xs">{item.sku}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Stock actual</span>
            <span className="text-white">{item.cantidad_actual}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Stock mínimo</span>
            <span className="text-white">{item.stock_minimo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Diferencia</span>
            <span className={item.diferencia_stock < 0 ? "text-red-400" : "text-green-400"}>
              {item.diferencia_stock > 0 ? "+" : ""}{item.diferencia_stock}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">P. compra</span>
            <span className="text-white/70">S/. {item.precio_compra_actual.toFixed(2)}</span>
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-400">
          Para reponer este ítem, crea una nueva Compra en el módulo de Compras.
        </p>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
