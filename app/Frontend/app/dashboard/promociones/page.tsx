"use client"

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { BlurFade } from "@/components/ui/blur-fade"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getSession } from "@/lib/api/auth"
import {
  getPromociones,
  createPromocion,
  updatePromocion,
  deletePromocion,
  type Promocion,
  type CreatePromocionInput,
} from "@/lib/api/promociones"
import { getItems, getCategorias, getSedes, type Item, type Categoria, type Sede } from "@/lib/api/items"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"

// ─── helpers ────────────────────────────────────────────────────────────────

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sabado" },
]

function diaSemanaLabel(value: number | null): string {
  if (value === null) return ""
  return DIAS_SEMANA.find((d) => d.value === value)?.label ?? `Dia ${value}`
}

function formatDiscount(tipo: string, valor: number): string {
  if (tipo === "porcentaje") return `${valor}%`
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(valor)
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
}

function noopSubscribe() {
  return () => undefined
}

// ─── EstadoBadge ────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: Promocion["estado"] }) {
  const map: Record<Promocion["estado"], string> = {
    activa: "bg-emerald-100 text-emerald-700",
    pausada: "bg-yellow-100 text-yellow-700",
    vencida: "bg-gray-100 text-gray-500",
    cancelada: "bg-red-100 text-red-600",
  }
  const labels: Record<Promocion["estado"], string> = {
    activa: "Activa",
    pausada: "Pausada",
    vencida: "Vencida",
    cancelada: "Cancelada",
  }
  return (
    <span
      className={cn(
        "w-fit rounded-full px-2 py-0.5 text-xs font-medium leading-none",
        map[estado] ?? "bg-gray-100 text-gray-500",
      )}
    >
      {labels[estado] ?? estado}
    </span>
  )
}

// ─── Scope label ────────────────────────────────────────────────────────────

function scopeLabel(promo: Promocion): string {
  if (promo.item_nombre) return `Item: ${promo.item_nombre}`
  if (promo.nombre_categoria) return `Categoria: ${promo.nombre_categoria}`
  return "General"
}

// ─── Skeleton rows ──────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
          <div className="hidden sm:flex flex-col gap-1 min-w-[100px]">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <div className="hidden md:flex gap-1.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ItemPickerCombobox ──────────────────────────────────────────────────────

interface ItemPickerProps {
  items: Item[]
  selectedId: number | undefined
  onChange: (id: number | undefined) => void
  disabled?: boolean
}

