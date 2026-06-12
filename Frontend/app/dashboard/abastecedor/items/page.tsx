"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { getItems, deleteItem, type Item } from "@/lib/api/items"
import { ApiError } from "@/lib/api/client"
import { ItemDrawer } from "@/components/abastecedor/ItemDrawer"
import { toast } from "sonner"

const PAGE_SIZE = 20

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [tipo, setTipo] = useState<"producto" | "repuesto" | "">("")
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getItems({
        page,
        limit: PAGE_SIZE,
        nombre: search || undefined,
        tipo: tipo || undefined,
      })
      setItems(res.data)
      setTotal(res.total)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error cargando ítems")
    } finally {
      setLoading(false)
    }
  }, [page, search, tipo])

  useEffect(() => { load() }, [load])

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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Catálogo de Ítems</h1>
          <p className="text-sm text-white/40 mt-0.5">{total} ítems registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo ítem
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
          value={tipo}
          onChange={(e) => { setTipo(e.target.value as typeof tipo); setPage(1) }}
        >
          <option value="">Todos los tipos</option>
          <option value="producto">Producto</option>
          <option value="repuesto">Repuesto</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/30">Sin resultados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left font-medium text-white/50">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-white/50">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-white/50">Tipo</th>
                <th className="px-4 py-3 text-right font-medium text-white/50">P. Compra</th>
                <th className="px-4 py-3 text-right font-medium text-white/50">P. Venta</th>
                <th className="px-4 py-3 text-right font-medium text-white/50">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id_item} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-white/60">{item.sku}</td>
                  <td className="px-4 py-3 text-white">{item.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.tipo === 'producto'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white/70">S/. {item.precio_compra_actual.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-white/70">S/. {item.precio_venta_actual.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded p-1.5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="rounded p-1.5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-white/50">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-white/10 p-1.5 disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 p-1.5 disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ItemDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        item={selected}
        onSaved={load}
      />
    </div>
  )
}
