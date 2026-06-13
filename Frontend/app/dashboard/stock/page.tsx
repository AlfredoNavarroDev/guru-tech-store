"use client"

import { useCallback, useEffect, useState } from "react"
import { getStock, getStockCritico, type StockActual, type StockCritico } from "@/lib/api/stock"
import { ApiError } from "@/lib/api/client"
import { StockBadge } from "@/components/abastecedor/StockBadge"
import { StockAjusteModal } from "@/components/abastecedor/StockAjusteModal"
import { toast } from "sonner"

const PAGE_SIZE = 20

export default function StockPage() {
  const [stock, setStock] = useState<StockActual[]>([])
  const [critico, setCritico] = useState<StockCritico[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"todo" | "critico">("todo")
  const [soloReposicion, setSoloReposicion] = useState(false)
  const [selected, setSelected] = useState<StockActual | null>(null)

  const loadStock = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStock({
        requiere_reposicion: soloReposicion || undefined,
        page,
        limit: PAGE_SIZE,
      })
      setStock(res.items)
      setTotal(res.total)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error cargando stock")
    } finally {
      setLoading(false)
    }
  }, [soloReposicion, page])

  const loadCritico = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getStockCritico()
      setCritico(res)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error cargando stock crítico")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === "todo") loadStock()
    else loadCritico()
  }, [tab, loadStock, loadCritico])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Stock</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {tab === "todo" ? `${total} ítems en inventario` : `${critico.length} ítems bajo mínimo`}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-white/10 overflow-hidden">
          {(["todo", "critico"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1) }}
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

        {tab === "todo" && (
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={soloReposicion}
              onChange={(e) => { setSoloReposicion(e.target.checked); setPage(1) }}
              className="rounded border-white/20 bg-white/5"
            />
            Solo reposición
          </label>
        )}
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" />
          </div>
        ) : tab === "todo" ? (
          stock.length === 0 ? (
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
                {stock.map((s) => (
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
          )
        ) : (
          critico.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/30">Sin ítems críticos</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left font-medium text-white/50">Ítem</th>
                  <th className="px-4 py-3 text-left font-medium text-white/50">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium text-white/50">Stock actual</th>
                  <th className="px-4 py-3 text-right font-medium text-white/50">Stock mín.</th>
                  <th className="px-4 py-3 text-right font-medium text-white/50">Faltan</th>
                  <th className="px-4 py-3 text-right font-medium text-white/50">P. Compra</th>
                </tr>
              </thead>
              <tbody>
                {critico.map((s) => (
                  <tr key={s.id_item} className="border-b border-white/5">
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
                    <td className="px-4 py-3 text-right font-semibold text-red-400">{s.unidades_faltantes}</td>
                    <td className="px-4 py-3 text-right text-white/60">S/. {s.precio_compra_actual.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {tab === "todo" && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 disabled:opacity-30"
          >
            ‹ Anterior
          </button>
          <span className="text-sm text-white/40">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 disabled:opacity-30"
          >
            Siguiente ›
          </button>
        </div>
      )}

      <StockAjusteModal item={selected} onClose={() => setSelected(null)} onSaved={loadStock} />
    </div>
  )
}
