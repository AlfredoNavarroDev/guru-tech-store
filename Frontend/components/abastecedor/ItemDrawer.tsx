"use client"

import { useEffect, useState } from "react"
import { X, Loader2 } from "lucide-react"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import {
  type Item,
  type CreateItemPayload,
  type Categoria,
  type Marca,
  createItem,
  updateItem,
  getCategorias,
  getMarcas,
} from "@/lib/api/items"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

interface ItemDrawerProps {
  open: boolean
  onClose: () => void
  item?: Item | null
  onSaved: () => void
}

const EMPTY: CreateItemPayload = {
  tipo: 'producto',
  sku: '',
  nombre: '',
  precio_compra_actual: 0,
  precio_venta_actual: 0,
  categoria_ids: [],
  stock_minimo: 0,
  cantidad_inicial: 0,
}

export function ItemDrawer({ open, onClose, item, onSaved }: ItemDrawerProps) {
  const [form, setForm] = useState<CreateItemPayload>(EMPTY)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {})
    getMarcas().then(setMarcas).catch(() => {})
  }, [])

  useEffect(() => {
    if (item) {
      const catIds = categorias
        .filter((c) => item.categorias.includes(c.nombre_categoria))
        .map((c) => c.id_categoria)
      setForm({
        tipo: item.tipo,
        sku: item.sku,
        nombre: item.nombre,
        id_marca: item.id_marca ?? undefined,
        precio_compra_actual: item.precio_compra_actual,
        precio_venta_actual: item.precio_venta_actual,
        categoria_ids: catIds,
        modelo: item.modelo ?? undefined,
        calidad: item.calidad ?? undefined,
      })
    } else {
      setForm(EMPTY)
    }
  }, [item, categorias, open])

  function set<K extends keyof CreateItemPayload>(key: K, value: CreateItemPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleCategoria(id: number) {
    const ids = form.categoria_ids ?? []
    set('categoria_ids', ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  }

  async function handleSave() {
    if (!form.nombre.trim() || !form.sku.trim()) {
      toast.error("Nombre y SKU son obligatorios")
      return
    }
    if (form.tipo === 'producto' && !form.categoria_ids?.length) {
      toast.error("Los productos deben tener al menos una categoría")
      return
    }
    setSaving(true)
    try {
      if (item) {
        await updateItem(item.id_item, form)
        toast.success("Ítem actualizado")
      } else {
        await createItem(form)
        toast.success("Ítem creado")
      }
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
  const labelCls = "block text-xs text-white/50 mb-1"

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="rounded-t-2xl sm:rounded-2xl bg-[#0a0a0f] border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-semibold text-white">
            {item ? "Editar ítem" : "Nuevo ítem"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10 text-white/50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input
                className={inputCls}
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                placeholder="Cable USB-C 3m"
              />
            </div>
            <div>
              <label className={labelCls}>SKU *</label>
              <input
                className={inputCls}
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="PRD-010"
              />
            </div>
            <div>
              <label className={labelCls}>Tipo *</label>
              <select
                className={inputCls}
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as 'producto' | 'repuesto')}
              >
                <option value="producto">Producto</option>
                <option value="repuesto">Repuesto</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Marca</label>
              <select
                className={inputCls}
                value={form.id_marca ?? ''}
                onChange={(e) => set('id_marca', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Sin marca</option>
                {marcas.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Precio compra (S/.) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.precio_compra_actual}
                onChange={(e) => set('precio_compra_actual', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Precio venta (S/.) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.precio_venta_actual}
                onChange={(e) => set('precio_venta_actual', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Stock mínimo</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputCls}
                value={form.stock_minimo ?? 0}
                onChange={(e) => set('stock_minimo', parseInt(e.target.value) || 0)}
              />
            </div>
            {!item && (
              <div>
                <label className={labelCls}>Stock inicial</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputCls}
                  value={form.cantidad_inicial ?? 0}
                  onChange={(e) => set('cantidad_inicial', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
          </div>

          {categorias.length > 0 && (
            <div>
              <label className={labelCls}>
                Categorías {form.tipo === 'producto' ? '(obligatorio ≥1)' : '(opcional)'}
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {categorias.map((c) => {
                  const selected = (form.categoria_ids ?? []).includes(c.id_categoria)
                  return (
                    <button
                      key={c.id_categoria}
                      type="button"
                      onClick={() => toggleCategoria(c.id_categoria)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {c.nombre_categoria}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
