"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileX,
  X,
  Truck,
  Search,
  Plus,
  ArrowRight,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog } from "@/components/ui/dialog"
import { getCompras, getCompra, type Compra } from "@/lib/api/compras"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const PAGE_SIZE = 20

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

interface DayGroup {
  dateKey: string
  dateLabel: string
  items: Compra[]
}

function groupByDay(compras: Compra[]): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const c of compras) {
    const dateKey = c.fecha_compra.slice(0, 10)
    if (!map.has(dateKey)) {
      map.set(dateKey, { dateKey, dateLabel: fmtDayHeader(dateKey), items: [] })
    }
    map.get(dateKey)!.items.push(c)
  }
  return Array.from(map.values())
}

interface CompraRowProps {
  c: Compra
  selected: boolean
  delay: number
  onClick: () => void
}

function CompraRow({ c, selected, delay, onClick }: CompraRowProps) {
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
        aria-label={`Compra ${c.id_compra} — ${c.proveedor ?? "Sin proveedor"}`}
      >
        {c.proveedor ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              avatarColor(c.id_compra),
            )}
          >
            {initials(c.proveedor)}
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <Truck className="h-4 w-4 text-gray-400" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-gray-900">
              {c.proveedor ?? <span className="italic text-gray-400">Sin proveedor</span>}
            </p>
            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
              COM-{String(c.id_compra).padStart(3, "0")}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{fmtDate(c.fecha_compra)}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-semibold tabular-nums text-gray-900">
            S/ {Number(c.costo_total).toFixed(2)}
          </p>
        </div>
      </div>
    </BlurFade>
  )
}

interface DetailPanelProps {
  compra: Compra | null
  compraId: number
  detailLoading: boolean
  onClose: () => void
  onViewDetail: () => void
  className?: string
}

