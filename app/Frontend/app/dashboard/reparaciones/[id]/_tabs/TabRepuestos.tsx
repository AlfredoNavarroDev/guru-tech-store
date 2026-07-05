"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatNum } from "@/lib/utils"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import {
  addRepuesto,
  removeRepuesto,
  getReparacion,
  type ReparacionResponse,
} from "@/lib/api/reparaciones"
import { getItems, type Item } from "@/lib/api/items"

interface TabRepuestosProps {
  rep: ReparacionResponse
  estadoEsFinal: boolean
  onRepUpdated: (rep: ReparacionResponse) => void
}

export function TabRepuestos({ rep, estadoEsFinal, onRepUpdated }: TabRepuestosProps) {
  const [savingRepuesto, setSavingRepuesto]     = useState(false)
  const [removingRepuesto, setRemovingRepuesto] = useState<number | null>(null)
  const [repuestoError, setRepuestoError]       = useState<string | null>(null)

  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<Item[]>([])
  const [selected, setSelected] = useState<Item | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [precio, setPrecio]     = useState("")
  const [searching, setSearching] = useState(false)
  const [focused, setFocused]   = useState(false)

  const totalRepuestos = (rep.repuestos ?? []).reduce(
    (s, r) => s + r.precio_cobrado * r.cantidad,
    0,
  )

  useEffect(() => {
    if (selected) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        setResults((await getItems({ tipo: "repuesto", nombre: query.trim() || undefined, limit: 20 })).items)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, query.trim() ? 300 : 0)
    return () => clearTimeout(t)
  }, [query, selected])

  const pick = (item: Item) => {
    setSelected(item)
    setQuery(item.nombre)
    setPrecio(String(item.precio_venta_actual))
    setResults([])
  }

  const clear = () => {
    setSelected(null)
    setQuery("")
    setPrecio("")
    setCantidad(1)
    setResults([])
  }

  const handleAdd = async () => {
    if (!selected) return
    setSavingRepuesto(true)
    setRepuestoError(null)
    try {
      await addRepuesto(rep.id_reparacion, {
        id_item: selected.id_item,
        cantidad,
        precio_cobrado: parseFloat(precio) || selected.precio_venta_actual,
        costo_unitario_momento: selected.precio_compra_actual,
      })
      const updated = await getReparacion(rep.id_reparacion)
      onRepUpdated(updated)
      clear()
      toast.success("Pieza registrada")
    } catch (e) {
      setRepuestoError(e instanceof ApiError ? e.message : "Error registrando pieza")
    } finally {
      setSavingRepuesto(false)
    }
  }

  const handleRemove = async (idRepuestoU: number) => {
    setRemovingRepuesto(idRepuestoU)
    setRepuestoError(null)
    try {
      await removeRepuesto(rep.id_reparacion, idRepuestoU)
      const updated = await getReparacion(rep.id_reparacion)
      onRepUpdated(updated)
      toast.success("Pieza eliminada")
    } catch (e) {
      setRepuestoError(e instanceof ApiError ? e.message : "Error eliminando pieza")
    } finally {
      setRemovingRepuesto(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
          <Plus className="h-3.5 w-3.5 text-gray-700" />
        </div>
        <h2 className="text-sm font-semibold text-text-heading">Piezas y repuestos</h2>
      </div>
      <div className="p-5 space-y-4">
        {/* Search & add */}
        {!estadoEsFinal && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Buscar pieza
            </p>
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => { setSelected(null); setQuery(e.target.value) }}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Escribe el nombre de la pieza o haz clic para ver todas..."
                className="rounded-xl"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
              )}
              {focused && results.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {results.map((item) => (
                    <button
                      key={item.id_item}
                      type="button"
                      onClick={() => pick(item)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                    >
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.nombre}
                      </span>
                      <span className="ml-2 shrink-0 text-xs font-semibold text-gray-500">
                        S/{formatNum(item.precio_venta_actual)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-heading">{selected.nombre}</p>
                    <p className="text-xs text-gray-500">Precio sugerido: S/{formatNum(selected.precio_venta_actual)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clear}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">Cantidad</label>
                    <Input
                      type="number"
                      min={1}
                      value={cantidad}
                      onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">Precio (S/)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAdd}
                      disabled={savingRepuesto}
                      className="w-full rounded-xl bg-[#020617] text-white hover:bg-[#0f172a]"
                    >
                      {savingRepuesto ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* List */}
        {(rep.repuestos ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No se han usado piezas todavía</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Piezas usadas
            </p>
            <div className="space-y-2">
              {(rep.repuestos ?? []).map((r) => (
                <div
                  key={r.id_repuesto_u}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-heading truncate">
                      {r.item_nombre ?? `Pieza #${r.id_item}`}
                    </p>
                    <p className="text-xs text-text-muted">
                      {r.cantidad} {r.cantidad === 1 ? "unidad" : "unidades"} · S/{formatNum(r.precio_cobrado)} c/u
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-text-heading tabular-nums">
                    S/{formatNum(r.precio_cobrado * r.cantidad)}
                  </span>
                  {!estadoEsFinal && (
                    <button
                      onClick={() => handleRemove(r.id_repuesto_u)}
                      disabled={removingRepuesto === r.id_repuesto_u}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      {removingRepuesto === r.id_repuesto_u
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {totalRepuestos > 0 && (
              <div className="flex justify-between rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold">
                <span className="text-text-heading">Total en piezas</span>
                <span className="tabular-nums text-text-heading">
                  S/{formatNum(totalRepuestos)}
                </span>
              </div>
            )}
          </div>
        )}

        {repuestoError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
            {repuestoError}
          </p>
        )}
      </div>
    </div>
  )
}
