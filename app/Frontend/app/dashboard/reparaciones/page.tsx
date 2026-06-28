"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Wrench, AlertCircle,
  ChevronLeft, ChevronRight, Search,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, fmtFecha, repId } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { getReparaciones, type ReparacionResponse } from "@/lib/api/reparaciones"
import { EstadoBadge } from "@/components/tecnico/EstadoBadge"

const PAGE_SIZE = 20

const ESTADO_FILTROS: { label: string; id: number | null }[] = [
  { label: "Todos",               id: null },
  { label: "Pendiente",           id: 1 },
  { label: "En diagnóstico",      id: 2 },
  { label: "En reparación",       id: 3 },
  { label: "Esperando repuestos", id: 4 },
  { label: "Listo para entrega",  id: 5 },
  { label: "Entregado",           id: 6 },
]

export default function ReparacionesPage() {
  const router = useRouter()

  const [items, setItems]               = useState<ReparacionResponse[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<number | null>(null)
  const [search, setSearch]             = useState("")

  const load = useCallback(async (p: number, idEstado: number | null) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getReparaciones({
        page: p,
        limit: PAGE_SIZE,
        ...(idEstado !== null ? { id_estado: idEstado } : {}),
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando reparaciones")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page, filtroEstado)
  }, [load, page, filtroEstado])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleFiltro(id: number | null) {
    setFiltroEstado(id)
    setPage(1)
  }

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
      <BlurFade delay={0} duration={0.4}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-heading">Reparaciones</h1>
            <p className="text-sm text-gray-500">
              {total} equipo{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/reparaciones/nueva")}
            className="flex items-center gap-2 rounded-xl bg-[#020617] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0f172a] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva reparación
          </button>
        </div>

        {/* Estado filter chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {ESTADO_FILTROS.map((f) => (
            <button
              key={String(f.id)}
              onClick={() => handleFiltro(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filtroEstado === f.id
                  ? "bg-[#020617] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, marca o modelo..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#020617]/40 focus:outline-none focus:ring-2 focus:ring-[#020617]/10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4"
              >
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
                <div className="shrink-0 space-y-1.5 text-right">
                  <Skeleton className="h-3 w-16 rounded-md ml-auto" />
                  <Skeleton className="h-3 w-12 rounded-md ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Wrench className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              Sin reparaciones{filtroEstado !== null ? " con este estado" : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <button
                key={r.id_reparacion}
                onClick={() => router.push(`/dashboard/reparaciones/${r.id_reparacion}`)}
                className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <Wrench className="h-4 w-4 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-heading">
                      {repId(r.id_reparacion)}
                    </span>
                    <EstadoBadge estado={r.estado} size="sm" />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {r.cliente ?? "Sin cliente"} ·{" "}
                    {[r.marca, r.modelo].filter(Boolean).join(" ") || "Equipo sin especificar"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400">{fmtFecha(r.fecha_ingreso)}</p>
                  {r.fecha_estimada && (
                    <p className="text-xs text-gray-400">Est. {fmtFecha(r.fecha_estimada)}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </BlurFade>
    </div>
  )
}
