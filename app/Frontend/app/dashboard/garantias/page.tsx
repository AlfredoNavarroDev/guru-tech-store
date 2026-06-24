"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  Plus,
  AlertCircle,
  FileX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { getSession } from "@/lib/api/auth"
import { getGarantias, type GarantiaResponse } from "@/lib/api/garantias"
import { ApiError } from "@/lib/api/client"

const PAGE_SIZE = 20

const ESTADO_FILTERS = [
  { label: "Todas", value: "" },
  { label: "Activa", value: "activa" },
  { label: "Vencida", value: "vencida" },
  { label: "Invalidada", value: "invalidada" },
] as const

type EstadoFilter = (typeof ESTADO_FILTERS)[number]["value"]

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

function EstadoBadge({ estado }: { estado: GarantiaResponse["estado"] }) {
  const map: Record<string, string> = {
    activa: "bg-green-100 text-green-700",
    vencida: "bg-yellow-100 text-yellow-700",
    invalidada: "bg-red-100 text-red-600",
  }
  const label: Record<string, string> = {
    activa: "Activa",
    vencida: "Vencida",
    invalidada: "Invalidada",
  }
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[estado] ?? "bg-gray-100 text-gray-500"}`}
    >
      {label[estado] ?? estado}
    </span>
  )
}

export default function GarantiasPage() {
  const router = useRouter()
  const [items, setItems] = useState<GarantiaResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("")
  const rol = getSession()?.rol ?? ""

  const load = useCallback(
    async (p: number, estado: EstadoFilter) => {
      setLoading(true)
      setError(null)
      try {
        const res = await getGarantias({
          page: p,
          limit: PAGE_SIZE,
          estado: estado || undefined,
        })
        setItems(res.items)
        setTotal(res.total)
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Error cargando garantías")
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void load(page, estadoFilter)
  }, [load, page, estadoFilter])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleFilterChange = (v: EstadoFilter) => {
    setEstadoFilter(v)
    setPage(1)
  }

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <ShieldCheck className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Garantías</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              {rol === "tecnico"
                ? "Garantías de reparaciones"
                : "Garantías de ventas"}
            </p>
          </div>
          {rol === "tecnico" && (
            <button
              onClick={() => router.push("/dashboard/garantias/nueva")}
              className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-[#020617] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
            >
              <Plus className="h-4 w-4" />
              Nueva garantía
            </button>
          )}
        </div>
      </BlurFade>

      {/* Filter chips */}
      <BlurFade delay={0.04} duration={0.4}>
        <div className="mb-5 flex flex-wrap gap-2">
          {ESTADO_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                estadoFilter === value
                  ? "bg-[#020617] text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
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
              onClick={() => load(page, estadoFilter)}
              className="mt-1 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileX className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Sin garantías registradas
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-2">
            {items.map((g, i) => (
              <BlurFade key={g.id_garantia} delay={Math.min(i * 0.03, 0.2)} duration={0.3}>
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {g.referencia_label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {fmtDate(g.fecha_inicio)} → {fmtDate(g.fecha_fin)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <EstadoBadge estado={g.estado} />
                  </div>
                </div>
              </BlurFade>
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
              Página <span className="font-semibold text-gray-900">{page}</span>{" "}
              de{" "}
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
