"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRight, Plus, ArrowRight, AlertCircle, FileX, ChevronLeft, ChevronRight } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { getCambios, type CambioResponse } from "@/lib/api/cambios"
import { ApiError } from "@/lib/api/client"

const PAGE_SIZE = 20

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
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

function dayLabel(isoDate: string): string {
  const d = new Date(isoDate)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Hoy"
  if (d.toDateString() === yesterday.toDateString()) return "Ayer"
  return d.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function groupByDay(cambios: CambioResponse[]): [string, CambioResponse[]][] {
  const map = new Map<string, CambioResponse[]>()
  for (const c of cambios) {
    const key = String(c.fecha_cambio).slice(0, 10)
    const group = map.get(key) ?? []
    group.push(c)
    map.set(key, group)
  }
  return Array.from(map.entries())
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CambiosPage() {
  const router = useRouter()
  const [cambios, setCambios] = useState<CambioResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCambios({ page: p, limit: PAGE_SIZE })
      setCambios(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando cambios")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page)
  }, [load, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const groups = groupByDay(cambios)

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <ArrowLeftRight className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Cambios de producto</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">Registro de devoluciones e intercambios</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/cambios/nuevo")}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-[#020617] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
          >
            <Plus className="h-4 w-4" />
            Nuevo cambio
          </button>
        </div>
      </BlurFade>

      {/* Content */}
      <BlurFade delay={0.08} duration={0.4}>
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse"
              >
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full shrink-0" />
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
              onClick={() => load(page)}
              className="mt-1 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && cambios.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileX className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Sin cambios registrados</p>
            <button
              onClick={() => router.push("/dashboard/cambios/nuevo")}
              className="mt-1 flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar primer cambio
            </button>
          </div>
        )}

        {!loading && !error && groups.length > 0 && (
          <div className="space-y-6">
            {groups.map(([dateKey, items]) => (
              <div key={dateKey}>
                {/* Day header */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold capitalize text-gray-400">
                    {dayLabel(dateKey)}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Rows */}
                <div className="space-y-2">
                  {items.map((cambio, i) => (
                    <BlurFade
                      key={cambio.id_cambio}
                      delay={Math.min(i * 0.03, 0.2)}
                      duration={0.3}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/dashboard/cambios/${cambio.id_cambio}`)
                        }
                        className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                          <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-sm">
                            <span className="font-medium text-gray-900 truncate max-w-[130px] sm:max-w-none">
                              {cambio.nombre_item_devuelto}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            <span className="font-medium text-gray-900 truncate max-w-[130px] sm:max-w-none">
                              {cambio.nombre_item_entregado}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            <span>
                              Venta{" "}
                              <span className="font-mono font-medium text-gray-700">
                                #{cambio.id_venta_origen}
                              </span>
                            </span>
                            <span>{fmtDate(cambio.fecha_cambio)}</span>
                            <span className="truncate">{cambio.motivo}</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {cambio.diferencia_cobrada > 0 ? (
                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--color-lime)]"
                              style={{ background: "var(--color-bg-dark)" }}
                            >
                              +S/ {cambio.diferencia_cobrada.toFixed(2)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                              Sin diferencia
                            </span>
                          )}
                        </div>
                      </button>
                    </BlurFade>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </BlurFade>
    </div>
  )
}
