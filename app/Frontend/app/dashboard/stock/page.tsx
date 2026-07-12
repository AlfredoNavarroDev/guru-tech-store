"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileX,
  MapPin,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { StockBadge } from "@/components/abastecedor/StockBadge"
import { StockAjusteModal } from "@/components/abastecedor/StockAjusteModal"
import { getStock, type StockActual } from "@/lib/api/stock"
import { ApiError } from "@/lib/api/client"
import { getSession } from "@/lib/api/auth"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

export default function StockPage() {
  const [stock, setStock] = useState<StockActual[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soloReposicion, setSoloReposicion] = useState(false)
  const [selected, setSelected] = useState<StockActual | null>(null)

  const searchParams = useSearchParams()
  const sedeParam = searchParams.get("sede")
  const idSede = sedeParam ? parseInt(sedeParam, 10) : null
  // El propietario tiene acceso de solo lectura: no puede ajustar stock.
  const isPropietario = getSession()?.rol === "propietario"

  const stockParams = useMemo(() => ({
    requiere_reposicion: soloReposicion || undefined,
    page,
    limit: PAGE_SIZE,
    id_sede: idSede,
  }), [page, soloReposicion, idSede])

  useEffect(() => {
    let ignore = false

    void getStock(stockParams)
      .then((res) => {
        if (ignore) return
        setStock(res.items)
        setTotal(res.total)
        setError(null)
      })
      .catch((e: unknown) => {
        if (ignore) return
        setError(e instanceof ApiError ? e.message : "Error cargando stock")
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [soloReposicion, stockParams])

  const loadStock = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getStock(stockParams)
      setStock(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando stock")
    } finally {
      setLoading(false)
    }
  }, [soloReposicion, stockParams])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
              <Layers className="h-4 w-4 text-gray-900" />
            </div>
            <h1 className="text-2xl font-bold text-text-heading">Stock</h1>
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            {soloReposicion
              ? `${total} items bajo mínimo`
              : `${total} items en inventario`}
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.06} duration={0.4}>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setLoading(true)
              setSoloReposicion((v) => !v)
              setPage(1)
            }}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              soloReposicion
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            Solo reposición
          </button>
        </div>
      </BlurFade>

      <BlurFade delay={0.12} duration={0.4}>
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse"
              >
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="h-4 w-2/5" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={loadStock}
              className="mt-1 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && stock.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileX className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {soloReposicion ? "Sin items bajo mínimo" : "Sin resultados"}
            </p>
          </div>
        )}

        {!loading && !error && stock.length > 0 && (
          <div className="space-y-2">
            {stock.map((s, i) => (
              <BlurFade key={s.id_inventario} delay={Math.min(i * 0.03, 0.3)} duration={0.3}>
                <div
                  onClick={() => !isPropietario && setSelected(s)}
                  role={isPropietario ? undefined : "button"}
                  tabIndex={isPropietario ? undefined : 0}
                  onKeyDown={(e) => !isPropietario && e.key === "Enter" && setSelected(s)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:shadow-sm",
                    !isPropietario && "cursor-pointer",
                    soloReposicion
                      ? "hover:border-rose-200 hover:bg-rose-50/40"
                      : "hover:border-blue-200 hover:bg-blue-50/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{s.item}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {idSede == null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                          <MapPin className="h-3 w-3" />
                          {s.sede}
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          s.tipo === "producto"
                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                            : "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
                        )}
                      >
                        {s.tipo}
                      </span>
                      {!soloReposicion && (
                        <StockBadge
                          cantidad_actual={s.cantidad_actual}
                          stock_minimo={s.stock_minimo}
                        />
                      )}
                    </div>
                  </div>
                  <div className="hidden shrink-0 items-center gap-6 sm:flex">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500">Actual</p>
                      <p className="text-sm font-semibold text-gray-900">{s.cantidad_actual}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500">Mínimo</p>
                      <p className="text-sm text-gray-600">{s.stock_minimo}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {soloReposicion ? (
                      <>
                        <p className="text-xs font-medium text-rose-500">Faltan</p>
                        <p className="font-mono text-sm font-bold text-rose-600">
                          {-s.diferencia_stock}
                        </p>
                      </>
                    ) : (
                      <p className="font-mono text-xs text-gray-500">
                        S/ {s.precio_compra_actual.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => {
                setLoading(true)
                setPage((p) => Math.max(1, p - 1))
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <span className="text-xs text-gray-500">
              Página <span className="font-semibold text-gray-900">{page}</span> de{" "}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                setLoading(true)
                setPage((p) => Math.min(totalPages, p + 1))
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </BlurFade>

      {!isPropietario && (
        <StockAjusteModal
          item={selected}
          onClose={() => setSelected(null)}
          onSaved={loadStock}
        />
      )}
    </div>
  )
}
