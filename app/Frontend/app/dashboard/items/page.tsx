"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Package,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileX,
  X,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { ItemImage } from "@/components/ui/item-image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ItemDrawer } from "@/components/abastecedor/ItemDrawer"
import { ItemDetailModal } from "@/components/abastecedor/ItemDetailModal"
import { getItems, deleteItem, type Item } from "@/lib/api/items"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const PAGE_SIZE = 20

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [tipo, setTipo] = useState<"producto" | "repuesto" | "">("")
  const [appliedTipo, setAppliedTipo] = useState<"producto" | "repuesto" | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<Item | null>(null)

  function openDetail(item: Item) {
    setDetailItem(item)
    setDetailOpen(true)
  }

  const itemParams = useMemo(() => ({
    page,
    limit: PAGE_SIZE,
    nombre: appliedSearch || undefined,
    tipo: appliedTipo || undefined,
  }), [appliedSearch, appliedTipo, page])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getItems(itemParams)
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando ítems")
    } finally {
      setLoading(false)
    }
  }, [itemParams])

  useEffect(() => {
    let ignore = false

    void getItems(itemParams)
      .then((res) => {
        if (ignore) return
        setItems(res.items)
        setTotal(res.total)
        setError(null)
      })
      .catch((e: unknown) => {
        if (ignore) return
        setError(e instanceof ApiError ? e.message : "Error cargando ítems")
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [itemParams])

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPage(1)
    setAppliedSearch(search)
    setAppliedTipo(tipo)
  }

  function handleClearFilters() {
    setLoading(true)
    setSearch("")
    setTipo("")
    setPage(1)
    setAppliedSearch("")
    setAppliedTipo("")
  }

  function openCreate() {
    setSelected(null)
    setDrawerOpen(true)
  }

  function openEdit(item: Item) {
    setSelected(item)
    setDrawerOpen(true)
  }

  async function handleDelete(item: Item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return
    try {
      await deleteItem(item.id_item)
      toast.success("Ítem eliminado")
      load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al eliminar")
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = !!(appliedSearch || appliedTipo)

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <Package className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Catálogo de ítems</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">Gestiona productos y repuestos</p>
          </div>
          <button
            onClick={openCreate}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-[#020617] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
          >
            Nuevo ítem
          </button>
        </div>
      </BlurFade>

      {/* Filters */}
      <BlurFade delay={0.06} duration={0.4}>
        <form
          onSubmit={handleFilterSubmit}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="h-9 rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todos los tipos</option>
              <option value="producto">Producto</option>
              <option value="repuesto">Repuesto</option>
            </select>
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
              {total} ítem{total !== 1 ? "s" : ""}
            </p>
          )}
        </form>
      </BlurFade>

      {/* Content */}
      <BlurFade delay={0.12} duration={0.4}>
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-4 w-14 rounded-full" />
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex gap-1 shrink-0">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                </div>
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

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileX className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Sin ítems registrados</p>
            {hasFilters && (
              <p className="text-xs text-gray-400">Prueba ajustando los filtros</p>
            )}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <TooltipProvider delay={0}>
            <div className="space-y-2">
              {items.map((item, i) => (
                <BlurFade key={item.id_item} delay={Math.min(i * 0.03, 0.3)} duration={0.3}>
                  <div
                    className="flex cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm"
                    onClick={() => openDetail(item)}
                  >
                    <ItemImage
                      src={item.imagen_url}
                      alt={item.nombre}
                      size="sm"
                      className="h-9 w-9 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{item.nombre}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-500">{item.sku}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            item.tipo === "producto"
                              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                              : "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
                          )}
                        >
                          {item.tipo}
                        </span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                      <span className="text-xs text-gray-500">
                        Compra:{" "}
                        <span className="font-mono text-gray-900">S/ {item.precio_compra_actual.toFixed(2)}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        Venta:{" "}
                        <span className="font-mono text-gray-900">S/ {item.precio_venta_actual.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(item) }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Eliminar</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </BlurFade>
              ))}
            </div>
          </TooltipProvider>
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

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        item={selected}
        onSaved={load}
      />

      <ItemDetailModal
        item={detailItem}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}
