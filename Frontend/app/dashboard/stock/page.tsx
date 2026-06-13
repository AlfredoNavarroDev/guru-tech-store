"use client"

import { useCallback, useEffect, useState } from "react"
import { getStock, type StockActual } from "@/lib/api/stock"
import { ApiError } from "@/lib/api/client"
import { StockBadge } from "@/components/abastecedor/StockBadge"
import { StockAjusteModal } from "@/components/abastecedor/StockAjusteModal"
import { toast } from "sonner"

export default function StockPage() {
  const [stock, setStock] = useState<StockActual[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"todo" | "critico">("todo")
  const [soloPendiente, setSoloPendiente] = useState(false)
  const [selected, setSelected] = useState<StockActual | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getStock()
      .then(setStock)
      .catch((e: ApiError) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const visible = stock.filter((s) => {
    if (tab === "critico" && !s.requiere_reposicion) return false
    if (soloPendiente && !s.requiere_reposicion) return false
    return true
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Stock</h1>
        <p className="text-sm text-white/40 mt-0.5">{stock.length} ítems en inventario</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(["todo", "critico"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {t === "todo" ? "Todo" : "Crítico"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
          <input
            type="checkbox"
            checked={soloPendiente}
            onChange={(e) => setSoloPendiente(e.target.checked)}
            className="rounded border-white/20 bg-white/5"
          />
          Solo reposición
        </label>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/30">Sin resultados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left font-medium text-white/50">Ítem</th>
                <th className="px-4 py-3 text-left font-medium text-white/50">Tipo</th>
                <th className="px-4 py-3 text-right font-medium text-white/50">Stock actual</th>
                <th className="px-4 py-3 text-right font-medium text-white/50">Stock mín.</th>
                <th className="px-4 py-3 text-left font-medium text-white/50">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-white/50">P. Compra</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr
                  key={s.id_inventario}
                  onClick={() => setSelected(s)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                >
                  <td className="px-4 py-3 text-white">{s.item}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.tipo === 'producto' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {s.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white">{s.cantidad_actual}</td>
                  <td className="px-4 py-3 text-right text-white/60">{s.stock_minimo}</td>
                  <td className="px-4 py-3">
                    <StockBadge cantidad_actual={s.cantidad_actual} stock_minimo={s.stock_minimo} />
                  </td>
                  <td className="px-4 py-3 text-right text-white/60">S/. {s.precio_compra_actual.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StockAjusteModal item={selected} onClose={() => setSelected(null)} onSaved={load} />
    </div>
  )
}
