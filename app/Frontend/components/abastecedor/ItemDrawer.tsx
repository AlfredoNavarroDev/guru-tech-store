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
  onSaved: (created?: Item) => void
}

function generateSku(tipo: 'producto' | 'repuesto'): string {
  const prefix = tipo === 'producto' ? 'PRD' : 'REP'
  return `${prefix}-${Date.now().toString().slice(-6)}`
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

function buildForm(item: Item | null | undefined, categorias: Categoria[]): CreateItemPayload {
  if (!item) return { ...EMPTY, sku: generateSku('producto') }
  const catIds = categorias
    .filter((c) => item.categorias.includes(c.nombre_categoria))
    .map((c) => c.id_categoria)
  return {
    tipo: item.tipo,
    sku: item.sku,
    nombre: item.nombre,
    id_marca: item.id_marca ?? undefined,
    precio_compra_actual: item.precio_compra_actual,
    precio_venta_actual: item.precio_venta_actual,
    categoria_ids: catIds,
    modelo: item.modelo ?? undefined,
    calidad: item.calidad ?? undefined,
  }
}

export function ItemDrawer({ open, onClose, item, onSaved }: ItemDrawerProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {})
    getMarcas().then(setMarcas).catch(() => {})
  }, [])

  return (
    <ItemDrawerForm
      key={`${open ? "open" : "closed"}-${item?.id_item ?? "new"}-${categorias.length}`}
      open={open}
      onClose={onClose}
      item={item}
      onSaved={onSaved}
      categorias={categorias}
      marcas={marcas}
    />
  )
}

interface ItemDrawerFormProps extends ItemDrawerProps {
  categorias: Categoria[]
  marcas: Marca[]
}

function ItemDrawerForm({ open, onClose, item, onSaved, categorias, marcas }: ItemDrawerFormProps) {
  const [form, setForm] = useState<CreateItemPayload>(() => buildForm(item, categorias))
  const [saving, setSaving] = useState(false)

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
    if (!form.id_marca) {
      toast.error("La marca es obligatoria")
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
        onSaved()
      } else {
        const created = await createItem(form)
        toast.success("Ítem creado")
        onSaved(created)
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al guardar")
      return
    } finally {
      setSaving(false)
    }
    onClose()
  }

  const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text-heading placeholder:text-text-muted focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
  const labelCls = "block text-xs text-text-muted mb-1"

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="max-h-[90vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-text-heading">
            {item ? "Editar ítem" : "Nuevo ítem"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-heading">
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
              <label className={labelCls}>SKU (autogenerado)</label>
              <input
                className={`${inputCls} bg-gray-50 text-text-muted cursor-default select-all`}
                value={form.sku}
                readOnly
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
              <label className={labelCls}>Marca *</label>
              <select
                className={inputCls}
                value={form.id_marca ?? ''}
                onChange={(e) => set('id_marca', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Seleccionar marca</option>
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
              <label className={labelCls}>Stock mínimo *</label>
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
                <label className={labelCls}>Stock inicial *</label>
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
            <div>
              <label className={labelCls}>Modelo</label>
              <input
                className={inputCls}
                value={form.modelo ?? ''}
                onChange={(e) => set('modelo', e.target.value || undefined)}
                placeholder="Galaxy S24"
              />
            </div>
            <div>
              <label className={labelCls}>Calidad</label>
              <input
                className={inputCls}
                value={form.calidad ?? ''}
                onChange={(e) => set('calidad', e.target.value || undefined)}
                placeholder="original"
              />
            </div>
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
                          : 'bg-gray-100 text-text-muted hover:bg-gray-200'
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

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-gray-100 transition-colors"
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
