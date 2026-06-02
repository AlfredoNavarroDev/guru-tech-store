"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  Receipt,
  Plus,
  FileX,
  X,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import {
  getVentas,
  type VentaVista,
  type PaginatedVentas,
} from "@/lib/api/ventas"

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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

// ─── component ──────────────────────────────────────────────────────────────

export default function VentasPage() {
  const router = useRouter()

  // pagination & data
  const [data, setData] = useState<PaginatedVentas | null>(null)
  const [page, setPage] = useState(1)
  const LIMIT = 20

  // filters (controlled inputs, only applied on submit)
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  // committed filters (what the last fetch used)
  const [appliedDesde, setAppliedDesde] = useState("")
  const [appliedHasta, setAppliedHasta] = useState("")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // detail panel
  const [selectedVentaId, setSelectedVentaId] = useState<number | null>(null)

  const fetchVentas = useCallback(
    async (p: number, desde: string, hasta: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await getVentas({
          page: p,
          limit: LIMIT,
          ...(desde && { fecha_desde: desde }),
          ...(hasta && { fecha_hasta: hasta }),
        })
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar ventas")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // initial load and page changes
  useEffect(() => {
    fetchVentas(page, appliedDesde, appliedHasta)
  }, [page, appliedDesde, appliedHasta, fetchVentas])

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setAppliedDesde(fechaDesde)
    setAppliedHasta(fechaHasta)
  }

  function handleClearFilters() {
    setFechaDesde("")
    setFechaHasta("")
    setPage(1)
    setAppliedDesde("")
    setAppliedHasta("")
  }

  const items: VentaVista[] = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const hasFilters = appliedDesde || appliedHasta

  return (
    <div className="min-h-full bg-bg-main p-6 lg:p-8">
      {/* ── header ── */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-50">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </div>
              <h1 className="text-xl font-bold text-text-heading">Ventas</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Historial de transacciones registradas
            </p>
          </div>

          <Button
            onClick={() => router.push("/dashboard/ventas/nueva")}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Nueva venta
          </Button>
        </div>
      </BlurFade>

      {/* ── filters ── */}
      <BlurFade delay={0.06} duration={0.4}>
        <form
          onSubmit={handleFilterSubmit}
          className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Desde</label>
            <DatePicker
              value={fechaDesde || undefined}
              onChange={(v) => setFechaDesde(v ?? "")}
              placeholder="Fecha inicio"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Hasta</label>
            <DatePicker
              value={fechaHasta || undefined}
              onChange={(v) => setFechaHasta(v ?? "")}
              placeholder="Fecha fin"
              align="right"
            />
          </div>

          <button
            type="submit"
            className="flex h-9 items-center gap-2 rounded-2xl bg-blue-50 px-4 text-sm font-medium text-blue-500 transition-colors hover:bg-blue-100"
          >
            <Search className="h-3.5 w-3.5" />
            Filtrar
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-9 rounded-2xl px-3 text-sm text-text-muted transition-colors hover:text-text-heading"
            >
              Limpiar
            </button>
          )}

          {data && (
            <p className="ml-auto text-xs text-text-muted">
              {data.total} resultado{data.total !== 1 ? "s" : ""}
            </p>
          )}
        </form>
      </BlurFade>

      {/* ── table card ── */}
      <BlurFade delay={0.12} duration={0.4}>
        <div className="flex gap-4">
          {/* Table (shrinks when panel open) */}
          <div
            className={cn(
              "rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300",
              selectedVentaId ? "flex-1 min-w-0" : "w-full"
            )}
          >
            {/* loading */}
            {loading && (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {/* error */}
            {!loading && error && (
              <div className="flex flex-col items-center gap-3 py-24">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-sm font-medium text-red-600">{error}</p>
                <button
                  onClick={() => fetchVentas(page, appliedDesde, appliedHasta)}
                  className="mt-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* empty */}
            {!loading && !error && items.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-24">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <FileX className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">Sin ventas registradas</p>
                {hasFilters && (
                  <p className="text-xs text-gray-400">
                    Prueba ajustando los filtros de fecha
                  </p>
                )}
              </div>
            )}

            {/* table */}
            {!loading && !error && items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600">
                      <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                        # Venta
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-medium text-white/80 uppercase tracking-wider">
                        Cant.
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-medium text-white/80 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                        Boleta
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((v) => (
                      <tr
                        key={`${v.id_venta}-${v.sku}`}
                        onClick={() => setSelectedVentaId(v.id_venta)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedVentaId === v.id_venta
                            ? "bg-blue-50"
                            : "hover:bg-gray-50"
                        )}
                      >
                        {/* id_venta */}
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-blue-500">
                            #{v.id_venta}
                          </span>
                        </td>

                        {/* fecha */}
                        <td className="whitespace-nowrap px-5 py-3.5 text-gray-500">
                          {fmtDate(v.fecha_emision)}
                        </td>

                        {/* cliente */}
                        <td className="px-5 py-3.5">
                          {v.cliente ? (
                            <span className="text-gray-900">{v.cliente}</span>
                          ) : (
                            <span className="italic text-gray-400">Anónimo</span>
                          )}
                        </td>

                        {/* producto */}
                        <td className="max-w-[200px] px-5 py-3.5">
                          <span className="block truncate text-gray-700">{v.producto}</span>
                        </td>

                        {/* sku */}
                        <td className="px-5 py-3.5">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                            {v.sku}
                          </span>
                        </td>

                        {/* cantidad */}
                        <td className="px-5 py-3.5 text-right text-gray-500">
                          {v.cantidad}
                        </td>

                        {/* total */}
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-semibold tabular-nums text-gray-900">
                            S/ {fmt(v.total_venta)}
                          </span>
                        </td>

                        {/* boleta */}
                        <td className="px-5 py-3.5">
                          {v.nro_boleta ? (
                            <span className="flex items-center gap-1.5 text-emerald-600">
                              <Receipt className="h-3.5 w-3.5" />
                              {v.nro_boleta}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── pagination ── */}
            {!loading && !error && data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
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
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedVentaId && (
            <div className="w-80 shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Venta #{selectedVentaId}
                </h3>
                <button
                  onClick={() => setSelectedVentaId(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {(() => {
                  const v = items.find((i) => i.id_venta === selectedVentaId)
                  if (!v)
                    return <p className="text-sm text-gray-500">Cargando...</p>
                  return (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Fecha
                        </p>
                        <p className="text-sm text-gray-900">
                          {fmtDate(v.fecha_emision)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Cliente
                        </p>
                        <p className="text-sm text-gray-900">
                          {v.cliente ?? "Anónimo"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Producto
                        </p>
                        <p className="text-sm text-gray-900">{v.producto}</p>
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                          {v.sku}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Cantidad
                        </p>
                        <p className="text-sm text-gray-900">
                          {v.cantidad} unidades
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                          Total
                        </p>
                        <p className="mt-1 text-xl font-bold text-blue-700">
                          S/ {fmt(v.total_venta)}
                        </p>
                      </div>
                      {v.nro_boleta && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Boleta
                          </p>
                          <p className="text-sm text-emerald-600 font-medium">
                            {v.nro_boleta}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          router.push(`/dashboard/ventas/${selectedVentaId}`)
                        }
                        className="w-full mt-2 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Ver detalle completo →
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </BlurFade>
    </div>
  )
}
