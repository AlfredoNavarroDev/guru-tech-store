"use client"

import { useEffect, useState, useMemo, useSyncExternalStore } from "react"
import {
  Package,
  TrendingDown,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { NumberTicker } from "@/components/ui/number-ticker"
import { StockBadge } from "@/components/abastecedor/StockBadge"
import { getCompras, type Compra } from "@/lib/api/compras"
import { getStock, type StockActual } from "@/lib/api/stock"
import { getSession } from "@/lib/api/auth"
import { formatNum, cn } from "@/lib/utils"

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function noopSubscribe() {
  return () => undefined
}

function formatToday() {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function AbastecedorDashboard() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loadingCompras, setLoadingCompras] = useState(true)
  const [comprasError, setComprasError] = useState(false)
  const [stock, setStock] = useState<StockActual[]>([])
  const [loadingStock, setLoadingStock] = useState(true)
  const session = useSyncExternalStore(noopSubscribe, getSession, () => null)
  const today = useSyncExternalStore(noopSubscribe, formatToday, () => "")
  const firstName = session?.nombre?.split(" ")[0] ?? ""

  useEffect(() => {
    getCompras({ limit: 3, page: 1 })
      .then((res) => setCompras(res.items))
      .catch(() => setComprasError(true))
      .finally(() => setLoadingCompras(false))
  }, [])

  useEffect(() => {
    getStock({ limit: 200 })
      .then((res) => setStock(res.items))
      .catch(() => {})
      .finally(() => setLoadingStock(false))
  }, [])

  const totalItems = stock.length
  const criticos = useMemo(
    () => stock.filter((s) => s.requiere_reposicion).sort((a, b) => a.diferencia_stock - b.diferencia_stock),
    [stock],
  )
  const bajosStock = criticos.length
  const STAT_CARDS = [
    {
      label: "Total Ítems",
      value: totalItems,
      prefix: "",
      icon: Package,
      sub: "en inventario",
      positive: true,
      dark: true,
    },
    {
      label: "Bajo Stock",
      value: bajosStock,
      prefix: "",
      icon: TrendingDown,
      sub: bajosStock === 0 ? "inventario saludable" : "requieren reposición",
      positive: bajosStock === 0,
      dark: false,
    },
  ]

  return (
    <div className="min-h-full bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        {/* Saludo */}
        <BlurFade delay={0} duration={0.35}>
          <div>
            <h2 className="text-3xl font-extrabold text-text-heading">
              Bienvenido{firstName ? `, ${firstName}` : ""}
            </h2>
            <p className="mt-1 text-sm capitalize text-text-muted">{today}</p>
          </div>
        </BlurFade>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {loadingStock
            ? Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl p-5 animate-pulse",
                    i === 0
                      ? "border border-white/5 bg-linear-to-br from-black to-[#131B2E]"
                      : "border border-gray-200 bg-white",
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("h-3 w-24 rounded-md", i === 0 ? "bg-white/15" : "bg-muted")} />
                    <div className={cn("h-8 w-8 rounded-xl", i === 0 ? "bg-white/15" : "bg-muted")} />
                  </div>
                  <div className={cn("h-10 w-20 rounded-md mb-2", i === 0 ? "bg-white/15" : "bg-muted")} />
                  <div className={cn("h-3 w-28 rounded-md", i === 0 ? "bg-white/15" : "bg-muted")} />
                </div>
              ))
            : STAT_CARDS.map((s, i) => (
                <BlurFade key={s.label} delay={0.07 + i * 0.07} duration={0.35}>
                  <div
                    className={cn(
                      "rounded-2xl p-5 shadow-sm",
                      s.dark
                        ? "border border-white/5 bg-linear-to-br from-black to-[#131B2E]"
                        : "border border-gray-200 bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <p className={cn("text-xs font-semibold uppercase tracking-wider", s.dark ? "text-text-on-dark" : "text-text-muted")}>
                        {s.label}
                      </p>
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                        <s.icon className="h-4 w-4 text-gray-900" />
                      </div>
                    </div>

                    <p className={cn("mt-3 text-4xl font-extrabold tabular-nums", s.dark ? "text-white" : "text-text-heading")}>
                      {s.prefix}
                      <NumberTicker value={s.value} decimalPlaces={0} />
                    </p>

                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={cn("flex items-center gap-0.5 text-xs font-semibold", s.positive ? "text-green-500" : "text-red-400")}>
                        {s.positive ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      </span>
                      <span className={cn("text-xs", s.dark ? "text-text-on-dark" : "text-text-muted")}>
                        {s.sub}
                      </span>
                    </div>
                  </div>
                </BlurFade>
              ))}
        </div>

        {/* Critical items alert */}
        {!loadingStock && criticos.length > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{criticos.length} ítem(s) en estado crítico requieren reposición.</span>
          </div>
        )}

        {/* Critical items table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-base font-bold text-text-heading">Ítems críticos</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {["Ítem", "Stock", "Mínimo", "Faltan", "Estado"].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                      i === 0 || i === 4 ? "text-left" : "text-right",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingStock ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  </tr>
                ))
              ) : criticos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-text-muted">
                    Sin ítems críticos
                  </td>
                </tr>
              ) : (
                criticos.slice(0, 5).map((c) => (
                  <tr key={c.id_item} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-text-heading">{c.item}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{c.cantidad_actual}</td>
                    <td className="px-4 py-3 text-right text-text-muted">{c.stock_minimo}</td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">{-c.diferencia_stock}</td>
                    <td className="px-4 py-2.5">
                      <StockBadge cantidad_actual={c.cantidad_actual} stock_minimo={c.stock_minimo} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Compras recientes */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-lg font-bold text-text-heading">Compras recientes</h3>
            <p className="mt-0.5 text-xs text-text-muted">Últimas 3 órdenes de compra</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {(["Proveedor", "Total", "Fecha"] as const).map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                        h === "Proveedor" ? "text-left" : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingCompras ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Skeleton className="ml-auto h-4 w-20" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Skeleton className="ml-auto h-4 w-24" />
                      </td>
                    </tr>
                  ))
                ) : comprasError ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-rose-500">
                      Error al cargar compras
                    </td>
                  </tr>
                ) : compras.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-text-muted">
                      Sin compras registradas
                    </td>
                  </tr>
                ) : (
                  compras.map((c) => (
                    <tr key={c.id_compra} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-sm font-medium text-text-heading">
                        {c.proveedor ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold tabular-nums text-text-heading">
                        S/{formatNum(c.costo_total)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-text-muted">
                        {fmtFecha(c.fecha_compra)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
