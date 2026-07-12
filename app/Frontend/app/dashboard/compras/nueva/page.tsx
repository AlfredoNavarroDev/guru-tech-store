"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2, Plus, ShoppingBag, Truck, X } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Dialog } from "@/components/ui/dialog"
import { ItemLineCard, type LineItem } from "@/components/compras/ItemLineCard"
import { ItemDrawer } from "@/components/abastecedor/ItemDrawer"
import { getProveedores, createProveedor, type Proveedor } from "@/lib/api/proveedores"
import { getItems, type Item } from "@/lib/api/items"
import { createCompra, addItemToCompra } from "@/lib/api/compras"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

function newLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    item: null,
    cantidad: 1,
    costo_unidad: 0,
    precio_venta_sugerido: 0,
  }
}

const DRAFT_KEY = "nueva_compra_draft"

function loadDraft(): { idProveedor: number | ""; lines: LineItem[] } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveDraft(idProveedor: number | "", lines: LineItem[]) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ idProveedor, lines }))
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

export default function NuevaCompraPage() {
  const router = useRouter()
  const [initialDraft] = useState(loadDraft)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [idProveedor, setIdProveedor] = useState<number | "">(
    initialDraft?.idProveedor ?? "",
  )
  const [lines, setLines] = useState<LineItem[]>(
    initialDraft?.lines.length ? initialDraft.lines : [newLine()],
  )
  const [submitting, setSubmitting] = useState(false)
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false)
  const [drawerForLineId, setDrawerForLineId] = useState<string | null>(null)
  const [drawerInitialNombre, setDrawerInitialNombre] = useState<string>("")
  const [proveedorDialogOpen, setProveedorDialogOpen] = useState(false)
  const [proveedorForm, setProveedorForm] = useState({ ruc: "", razon_social: "", contacto_nombre: "", telefono: "" })
  const [proveedorSaving, setProveedorSaving] = useState(false)
  const [proveedorError, setProveedorError] = useState<string | null>(null)

  useEffect(() => {
    saveDraft(idProveedor, lines)
  }, [idProveedor, lines])

  useEffect(() => {
    getProveedores().then(setProveedores).catch(() => {})
    getItems({ limit: 200 }).then((r) => setItems(r.items)).catch(() => {})
  }, [])

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id: string) {
    if (lines.length === 1) return
    setLines((ls) => ls.filter((l) => l.id !== id))
  }

  function handleCreateNew(lineId: string, nombre: string) {
    setDrawerForLineId(lineId)
    setDrawerInitialNombre(nombre)
    setItemDrawerOpen(true)
  }

  function handleItemPhotoUpdated(itemId: number, url: string) {
    setItems((prev) =>
      prev.map((i) => (i.id_item === itemId ? { ...i, imagen_url: url } : i)),
    )
    setLines((ls) =>
      ls.map((l) =>
        l.item?.id_item === itemId
          ? { ...l, item: { ...l.item, imagen_url: url } }
          : l,
      ),
    )
  }

  function handleItemCreated(created?: Item) {
    if (!created || !drawerForLineId) return
    setItems((prev) => [...prev, created])
    updateLine(drawerForLineId, {
      item: created,
      costo_unidad: created.precio_compra_actual,
      precio_venta_sugerido: created.precio_venta_actual,
    })
    setDrawerForLineId(null)
    setDrawerInitialNombre("")
  }

  async function handleProveedorSave() {
    setProveedorError(null)
    if (!proveedorForm.ruc.trim()) { setProveedorError("RUC es requerido"); return }
    if (!proveedorForm.razon_social.trim()) { setProveedorError("Razón social es requerida"); return }
    setProveedorSaving(true)
    try {
      const payload = {
        ruc: proveedorForm.ruc.trim(),
        razon_social: proveedorForm.razon_social.trim(),
        ...(proveedorForm.contacto_nombre.trim() ? { contacto_nombre: proveedorForm.contacto_nombre.trim() } : {}),
        ...(proveedorForm.telefono.trim() ? { telefono: proveedorForm.telefono.trim() } : {}),
      }
      const created = await createProveedor(payload)
      setProveedores((prev) => [...prev, created])
      setIdProveedor(created.id_proveedor)
      toast.success(`Proveedor "${created.razon_social}" creado`)
      setProveedorDialogOpen(false)
      setProveedorForm({ ruc: "", razon_social: "", contacto_nombre: "", telefono: "" })
    } catch (e) {
      setProveedorError(e instanceof ApiError ? e.message : "Error al crear proveedor")
    } finally {
      setProveedorSaving(false)
    }
  }

  const total = lines.reduce((acc, l) => acc + l.cantidad * l.costo_unidad, 0)
  const totalUnits = lines.reduce((acc, l) => acc + l.cantidad, 0)

  async function handleSubmit() {
    if (!idProveedor) {
      toast.error("Selecciona un proveedor")
      return
    }
    const validLines = lines.filter(
      (l) => l.item && l.cantidad > 0 && l.costo_unidad > 0,
    )
    if (validLines.length === 0) {
      toast.error("Agrega al menos un ítem con cantidad y costo válidos")
      return
    }
    setSubmitting(true)
    try {
      const compra = await createCompra(Number(idProveedor))
      const sorted = [...validLines].sort(
        (a, b) => a.item!.id_item - b.item!.id_item,
      )
      for (const line of sorted) {
        await addItemToCompra(compra.id_compra, {
          id_item: line.item!.id_item,
          cantidad_comprada: line.cantidad,
          costo_unidad: line.costo_unidad,
          precio_venta_sugerido:
            line.precio_venta_sugerido || line.item!.precio_venta_actual,
        })
      }
      clearDraft()
      toast.success("Compra registrada exitosamente")
      router.push("/dashboard/compras")
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 409) {
        if (e.errorCode === "DEADLOCK_DETECTADO") {
          toast.warning("Conflicto de concurrencia. Intente de nuevo.")
          return
        }
        toast.error(e.message ?? "Conflicto al registrar la compra")
        return
      }
      toast.error(e instanceof ApiError ? e.message : "Error al registrar la compra")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <BlurFade delay={0} duration={0.4}>
          <div className="mb-8 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                  <ShoppingBag className="h-4 w-4 text-gray-900" />
                </div>
                <h1 className="text-2xl font-bold text-text-heading">
                  Nueva compra
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Registrar orden de reposición
              </p>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.06} duration={0.4}>
          <div className="space-y-6">
            {/* Proveedor */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Proveedor <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setProveedorDialogOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium text-lime-dark hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Nuevo proveedor
                </button>
              </div>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-lime-dark focus:outline-none focus:ring-2 focus:ring-lime-dark/10"
                value={idProveedor}
                onChange={(e) =>
                  setIdProveedor(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>
                    {p.razon_social}
                  </option>
                ))}
              </select>
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Ítems de la compra
                </p>
                <span className="text-xs text-gray-400">
                  {lines.length} línea{lines.length !== 1 ? "s" : ""}
                </span>
              </div>

              {lines.map((line) => (
                <ItemLineCard
                  key={line.id}
                  line={line}
                  items={items}
                  canRemove={lines.length > 1}
                  onUpdate={(patch) => updateLine(line.id, patch)}
                  onRemove={() => removeLine(line.id)}
                  onCreateNew={(name) => handleCreateNew(line.id, name)}
                  onItemPhotoUpdated={handleItemPhotoUpdated}
                />
              ))}

              <button
                type="button"
                onClick={() => setLines((ls) => [...ls, newLine()])}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white py-3 text-sm font-medium text-gray-500 transition-colors hover:border-lime-dark hover:text-lime-dark"
              >
                <Plus className="h-4 w-4" />
                Agregar línea
              </button>
            </div>

            {/* Total */}
            <div className="rounded-2xl bg-bg-dark p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-lime/60">
                    Total estimado
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-lime">
                    S/ {total.toFixed(2)}
                  </p>
                </div>
                <p className="text-xs text-white/30">
                  {lines.filter((l) => l.item).length} ítem
                  {lines.filter((l) => l.item).length !== 1 ? "s" : ""} ·{" "}
                  {totalUnits} unidad{totalUnits !== 1 ? "es" : ""}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  clearDraft()
                  router.back()
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-[#020617] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a] disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Registrando..." : "Registrar compra"}
              </button>
            </div>
          </div>
        </BlurFade>
      </div>

      <ItemDrawer
        open={itemDrawerOpen}
        onClose={() => {
          setItemDrawerOpen(false)
          setDrawerForLineId(null)
          setDrawerInitialNombre("")
        }}
        item={null}
        onSaved={handleItemCreated}
        initialNombre={drawerInitialNombre}
      />

      <Dialog
        open={proveedorDialogOpen}
        onClose={() => { setProveedorDialogOpen(false); setProveedorError(null) }}
        size="sm"
      >
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-500" />
              <h2 className="text-base font-semibold text-text-heading">Nuevo proveedor</h2>
            </div>
            <button
              onClick={() => { setProveedorDialogOpen(false); setProveedorError(null) }}
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-gray-100 hover:text-text-heading"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "RUC *", key: "ruc", placeholder: "20100070970", type: "text" },
                { label: "Razón social *", key: "razon_social", placeholder: "Distribuidora Tech SAC", type: "text" },
                { label: "Contacto", key: "contacto_nombre", placeholder: "Juan López", type: "text" },
                { label: "Teléfono", key: "telefono", placeholder: "999 888 777", type: "tel" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs text-text-muted mb-1">{label}</label>
                  <input
                    type={type}
                    value={proveedorForm[key as keyof typeof proveedorForm]}
                    onChange={(e) => setProveedorForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    disabled={proveedorSaving}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text-heading placeholder:text-text-muted focus:border-lime-dark focus:outline-none focus:ring-2 focus:ring-lime-dark/10 disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
            {proveedorError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {proveedorError}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
            <button
              onClick={() => { setProveedorDialogOpen(false); setProveedorError(null) }}
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleProveedorSave}
              disabled={proveedorSaving}
              className="flex items-center gap-2 rounded-lg bg-[#020617] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f172a] disabled:opacity-50 transition-colors"
            >
              {proveedorSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {proveedorSaving ? "Creando..." : "Crear proveedor"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
