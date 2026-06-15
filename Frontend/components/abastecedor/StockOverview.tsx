"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Package, TrendingDown, DollarSign, Plus } from "lucide-react"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Skeleton } from "@/components/ui/skeleton"
import { StockBadge } from "./StockBadge"
import { getStockCritico, getStock, type StockCritico, type StockActual } from "@/lib/api/stock"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function StockOverview({ compact = false }: { compact?: boolean }) {
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
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        <div className={cn("grid grid-cols-1 gap-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
          {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-4 px-5 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12 justify-self-end" />
                <Skeleton className="h-4 w-12 justify-self-end" />
                <Skeleton className="h-4 w-12 justify-self-end" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {criticos.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{criticos.length} ítem(s) en estado crítico requieren reposición.</span>
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {[
          { label: "Total ítems", value: totalItems, icon: Package, iconClass: "text-blue-600" },
          { label: "Bajo stock", value: bajosStock, icon: TrendingDown, iconClass: "text-amber-600" },
          { label: "Valor inv. (S/.)", value: Math.round(valorInventario), icon: DollarSign, iconClass: "text-emerald-600" },
        ].filter((_, i) => !compact || i < 2).map(({ label, value, icon: Icon, iconClass }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm mb-1.5 text-text-muted">
              <Icon className={`h-4 w-4 ${iconClass}`} />
              {label}
            </div>
            <NumberTicker
              value={value}
              className="text-3xl font-bold text-text-heading"
            />
          </div>
        ))}
      </div>

      {criticos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-heading">Ítems críticos</h2>
            <button
              onClick={() => router.push("/dashboard/compras/nueva")}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva compra
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left font-medium text-text-muted">Ítem</th>
                  <th className="px-4 py-2.5 text-right font-medium text-text-muted">Stock</th>
                  <th className="px-4 py-2.5 text-right font-medium text-text-muted">Mínimo</th>
                  <th className="px-4 py-2.5 text-right font-medium text-text-muted">Faltan</th>
                  <th className="px-4 py-2.5 text-left font-medium text-text-muted">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {criticos.map((c) => (
                  <tr key={c.id_item} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-text-heading">{c.item}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{c.cantidad_actual}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{c.stock_minimo}</td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">{c.unidades_faltantes}</td>
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
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-text-muted shadow-sm">
          <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p>Todo el inventario está sobre el stock mínimo.</p>
        </div>
      )}
    </div>
  )
}
