"use client"

import { useState, useEffect } from "react"
import { Search, ArrowLeft, ArrowRight, X, Minus, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getItems, type Item } from "@/lib/api/items"
import { useNuevaReparacion } from "../_context/nueva-reparacion.context"

export function Step4Repuestos() {
  const { repuestos, setRepuestos } = useNuevaReparacion()

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Item[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loadedKey, setLoadedKey] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const requestKey = `${debouncedSearch}:${page}`
  const loading = loadedKey !== requestKey

  useEffect(() => {
    let cancelled = false
    getItems({ tipo: "repuesto", nombre: debouncedSearch || undefined, page, limit: 15, con_stock: true })
      .then((res) => {
        if (!cancelled) {
          setItems(res.items)
          setTotalPages(res.totalPages)
          setLoadedKey(requestKey)
        }
      })
      .catch(() => { if (!cancelled) toast.error("Error cargando repuestos") })
    return () => { cancelled = true }
  }, [debouncedSearch, page, requestKey])

  const selectedIds = new Set(repuestos.map((r) => r.id_item))

  function addRepuesto(item: Item) {
    setRepuestos((prev) => {
      if (prev.some((r) => r.id_item === item.id_item)) return prev
      return [
        ...prev,
        {
          id_item: item.id_item,
          nombre: item.nombre,
          sku: item.sku,
          precio_compra_actual: Number(item.precio_compra_actual),
          cantidad: 1,
          precio_cobrado: Number(item.precio_venta_actual),
        },
      ]
    })
  }

  function removeRepuesto(id_item: number) {
    setRepuestos((prev) => prev.filter((r) => r.id_item !== id_item))
  }

  function changeCantidad(id_item: number, cantidad: number) {
    setRepuestos((prev) => prev.map((r) => (r.id_item === id_item ? { ...r, cantidad } : r)))
  }

  function changePrecio(id_item: number, precio: number) {
    setRepuestos((prev) => prev.map((r) => (r.id_item === id_item ? { ...r, precio_cobrado: precio } : r)))
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#020617]/50 focus:outline-none focus:ring-2 focus:ring-[#020617]/10"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Sin resultados</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const alreadyAdded = selectedIds.has(item.id_item)
            return (
              <button
                key={item.id_item}
                onClick={() => !alreadyAdded && addRepuesto(item)}
                disabled={alreadyAdded}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-all",
                  alreadyAdded
                    ? "border-[#020617]/20 bg-[#020617]/5 opacity-60 cursor-default"
                    : "border-gray-200 bg-white hover:border-[#020617]/25 hover:bg-[#020617]/5",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.nombre}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{item.sku}</p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      S/ {Number(item.precio_venta_actual).toFixed(2)}
                    </p>
                    {alreadyAdded && <p className="text-xs text-[#020617]/50 font-medium">Agregado</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Siguiente <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {repuestos.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Repuestos seleccionados ({repuestos.length})
          </h3>
          <div className="space-y-3">
            {repuestos.map((r) => (
              <div key={r.id_item} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{r.nombre}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">{r.sku}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => changeCantidad(r.id_item, Math.max(1, r.cantidad - 1))}
                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-gray-900">{r.cantidad}</span>
                  <button
                    onClick={() => changeCantidad(r.id_item, r.cantidad + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">S/</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.precio_cobrado}
                    onChange={(e) => changePrecio(r.id_item, parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm font-medium text-gray-900 focus:border-[#020617]/50 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => removeRepuesto(r.id_item)}
                  className="ml-1 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