function DetailPanel({ compra, compraId, detailLoading, onClose, onViewDetail, className }: DetailPanelProps) {
  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gray-100">
            <ShoppingBag className="h-3.5 w-3.5 text-gray-900" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            COM-{String(compraId).padStart(3, "0")}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="hidden sm:block rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Cerrar panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : !compra ? (
          <p className="text-sm text-gray-400">No disponible</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {compra.proveedor ? (
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    avatarColor(compra.id_compra),
                  )}
                >
                  {initials(compra.proveedor)}
                </div>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Truck className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {compra.proveedor ?? (
                    <span className="italic text-gray-400">Sin proveedor</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{fmtDate(compra.fecha_compra)}</p>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-500">Total</p>
              <p className="mt-1 font-mono text-xl font-bold text-blue-700">
                S/ {Number(compra.costo_total).toFixed(2)}
              </p>
            </div>

            {compra.detalles && compra.detalles.length > 0 && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Productos
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800">
                  {compra.detalles.length} {compra.detalles.length === 1 ? "ítem" : "ítems"}
                </p>
              </div>
            )}

            <button
              onClick={onViewDetail}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Ver detalle completo
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ComprasPage() {
  const router = useRouter()

  const [compras, setCompras] = useState<Compra[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchProveedor, setSearchProveedor] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailCompra, setDetailCompra] = useState<Compra | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const compraParams = useMemo(() => ({
    page,
    limit: PAGE_SIZE,
    proveedor: appliedSearch || undefined,
  }), [appliedSearch, page])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCompras(compraParams)
      setCompras(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando compras")
    } finally {
      setLoading(false)
    }
  }, [compraParams])

  useEffect(() => {
    let ignore = false

    void getCompras(compraParams)
      .then((res) => {
        if (ignore) return
        setCompras(res.items)
        setTotal(res.total)
        setError(null)
      })
      .catch((e: unknown) => {
        if (ignore) return
        setError(e instanceof ApiError ? e.message : "Error cargando compras")
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [compraParams])

  async function handleSelectCompra(id: number) {
    if (selectedId === id) {
      setSelectedId(null)
      setDetailCompra(null)
      return
    }
    setSelectedId(id)
    const cached = compras.find((c) => c.id_compra === id)
    if (cached?.detalles) {
      setDetailCompra(cached)
      return
    }
    setDetailLoading(true)
    try {
      const full = await getCompra(id)
      setDetailCompra(full)
      setCompras((cs) => cs.map((c) => (c.id_compra === id ? full : c)))
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error cargando detalle")
    } finally {
      setDetailLoading(false)
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPage(1)
    setAppliedSearch(searchProveedor)
  }

  function handleClearFilters() {
    setLoading(true)
    setSearchProveedor("")
    setAppliedSearch("")
    setPage(1)
  }

  const dayGroups = useMemo(() => groupByDay(compras), [compras])
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = !!appliedSearch
  const currentDetail = detailCompra?.id_compra === selectedId ? detailCompra : null

  function closePanel() {
    setSelectedId(null)
    setDetailCompra(null)
  }

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <AnimatePresence>
        {selectedId !== null && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={closePanel}
          />
        )}
      </AnimatePresence>

      <BlurFade delay={0} duration={0.4}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <ShoppingBag className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Compras</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">Historial de ordenes de compra</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/compras/nueva")}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-[#020617] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
          >
            <Plus className="h-4 w-4" />
            Nueva compra
          </button>
        </div>
      </BlurFade>

      <BlurFade delay={0.06} duration={0.4} className="relative z-10">
        <form
          onSubmit={handleFilterSubmit}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Proveedor</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchProveedor}
                onChange={(e) => setSearchProveedor(e.target.value)}
                placeholder="Filtrar por proveedor..."
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

          {!loading && (
            <p className="ml-auto text-xs text-gray-400">
              {total} orden{total !== 1 ? "es" : ""}
            </p>
          )}
        </form>
      </BlurFade>

      <BlurFade delay={0.12} duration={0.4} className="relative z-0">
        <div className="flex gap-4">
          <div className={cn("min-w-0 flex-1", selectedId !== null ? "lg:flex-1" : "w-full")}>
            {loading && (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-1/4" />
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
                  onClick={load}
                  className="mt-1 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
                >
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && compras.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-20 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <FileX className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">Sin compras registradas</p>
                {hasFilters && (
                  <p className="text-xs text-gray-400">Prueba ajustando el filtro de proveedor</p>
                )}
              </div>
            )}

            {!loading && !error && compras.length > 0 && (
              <div className="space-y-5">
                {(() => {
                  let globalIdx = 0
                  return dayGroups.map(({ dateKey, dateLabel, items: dayItems }) => (
                    <div key={dateKey}>
                      <div className="mb-2 flex items-center gap-3">
                        <span className="text-xs font-semibold capitalize text-gray-400">
                          {dateLabel}
                        </span>
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs text-gray-400">
                          {dayItems.length} {dayItems.length === 1 ? "compra" : "compras"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dayItems.map((c) => {
                          const delay = Math.min(globalIdx++ * 0.03, 0.3)
                          return (
                            <CompraRow
                              key={c.id_compra}
                              c={c}
                              selected={selectedId === c.id_compra}
                              delay={delay}
                              onClick={() => handleSelectCompra(c.id_compra)}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
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
                  Pagina <span className="font-semibold text-gray-900">{page}</span> de{" "}
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
          </div>

          <AnimatePresence>
            {selectedId !== null && (
              <motion.div
                key="detail-desktop"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="hidden lg:flex"
              >
                <DetailPanel
                  compra={currentDetail}
                  compraId={selectedId}
                  detailLoading={detailLoading}
                  onClose={closePanel}
                  onViewDetail={() => router.push(`/dashboard/compras/${selectedId}`)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BlurFade>

      <Dialog
        open={selectedId !== null}
        onClose={closePanel}
      >
        <div
          className="flex flex-col rounded-t-2xl border border-b-0 border-x-0 border-gray-200 bg-white shadow-xl"
          style={{ maxHeight: "85dvh" }}
        >
          {selectedId !== null && (
            <DetailPanel
              compra={currentDetail}
              compraId={selectedId}
              detailLoading={detailLoading}
              onClose={closePanel}
              onViewDetail={() => router.push(`/dashboard/compras/${selectedId}`)}
              className="w-full flex-1 min-h-0 rounded-none border-none shadow-none bg-transparent"
            />
          )}
        </div>
      </Dialog>
    </div>
  )
}