function ItemPickerCombobox({ items, selectedId, onChange, disabled }: ItemPickerProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = items.find((i) => i.id_item === selectedId) ?? null

  const filtered = query.length >= 1
    ? items
        .filter(
          (i) =>
            i.nombre.toLowerCase().includes(query.toLowerCase()) ||
            i.sku.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : items.slice(0, 8)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleSelect(item: Item) {
    onChange(item.id_item)
    setQuery("")
    setOpen(false)
  }

  function handleClear() {
    onChange(undefined)
    setQuery("")
  }

  const baseCls =
    "flex items-center gap-2 w-full rounded-xl border bg-white px-3 py-2 text-sm transition-colors"

  if (selected && !open) {
    return (
      <div className={cn(baseCls, "border-blue-400")}>
        {selected.imagen_url ? (
          <img src={selected.imagen_url} alt="" className="h-6 w-6 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="text-base leading-none">📦</span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{selected.nombre}</span>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {selected.sku}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Quitar ítem"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Cambiar ítem"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={cn(baseCls, "border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent")}>
        <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          disabled={disabled}
          autoFocus={open}
          className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50"
          placeholder="Buscar ítem por nombre o SKU..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="shrink-0 text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
            onClick={() => { onChange(undefined); setOpen(false) }}
          >
            Sin ítem específico
          </button>
          {filtered.map((item) => (
            <button
              key={item.id_item}
              type="button"
              className="flex w-full items-center gap-2.5 border-b border-gray-50 px-3 py-2 text-left last:border-none hover:bg-gray-50"
              onClick={() => handleSelect(item)}
            >
              {item.imagen_url ? (
                <img src={item.imagen_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm">
                  📦
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">{item.nombre}</div>
                <div className="text-xs text-gray-500">{item.sku}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-gray-400">Sin resultados</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CategoriaPickerCombobox ─────────────────────────────────────────────────

interface CategoriaPickerProps {
  categorias: Categoria[]
  selectedId: number | undefined
  onChange: (id: number | undefined) => void
  disabled?: boolean
}

function CategoriaPickerCombobox({ categorias, selectedId, onChange, disabled }: CategoriaPickerProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = categorias.find((c) => c.id_categoria === selectedId) ?? null

  const filtered = query.length >= 1
    ? categorias.filter((c) => c.nombre_categoria.toLowerCase().includes(query.toLowerCase()))
    : categorias

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleClear() {
    onChange(undefined)
    setQuery("")
  }

  const baseCls =
    "flex items-center gap-2 w-full rounded-xl border bg-white px-3 py-2 text-sm transition-colors"

  if (selected && !open) {
    return (
      <div className={cn(baseCls, "border-blue-400")}>
        <span className="text-base leading-none">🏷️</span>
        <span className="min-w-0 flex-1 truncate font-medium text-gray-900">{selected.nombre_categoria}</span>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Quitar categoría"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Cambiar categoría"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={cn(baseCls, "border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent")}>
        <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          disabled={disabled}
          autoFocus={open}
          className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50"
          placeholder="Buscar categoría..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="shrink-0 text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
            onClick={() => { onChange(undefined); setOpen(false) }}
          >
            Sin categoría específica
          </button>
          {filtered.map((cat) => (
            <button
              key={cat.id_categoria}
              type="button"
              className="flex w-full items-center gap-2.5 border-b border-gray-50 px-3 py-2.5 text-left last:border-none hover:bg-gray-50"
              onClick={() => { onChange(cat.id_categoria); setQuery(""); setOpen(false) }}
            >
              <span className="text-base leading-none">🏷️</span>
              <span className="truncate text-sm font-medium text-gray-900">{cat.nombre_categoria}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-gray-400">Sin resultados</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Form ───────────────────────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
const labelCls = "block text-xs font-medium text-gray-600 mb-1.5"

const EMPTY_FORM: CreatePromocionInput = {
  nombre: "",
  id_sede: null,
  id_item_afectado: undefined,
  id_categoria_afectada: undefined,
  valor_descuento: 0,
  tipo_descuento: "porcentaje",
  fecha_inicio: "",
  fecha_fin: "",
  dia_semana: undefined,
}

interface CreateFormProps {
  sedeId: number
  isPropietario: boolean
  onCancel: () => void
  onSaved: () => void
  bare?: boolean
}

function CreateForm({ sedeId, isPropietario, onCancel, onSaved, bare }: CreateFormProps) {
  const [form, setForm] = useState<CreatePromocionInput>({ ...EMPTY_FORM, id_sede: sedeId })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])

  useEffect(() => {
    getItems({ limit: 200 }).then((r) => setItems(r.items)).catch(() => {})
    getCategorias().then(setCategorias).catch(() => {})
    if (isPropietario) getSedes().then(setSedes).catch(() => {})
  }, [isPropietario])

  function set<K extends keyof CreatePromocionInput>(key: K, value: CreatePromocionInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!form.nombre.trim()) {
      setError("El nombre de la promocion es requerido.")
      return
    }
    if (!form.valor_descuento || Number(form.valor_descuento) <= 0) {
      setError("El valor de descuento debe ser mayor a 0.")
      return
    }
    if (form.tipo_descuento === "porcentaje" && Number(form.valor_descuento) > 100) {
      setError("El porcentaje de descuento no puede superar 100.")
      return
    }
    if (form.id_item_afectado && form.id_categoria_afectada) {
      setError("Selecciona solo un ítem o solo una categoría, no ambos.")
      return
    }

    const payload: CreatePromocionInput = {
      nombre: form.nombre.trim(),
      tipo_descuento: form.tipo_descuento,
      valor_descuento: Number(form.valor_descuento),
    }

    if (isPropietario && form.id_sede) payload.id_sede = form.id_sede
    else if (!isPropietario) payload.id_sede = sedeId

    if (form.id_item_afectado) payload.id_item_afectado = Number(form.id_item_afectado)
    if (form.id_categoria_afectada) payload.id_categoria_afectada = Number(form.id_categoria_afectada)
    if (form.fecha_inicio) payload.fecha_inicio = form.fecha_inicio
    if (form.fecha_fin) payload.fecha_fin = form.fecha_fin
    if (form.dia_semana !== undefined && form.dia_semana !== null) payload.dia_semana = form.dia_semana

    setSubmitting(true)
    try {
      await createPromocion(payload)
      toast.success("Promocion creada")
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la promocion.")
    } finally {
      setSubmitting(false)
    }
  }

  const inner = (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gray-100">
            <Tag className="h-4 w-4 text-gray-900" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Nueva promocion</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
          aria-label="Cerrar formulario"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Nombre */}
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              disabled={submitting}
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej: Descuento de verano"
              className={inputCls}
            />
          </div>

          {/* Tipo descuento */}
          <div>
            <label className={labelCls}>
              Tipo de descuento <span className="text-red-500">*</span>
            </label>
            <select
              disabled={submitting}
              value={form.tipo_descuento}
              onChange={(e) => set("tipo_descuento", e.target.value as "porcentaje" | "monto_fijo")}
              className={cn(inputCls, "cursor-pointer appearance-none")}
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto_fijo">Monto fijo (S/)</option>
            </select>
          </div>

          {/* Valor descuento */}
          <div>
            <label className={labelCls}>
              Valor de descuento <span className="text-red-500">*</span>
            </label>
            <input
              disabled={submitting}
              type="number"
              min="0"
              step="0.01"
              value={form.valor_descuento || ""}
              onChange={(e) => set("valor_descuento", Number(e.target.value))}
              placeholder={form.tipo_descuento === "porcentaje" ? "10" : "20.00"}
              className={inputCls}
            />
          </div>

          {/* Item afectado */}
          <div>
            <label className={labelCls}>Ítem afectado</label>
            <ItemPickerCombobox
              items={items}
              selectedId={form.id_item_afectado}
              disabled={submitting}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, id_item_afectado: v, id_categoria_afectada: v ? undefined : prev.id_categoria_afectada }))
              }
            />
          </div>

          {/* Categoría afectada */}
          <div>
            <label className={labelCls}>Categoría afectada</label>
            <CategoriaPickerCombobox
              categorias={categorias}
              selectedId={form.id_categoria_afectada}
              disabled={submitting}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, id_categoria_afectada: v, id_item_afectado: v ? undefined : prev.id_item_afectado }))
              }
            />
          </div>

          {/* Sede (propietario only) */}
          {isPropietario && (
            <div>
              <label className={labelCls}>Sede (opcional)</label>
              <select
                disabled={submitting}
                value={form.id_sede ?? ""}
                onChange={(e) =>
                  set("id_sede", e.target.value ? Number(e.target.value) : null)
                }
                className={cn(inputCls, "cursor-pointer appearance-none")}
              >
                <option value="">Todas las sedes</option>
                {sedes.map((s) => (
                  <option key={s.id_sede} value={s.id_sede}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dia de la semana */}
          <div>
            <label className={labelCls}>Dia de la semana (opcional)</label>
            <select
              disabled={submitting}
              value={form.dia_semana ?? ""}
              onChange={(e) =>
                set("dia_semana", e.target.value !== "" ? Number(e.target.value) : undefined)
              }
              className={cn(inputCls, "cursor-pointer appearance-none")}
            >
              <option value="">Todos los dias</option>
              {DIAS_SEMANA.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha inicio */}
          <div>
            <label className={labelCls}>Fecha inicio (opcional)</label>
            <DatePicker
              value={form.fecha_inicio || undefined}
              onChange={(v) => set("fecha_inicio", v ?? "")}
              placeholder="Sin fecha inicio"
              className="w-full"
            />
          </div>

          {/* Fecha fin */}
          <div>
            <label className={labelCls}>Fecha fin (opcional)</label>
            <DatePicker
              value={form.fecha_fin || undefined}
              onChange={(v) => set("fecha_fin", v ?? "")}
              placeholder="Sin fecha fin"
              className="w-full"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#020617] hover:bg-[#0f172a] text-white gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear promocion
          </Button>
        </div>
      </form>
    </>
  )

  if (bare) return inner

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50">
      <div className="p-6">{inner}</div>
    </div>
  )
}

// ─── Confirm delete dialog ───────────────────────────────────────────────────

interface ConfirmDeleteProps {
  promo: Promocion | null
  onCancel: () => void
  onConfirm: () => void
  busy: boolean
}

function ConfirmDeleteDialog({ promo, onCancel, onConfirm, busy }: ConfirmDeleteProps) {
  return (
    <Dialog open={promo !== null} onClose={onCancel}>
      <div className="relative flex w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="px-6 py-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Cancelar promocion</h2>
              <p className="mt-1 text-sm text-gray-500">
                Se cancelara permanentemente la promocion{" "}
                <span className="font-medium text-gray-900">{promo?.nombre}</span>.
                Esta accion no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              Volver
            </Button>
            <Button
              onClick={onConfirm}
              disabled={busy}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancelar promocion
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PromocionesPage() {
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Promocion | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)
  const [estadoFilter, setEstadoFilter] = useState<"todos" | Promocion["estado"]>("todos")

  const session = useSyncExternalStore(noopSubscribe, getSession, () => null)
  const isPropietario = session?.rol === "propietario"

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await getPromociones()
        if (!cancelled) setPromociones(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar las promociones.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [refetchKey])

  const filtered = useMemo(() => {
    if (estadoFilter === "todos") return promociones
    return promociones.filter((p) => p.estado === estadoFilter)
  }, [promociones, estadoFilter])

  function reload() {
    setFormOpen(false)
    setDeleteTarget(null)
    setRefetchKey((k) => k + 1)
  }

  async function toggleActiva(promo: Promocion) {
    if (promo.estado === "vencida" || promo.estado === "cancelada") return
    const nextEstado = promo.estado === "activa" ? "pausada" : "activa"
    setBusyId(promo.id_promocion)
    try {
      await updatePromocion(promo.id_promocion, { estado: nextEstado })
      toast.success(nextEstado === "activa" ? "Promocion activada" : "Promocion pausada")
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la promocion")
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id_promocion)
    try {
      await deletePromocion(deleteTarget.id_promocion)
      toast.success("Promocion cancelada")
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar la promocion")
    } finally {
      setBusyId(null)
    }
  }

  const canToggle = (p: Promocion) => p.estado === "activa" || p.estado === "pausada"

  return (
    <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.45}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <Tag className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Promociones</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              Gestiona descuentos y promociones de{" "}
              {isPropietario ? "todas las sedes" : session?.sede ?? "tu sede"}
            </p>
          </div>
          <Button
            onClick={() => setFormOpen((v) => !v)}
            aria-expanded={formOpen}
            className={cn(
              "shrink-0 gap-2",
              formOpen
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-[#020617] hover:bg-[#0f172a] text-white",
            )}
            variant={formOpen ? "ghost" : "default"}
          >
            <Plus className="h-4 w-4" />
            Nueva promocion
            {formOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </BlurFade>

      {/* Create form */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <CreateForm
              sedeId={session?.id_sede ?? 1}
              isPropietario={isPropietario}
              onCancel={() => setFormOpen(false)}
              onSaved={reload}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <ConfirmDeleteDialog
        promo={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={busyId === deleteTarget?.id_promocion}
      />

      {/* Filters */}
      <BlurFade delay={0.08} duration={0.45}>
        <div className="mb-6 flex flex-wrap gap-2">
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as typeof estadoFilter)}
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="activa">Activas</option>
            <option value="pausada">Pausadas</option>
            <option value="vencida">Vencidas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </div>
      </BlurFade>

      {/* Error state */}
      {!loading && error && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
            <p className="mb-1 text-sm font-medium text-gray-900">Error al cargar</p>
            <p className="mb-5 max-w-xs text-xs text-gray-500">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setRefetchKey((k) => k + 1)}>
              Reintentar
            </Button>
          </div>
        </BlurFade>
      )}

      {/* Results count */}
      {!loading && !error && (
        <BlurFade delay={0.12} duration={0.35}>
          <p className="mb-4 text-xs text-gray-500">
            {filtered.length === 0
              ? "Sin resultados"
              : `${filtered.length} promocion${filtered.length !== 1 ? "es" : ""}`}
          </p>
        </BlurFade>
      )}

      {/* Loading */}
      {loading && <SkeletonRows />}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Tag className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Sin promociones para mostrar</p>
            <p className="text-xs text-gray-400">Cambia los filtros o crea una nueva promocion.</p>
            {!formOpen && (
              <Button
                size="sm"
                onClick={() => setFormOpen(true)}
                className="mt-1 gap-2 bg-[#020617] text-white hover:bg-[#0f172a]"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear primera promocion
              </Button>
            )}
          </div>
        </BlurFade>
      )}

      {/* Promociones list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2" role="table" aria-label="Lista de promociones">
          <AnimatePresence initial={false}>
            {filtered.map((promo, index) => (
              <BlurFade key={promo.id_promocion} delay={Math.min(index * 0.04, 0.3)} duration={0.35}>
                <div
                  className={cn(
                    "flex cursor-default flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm",
                    (promo.estado === "vencida" || promo.estado === "cancelada") && "opacity-60",
                  )}
                  role="row"
                  aria-label={`Promocion: ${promo.nombre}`}
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Tag className="h-4 w-4" />
                  </div>

                  {/* Name + scope */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{promo.nombre}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-500">{scopeLabel(promo)}</span>
                      {promo.sede_nombre && (
                        <span className="text-xs text-gray-400">· {promo.sede_nombre}</span>
                      )}
                      {promo.dia_semana !== null && (
                        <span className="text-xs text-gray-400">
                          · Solo {diaSemanaLabel(promo.dia_semana)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="hidden min-w-[100px] flex-col gap-0.5 sm:flex">
                    <span className="tabular-nums text-sm font-semibold text-gray-800">
                      {formatDiscount(promo.tipo_descuento, promo.valor_descuento)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {promo.tipo_descuento === "porcentaje" ? "Porcentaje" : "Monto fijo"}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="hidden min-w-[140px] flex-col gap-0.5 md:flex">
                    <span className="text-xs text-gray-500">
                      {formatDate(promo.fecha_inicio)} – {formatDate(promo.fecha_fin)}
                    </span>
                    <EstadoBadge estado={promo.estado} />
                  </div>

                  {/* Actions */}
                  <TooltipProvider>
                    <div className="flex shrink-0 gap-1">
                      {canToggle(promo) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                                promo.estado === "activa"
                                  ? "text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600"
                                  : "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600",
                                busyId === promo.id_promocion && "cursor-not-allowed opacity-30",
                              )}
                              aria-label={promo.estado === "activa" ? "Pausar" : "Activar"}
                              disabled={busyId === promo.id_promocion}
                              onClick={() => toggleActiva(promo)}
                            >
                              {busyId === promo.id_promocion ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : promo.estado === "activa" ? (
                                <Pause className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {promo.estado === "activa" ? "Pausar promocion" : "Activar promocion"}
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {promo.estado !== "cancelada" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-all hover:bg-red-50 hover:text-red-600",
                                busyId === promo.id_promocion && "cursor-not-allowed opacity-30",
                              )}
                              aria-label="Cancelar promocion"
                              disabled={busyId === promo.id_promocion}
                              onClick={() => setDeleteTarget(promo)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar promocion</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TooltipProvider>
                </div>
              </BlurFade>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
