"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  Receipt,
  FileX,
  X,
  User,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { DatePicker } from "@/components/ui/date-picker"
import { cn, formatNum } from "@/lib/utils"
import {
  getVentas,
  type VentaVista,
  type PaginatedVentas,
} from "@/lib/api/ventas"

// ─── VentaSummary ────────────────────────────────────────────────────────────

interface VentaSummary {
  id_venta: number
  fecha_emision: string
  cliente: string | null
  nro_boleta: string | null
  total_venta_cabecera: number
  num_productos: number
  total_unidades: number
}

function groupVentas(items: VentaVista[]): VentaSummary[] {
  const map = new Map<number, VentaSummary>()
  for (const v of items) {
    const existing = map.get(v.id_venta)
    if (existing) {
      existing.num_productos += 1
      existing.total_unidades += v.cantidad
    } else {
      map.set(v.id_venta, {
        id_venta: v.id_venta,
        fecha_emision: v.fecha_emision,
        cliente: v.cliente,
        nro_boleta: v.nro_boleta,
        total_venta_cabecera: v.total_venta_cabecera,
        num_productos: 1,
        total_unidades: v.cantidad,
      })
    }
  }
  return Array.from(map.values())
}

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => formatNum(n)

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

function fmtDayHeader(dateKey: string) {
  try {
    const d = new Date(dateKey + "T00:00:00")
    return d.toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateKey
  }
}

interface DayGroup {
  dateKey: string
  dateLabel: string
  items: VentaSummary[]
}

function groupByDay(summaries: VentaSummary[]): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const s of summaries) {
    const dateKey = s.fecha_emision.slice(0, 10)
    if (!map.has(dateKey)) {
      map.set(dateKey, { dateKey, dateLabel: fmtDayHeader(dateKey), items: [] })
    }
    map.get(dateKey)!.items.push(s)
  }
  return Array.from(map.values())
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

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

// ─── VentaRow ───────────────────────────────────────────────────────────────

interface VentaRowProps {
  v: VentaSummary
  selected: boolean
  delay: number
  onClick: () => void
}

function VentaRow({ v, selected, delay, onClick }: VentaRowProps) {
  return (
    <BlurFade delay={delay} duration={0.3}>
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-xl border bg-white px-5 py-4 transition-all duration-200",
          selected
            ? "border-blue-300 bg-blue-50 shadow-sm"
            : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm",
        )}
        aria-label={`Venta #${v.id_venta} — ${v.cliente ?? "Anónimo"}`}
      >
        {/* Avatar */}
        {v.cliente ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              avatarColor(v.id_venta),
            )}
          >
            {initials(v.cliente)}
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
              {v.cliente ?? <span className="italic text-gray-400">Anónimo</span>}
            </p>
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
              #{v.id_venta}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500">
              {v.num_productos} {v.num_productos === 1 ? "producto" : "productos"}
            </span>
            {v.nro_boleta && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600 sm:hidden">
                <Receipt className="h-3 w-3" />
                {v.nro_boleta}
              </span>
            )}
          </div>
        </div>

        {/* Date + boleta — desktop */}
        <div className="hidden flex-col items-end gap-0.5 sm:flex">
          <span className="whitespace-nowrap text-xs text-gray-500">
            {fmtDate(v.fecha_emision)}
          </span>
          {v.nro_boleta ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Receipt className="h-3 w-3" />
              {v.nro_boleta}
            </span>
          ) : (
            <span className="text-xs text-gray-300">Sin boleta</span>
          )}
        </div>

        {/* Total */}
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-semibold tabular-nums text-gray-900">
            S/ {fmt(v.total_venta_cabecera)}
          </p>
          <p className="text-xs text-gray-400">{v.total_unidades} ud.</p>
        </div>
      </div>
    </BlurFade>
  )
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  v: VentaSummary | undefined
  ventaId: number
  onClose: () => void
  onNavigate: () => void
  className?: string
}

