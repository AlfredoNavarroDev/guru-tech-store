"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Package, TrendingDown, DollarSign, Plus } from "lucide-react"
import { NumberTicker } from "@/components/ui/number-ticker"
import { StockBadge } from "./StockBadge"
import { getStockCritico, getStock, type StockCritico, type StockActual } from "@/lib/api/stock"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

export function StockOverview() {
  const router = useRouter()
  const [criticos, setCriticos] = useState<StockCritico[]>([])
  const [stock, setStock] = useState<StockActual[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStockCritico(), getStock({ limit: 200 })])
      .then(([c, res]) => {
        setCriticos(c)
        setStock(res.items)
      })
      .catch((e: ApiError) => toast.error(e.message ?? "Error cargando inventario"))
      .finally(() => setLoading(false))
  }, [])

  const totalItems = stock.length
  const bajosStock = stock.filter((s) => s.requiere_reposicion).length
  const valorInventario = stock.reduce(
    (acc, s) => acc + s.cantidad_actual * s.precio_compra_actual,
    0,
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {criticos.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{criticos.length} ítem(s) en estado crítico requieren reposición.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total ítems", value: totalItems, icon: Package, color: "blue" },
          { label: "Bajo stock", value: bajosStock, icon: TrendingDown, color: "yellow" },
          { label: "Valor inv. (S/.)", value: Math.round(valorInventario), icon: DollarSign, color: "green" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
              <Icon className={`h-4 w-4 text-${color}-400`} />
              {label}
            </div>
            <NumberTicker
              value={value}
              className="text-2xl font-bold text-white"
            />
          </div>
        ))}
      </div>

      {criticos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/70">Ítems críticos</h2>
            <button
              onClick={() => router.push("/dashboard/compras/nueva")}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva compra
            </button>
          </div>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-2.5 text-left font-medium text-white/50">Ítem</th>
                  <th className="px-4 py-2.5 text-right font-medium text-white/50">Stock</th>
                  <th className="px-4 py-2.5 text-right font-medium text-white/50">Mínimo</th>
                  <th className="px-4 py-2.5 text-right font-medium text-white/50">Faltan</th>
                  <th className="px-4 py-2.5 text-left font-medium text-white/50">Estado</th>
                </tr>
              </thead>
              <tbody>
                {criticos.map((c) => (
                  <tr key={c.id_item} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2.5 text-white">{c.item}</td>
                    <td className="px-4 py-2.5 text-right text-white/70">{c.cantidad_actual}</td>
                    <td className="px-4 py-2.5 text-right text-white/70">{c.stock_minimo}</td>
                    <td className="px-4 py-2.5 text-right text-red-400 font-medium">{c.unidades_faltantes}</td>
                    <td className="px-4 py-2.5">
                      <StockBadge cantidad_actual={c.cantidad_actual} stock_minimo={c.stock_minimo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {criticos.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/40">
          <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>Todo el inventario está sobre el stock mínimo.</p>
        </div>
      )}
    </div>
  )
}
