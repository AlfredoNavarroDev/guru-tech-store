"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Wrench, AlertCircle,
  ChevronLeft, ChevronRight, Search, User,
} from "lucide-react"
import { motion } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { cn, fmtFecha, repId, formatNum } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { getReparaciones, type ReparacionResponse } from "@/lib/api/reparaciones"
import { EstadoBadge } from "@/components/tecnico/EstadoBadge"

const PAGE_SIZE = 20

const ESTADO_FILTROS: { label: string; id: number | null }[] = [
  { label: "Todos",              id: null },
  { label: "Pendiente",          id: 1 },
  { label: "En reparación",      id: 2 },
  { label: "Listo para entrega", id: 3 },
  { label: "Entregado",          id: 4 },
]

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
]

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

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

  const grouped = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const groups: { label: string; items: ReparacionResponse[] }[] = []
    const map = new Map<string, ReparacionResponse[]>()

    for (const r of filtered) {
      const dateStr = String(r.fecha_ingreso).slice(0, 10)
      const arr = map.get(dateStr) ?? []
      arr.push(r)
      map.set(dateStr, arr)
    }

    const sortedKeys = [...map.keys()].sort((a, b) => b.localeCompare(a))

    for (const key of sortedKeys) {
      const d = new Date(key + "T00:00:00")
      let label: string
      if (d.getTime() === today.getTime()) {
        label = "Hoy"
      } else if (d.getTime() === yesterday.getTime()) {
        label = "Ayer"
      } else {
        label = d.toLocaleDateString("es-PE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      }
      groups.push({ label, items: map.get(key)! })
    }

    return groups
  }, [filtered])

  let rowIndex = 0

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <Wrench className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Reparaciones</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              {total} equipo{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/reparaciones/nueva")}
            className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-[#020617] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0f172a] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva reparación
          </button>
        </div>
      </BlurFade>

      {/* Estado filter chips */}
      <BlurFade delay={0.06} duration={0.4}>
        <div className="mb-4 flex flex-wrap gap-2">
          {ESTADO_FILTROS.map((f) => (
            <button
              key={String(f.id)}
              onClick={() => handleFiltro(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filtroEstado === f.id
                  ? "bg-[#020617] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </BlurFade>

      {/* Search */}
      <BlurFade delay={0.08} duration={0.4}>
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, marca o modelo..."
            className="pl-9 bg-white"
          />
        </div>
      </BlurFade>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48 rounded-md" />
              </div>
              <div className="shrink-0 space-y-1.5 text-right">
                <Skeleton className="h-4 w-20 rounded-md ml-auto" />
                <Skeleton className="h-3 w-16 rounded-md ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={() => void load(page, filtroEstado)}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              Reintentar
            </button>
          </div>
        </BlurFade>
      ) : filtered.length === 0 ? (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Wrench className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              Sin reparaciones{filtroEstado !== null ? " con este estado" : ""}
            </p>
          </div>
        </BlurFade>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
                <span className="ml-2 text-gray-300 font-normal normal-case">
                  ({group.items.length})
                </span>
              </p>
              <div className="space-y-2">
                {group.items.map((r) => {
                  const delay = Math.min(rowIndex++ * 0.04, 0.3)
                  return (
                    <BlurFade key={r.id_reparacion} delay={delay} duration={0.3}>
                      <motion.div
                        whileHover={{ y: -1 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => router.push(`/dashboard/reparaciones/${r.id_reparacion}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && router.push(`/dashboard/reparaciones/${r.id_reparacion}`)}
                        className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm"
                      >
                        {/* Avatar */}
                        {r.cliente ? (
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              avatarColor(r.id_reparacion),
                            )}
                          >
                            {initials(r.cliente)}
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                        )}

                        {/* Main info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {r.cliente ?? <span className="italic text-gray-400">Sin cliente</span>}
                            </p>
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                              {repId(r.id_reparacion)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-gray-500">
                              {[r.marca, r.modelo].filter(Boolean).join(" ") || "Equipo sin especificar"}
                            </span>
                            <EstadoBadge estado={r.estado} size="sm" />
                            {r.tecnico && (
                              <span className="text-xs text-gray-400">· Téc: {r.tecnico}</span>
                            )}
                          </div>
                        </div>

                        {/* Date + price — desktop */}
                        <div className="hidden flex-col items-end gap-0.5 sm:flex">
                          {r.fecha_estimada && (
                            <span className="text-xs text-gray-500">
                              Est. {fmtFecha(r.fecha_estimada)}
                            </span>
                          )}
                        </div>

                        {/* Total */}
                        <div className="shrink-0 text-right">
                          {r.monto_total != null && r.monto_total > 0 ? (
                            <p className="font-mono text-sm font-semibold tabular-nums text-gray-900">
                              S/ {formatNum(r.monto_total)}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-300">Sin precio</p>
                          )}
                        </div>
                      </motion.div>
                    </BlurFade>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