function DetailPanel({ v, ventaId, onClose, onNavigate, className }: DetailPanelProps) {
  return (
    <div className={cn("flex w-72 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gray-100">
            <ShoppingCart className="h-3.5 w-3.5 text-gray-900" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Venta #{ventaId}</h3>
        </div>
        <button
          onClick={onClose}
          className="hidden sm:block rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!v ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : (
          <>
            {/* Client avatar + name */}
            <div className="flex items-center gap-3">
              {v.cliente ? (
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    avatarColor(v.id_venta),
                  )}
                >
                  {initials(v.cliente)}
                </div>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {v.cliente ?? <span className="italic text-gray-400">Anónimo</span>}
                </p>
                <p className="text-xs text-gray-500">{fmtDate(v.fecha_emision)}</p>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Products */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Productos</p>
              <p className="text-sm text-gray-900">
                {v.num_productos} {v.num_productos === 1 ? "producto" : "productos"} · {v.total_unidades} unidades
              </p>
            </div>

            {/* Total */}
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-500">Total</p>
              <p className="mt-1 font-mono text-xl font-bold text-blue-700">
                S/ {fmt(v.total_venta_cabecera)}
              </p>
            </div>

            {/* Boleta */}
            {v.nro_boleta && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <Receipt className="h-3.5 w-3.5 shrink-0 text-gray-900" />
                <span className="text-sm font-medium text-emerald-700">{v.nro_boleta}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={onNavigate}
          className="w-full rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Ver detalle completo →
        </button>
      </div>
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function VentasPage() {
  const router = useRouter()

  const [data, setData] = useState<PaginatedVentas | null>(null)
  const [page, setPage] = useState(1)
  const LIMIT = 5

  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [nombreCliente, setNombreCliente] = useState("")
  const [appliedDesde, setAppliedDesde] = useState("")
  const [appliedHasta, setAppliedHasta] = useState("")
  const [appliedNombre, setAppliedNombre] = useState("")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedVentaId, setSelectedVentaId] = useState<number | null>(null)

  const fetchVentas = useCallback(
    async (p: number, desde: string, hasta: string, nombre: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await getVentas({
          page: p,
          limit: LIMIT,
          ...(desde && { fecha_desde: desde }),
          ...(hasta && { fecha_hasta: hasta }),
          ...(nombre && { nombre_cliente: nombre }),
        })
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar ventas")
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    // Razonamiento: diferir carga evita setState síncrono dentro del efecto.
    const fetchVentasTimeout = window.setTimeout(() => {
      void fetchVentas(page, appliedDesde, appliedHasta, appliedNombre)
    }, 0)
    return () => window.clearTimeout(fetchVentasTimeout)
  }, [page, appliedDesde, appliedHasta, appliedNombre, fetchVentas])

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setAppliedDesde(fechaDesde)
    setAppliedHasta(fechaHasta)
    setAppliedNombre(nombreCliente)
  }

  function handleClearFilters() {
    setFechaDesde("")
    setFechaHasta("")
    setNombreCliente("")
    setPage(1)
    setAppliedDesde("")
    setAppliedHasta("")
    setAppliedNombre("")
  }

  const summaries: VentaSummary[] = useMemo(() => groupVentas(data?.items ?? []), [data?.items])
  const dayGroups: DayGroup[] = useMemo(() => groupByDay(summaries), [summaries])
  const totalPages = data?.totalPages ?? 1
  const hasFilters = !!(appliedDesde || appliedHasta || appliedNombre)
  const selectedVenta = useMemo(
    () => summaries.find((s) => s.id_venta === selectedVentaId),
    [summaries, selectedVentaId],
  )

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Mobile backdrop — at root to avoid stacking context from BlurFade transforms */}
      <AnimatePresence>
        {selectedVentaId !== null && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSelectedVentaId(null)}
          />
        )}
      </AnimatePresence>

      {/* ── header ── */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <ShoppingCart className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Ventas</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              Historial de transacciones registradas
            </p>
          </div>

        </div>
      </BlurFade>

      {/* ── filters ── */}
      <BlurFade delay={0.06} duration={0.4} className="relative z-10">
        <form
          onSubmit={handleFilterSubmit}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Desde</label>
            <DatePicker
              value={fechaDesde || undefined}
              onChange={(v) => setFechaDesde(v ?? "")}
              placeholder="Fecha inicio"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Hasta</label>
            <DatePicker
              value={fechaHasta || undefined}
              onChange={(v) => setFechaHasta(v ?? "")}
              placeholder="Fecha fin"
              align="right"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Cliente</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Buscar cliente…"
                className="h-9 rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex h-9 items-center gap-2 rounded-xl bg-[#020617] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
          >
            Filtrar
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-gray-400 transition-colors hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}

          {data && (
            <p className="ml-auto text-xs text-gray-400">
              {data.total} resultado{data.total !== 1 ? "s" : ""}
            </p>
          )}
        </form>
      </BlurFade>

      {/* ── content ── */}
      <BlurFade delay={0.12} duration={0.4} className="relative z-0">
        <div className="flex gap-4">
          {/* List */}
          <div className={cn("min-w-0 flex-1", selectedVentaId ? "lg:flex-1" : "w-full")}>
            {/* Loading */}
            {loading && (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-10 rounded-full" />
                      </div>
                      <div className="flex gap-1.5">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-3 w-14 rounded" />
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <BlurFade delay={0} duration={0.3}>
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-red-600">{error}</p>
                  <button
                    onClick={() => fetchVentas(page, appliedDesde, appliedHasta, appliedNombre)}
                    className="mt-1 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
                  >
                    Reintentar
                  </button>
                </div>
              </BlurFade>
            )}

            {/* Empty */}
            {!loading && !error && summaries.length === 0 && (
              <BlurFade delay={0} duration={0.3}>
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-20 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <FileX className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Sin ventas registradas</p>
                  {hasFilters && (
                    <p className="text-xs text-gray-400">Prueba ajustando los filtros de fecha</p>
                  )}
                </div>
              </BlurFade>
            )}

            {/* Rows grouped by day */}
            {!loading && !error && summaries.length > 0 && (
              <div className="space-y-5">
                {(() => {
                  let globalIdx = 0
                  return dayGroups.map(({ dateKey, dateLabel, items: dayItems }) => (
                    <div key={dateKey}>
                      {/* Day header */}
                      <div className="mb-2 flex items-center gap-3">
                        <span className="text-xs font-semibold capitalize text-gray-400">
                          {dateLabel}
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs text-gray-400">
                          {dayItems.length} {dayItems.length === 1 ? "venta" : "ventas"}
                        </span>
                      </div>
                      {/* Rows */}
                      <div className="space-y-2">
                        {dayItems.map((v) => {
                          const delay = Math.min(globalIdx++ * 0.03, 0.3)
                          return (
                            <VentaRow
                              key={v.id_venta}
                              v={v}
                              selected={selectedVentaId === v.id_venta}
                              delay={delay}
                              onClick={() =>
                                setSelectedVentaId(
                                  selectedVentaId === v.id_venta ? null : v.id_venta,
                                )
                              }
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && data && data.totalPages > 1 && (
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
                  Página{" "}
                  <span className="font-semibold text-gray-900">{page}</span> de{" "}
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
          </div>

          {/* Detail panel — desktop */}
          <AnimatePresence>
            {selectedVentaId !== null && (
              <motion.div
                key="detail-desktop"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="hidden lg:flex"
              >
                <DetailPanel
                  v={selectedVenta}
                  ventaId={selectedVentaId}
                  onClose={() => setSelectedVentaId(null)}
                  onNavigate={() => router.push(`/dashboard/ventas/${selectedVentaId}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </BlurFade>

      {/* Detail panel — mobile bottom sheet (at root to escape BlurFade stacking context) */}
      <BottomSheet
        open={selectedVentaId !== null}
        onClose={() => setSelectedVentaId(null)}
        wrapperClassName="lg:hidden"
      >
        <div
          className="flex flex-col bg-white rounded-t-2xl border border-gray-200 border-b-0 border-x-0 shadow-xl"
          style={{ maxHeight: "85dvh" }}
        >
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-gray-200" />
          </div>
          <DetailPanel
            v={selectedVenta}
            ventaId={selectedVentaId!}
            onClose={() => setSelectedVentaId(null)}
            onNavigate={() => router.push(`/dashboard/ventas/${selectedVentaId}`)}
            className="w-full flex-1 min-h-0 rounded-none border-none shadow-none bg-transparent"
          />
        </div>
      </BottomSheet>
    </div>
  )
}
