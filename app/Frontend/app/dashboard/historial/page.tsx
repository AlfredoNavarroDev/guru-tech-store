"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle2, AlertCircle, FileX, ChevronLeft, ChevronRight, Search, User } from "lucide-react"
import { motion } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { cn, formatNum, fmtFecha, repId } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { getReparaciones, type ReparacionResponse } from "@/lib/api/reparaciones"

const PAGE_SIZE = 20

export default function HistorialPage() {
  const [items, setItems]     = useState<ReparacionResponse[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [search, setSearch]   = useState("")

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getReparaciones({ id_estado: 6, page: p, limit: PAGE_SIZE })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando historial")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page)
  }, [load, page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const filtered = search.trim()
    ? items.filter((r) => {
        const q = search.toLowerCase()
        return (
          String(r.id_reparacion).includes(q) ||
          (r.cliente ?? "").toLowerCase().includes(q) ||
          (r.marca ?? "").toLowerCase().includes(q) ||
          (r.modelo ?? "").toLowerCase().includes(q)
        )
      })
    : items

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
              <CheckCircle2 className="h-4 w-4 text-gray-900" />
            </div>
            <h1 className="text-2xl font-bold text-text-heading">Historial de reparaciones</h1>
          </div>
          <p className="mt-1.5 text-sm text-gray-500">Equipos entregados al cliente</p>
        </div>
      </BlurFade>

      {/* Content */}
      <BlurFade delay={0.06} duration={0.4}>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente, equipo, ID..."
                  className="rounded-xl pl-9 text-sm"
                />
              </div>
              {!loading && !error && (
                <p className="shrink-0 text-xs text-text-muted">
                  {total} entregado{total !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button
                onClick={() => load(page)}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <FileX className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">Sin reparaciones entregadas</p>
            </div>
          )}

          {/* Table */}
          {(loading || (!error && items.length > 0)) && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {[
                      { label: "ID",         align: "left"  },
                      { label: "Cliente",    align: "left"  },
                      { label: "Equipo",     align: "left"  },
                      { label: "Ingreso",    align: "left"  },
                      { label: "Entrega",    align: "left"  },
                      { label: "Técnico",    align: "left"  },
                      { label: "Total S/",   align: "right" },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={cn(
                          "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                          h.align === "right" ? "text-right" : "text-left",
                        )}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-14 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-text-muted">
                        Sin resultados para &quot;{search}&quot;
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <motion.tr
                        key={r.id_reparacion}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.2 }}
                        className="hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">
                          {repId(r.id_reparacion)}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <div className="font-semibold text-text-heading">
                            {r.cliente ?? "Sin cliente"}
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="font-medium text-text-heading">
                            {[r.marca, r.modelo].filter(Boolean).join(" ") || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                          {fmtFecha(r.fecha_ingreso)}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                          {fmtFecha(r.fecha_entrega_cliente)}
                        </td>
                        <td className="px-4 py-3">
                          {r.tecnico ? (
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                              <User className="h-3 w-3 shrink-0" />
                              {r.tecnico}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-heading whitespace-nowrap">
                          {r.monto_cotizado != null ? `S/${formatNum(r.monto_cotizado)}` : "—"}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
