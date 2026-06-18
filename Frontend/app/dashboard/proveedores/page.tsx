"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Truck,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Phone,
  X,
  Loader2,
  FileX,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  type Proveedor,
  type CreateProveedorPayload,
} from "@/lib/api/proveedores"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

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

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <div className="hidden sm:flex flex-col gap-1 min-w-[140px]">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

const EMPTY_FORM: CreateProveedorPayload = {
  ruc: "",
  razon_social: "",
  contacto_nombre: "",
  telefono: "",
}

interface ProveedorFormProps {
  editTarget: Proveedor | null
  onSuccess: () => void
  onCancel: () => void
}

function ProveedorForm({ editTarget, onSuccess, onCancel }: ProveedorFormProps) {
  const [form, setForm] = useState<CreateProveedorPayload>(
    editTarget
      ? {
          ruc: editTarget.ruc,
          razon_social: editTarget.razon_social,
          contacto_nombre: editTarget.contacto_nombre ?? "",
          telefono: editTarget.telefono ?? "",
        }
      : EMPTY_FORM,
  )
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.ruc.trim()) {
      setFormError("El RUC es requerido.")
      return
    }
    if (!form.razon_social.trim()) {
      setFormError("La razon social es requerida.")
      return
    }
    setSaving(true)
    try {
      const payload = {
        ruc: form.ruc.trim(),
        razon_social: form.razon_social.trim(),
        ...(form.contacto_nombre?.trim() ? { contacto_nombre: form.contacto_nombre.trim() } : {}),
        ...(form.telefono?.trim() ? { telefono: form.telefono.trim() } : {}),
      }
      if (editTarget) {
        await updateProveedor(editTarget.id_proveedor, payload)
        toast.success("Proveedor actualizado")
      } else {
        await createProveedor(payload)
        toast.success("Proveedor creado")
      }
      onSuccess()
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Error al guardar. Verifica los datos.")
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    "h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
  const labelCls = "block text-xs font-medium text-gray-600 mb-1.5"

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gray-100">
              <Truck className="h-4 w-4 text-gray-900" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">
              {editTarget ? "Editar proveedor" : "Nuevo proveedor"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                RUC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.ruc}
                onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
                placeholder="20100070970"
                disabled={saving}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Razon social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.razon_social}
                onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
                placeholder="Distribuidora Tech SAC"
                disabled={saving}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Contacto</label>
              <input
                type="text"
                value={form.contacto_nombre ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, contacto_nombre: e.target.value }))}
                placeholder="Juan Lopez"
                disabled={saving}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefono</label>
              <input
                type="tel"
                value={form.telefono ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="999 888 777"
                disabled={saving}
                className={inputCls}
              />
            </div>
          </div>

          {formError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#020617] hover:bg-[#0f172a] text-white gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : editTarget ? (
                "Guardar cambios"
              ) : (
                "Registrar proveedor"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ProveedorRowProps {
  proveedor: Proveedor
  delay: number
  onEdit: () => void
}

function ProveedorRow({ proveedor: p, delay, onEdit }: ProveedorRowProps) {
  return (
    <BlurFade delay={delay} duration={0.35}>
      <div
        className="group flex cursor-default items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm"
        role="row"
        aria-label={`Proveedor: ${p.razon_social}`}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            avatarColor(p.id_proveedor),
          )}
        >
          {initials(p.razon_social)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{p.razon_social}</p>
          <p className="mt-1 font-mono text-xs text-gray-500">{p.ruc}</p>
        </div>

        <div className="hidden min-w-[160px] flex-col gap-0.5 sm:flex">
          {p.contacto_nombre ? (
            <span className="text-xs text-gray-600">{p.contacto_nombre}</span>
          ) : (
            <span className="text-xs text-gray-400">Sin contacto</span>
          )}
          {p.telefono && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Phone className="h-3 w-3 shrink-0" />
              {p.telefono}
            </span>
          )}
        </div>

        <button
          onClick={onEdit}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100"
          aria-label="Editar proveedor"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </BlurFade>
  )
}

const ITEMS_PER_PAGE = 12

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [appliedQuery, setAppliedQuery] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Proveedor | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProveedores()
      setProveedores(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando proveedores")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false

    void getProveedores()
      .then((data) => {
        if (ignore) return
        setProveedores(data)
        setError(null)
      })
      .catch((e: unknown) => {
        if (ignore) return
        setError(e instanceof ApiError ? e.message : "Error cargando proveedores")
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setAppliedQuery(query)
    setCurrentPage(1)
  }

  function handleClearSearch() {
    setQuery("")
    setAppliedQuery("")
    setCurrentPage(1)
  }

  function handleNewProveedor() {
    if (showForm && !editTarget) {
      setShowForm(false)
      return
    }
    setEditTarget(null)
    setShowForm(true)
  }

  function handleEdit(p: Proveedor) {
    setEditTarget(p)
    setShowForm(true)
  }

  function handleFormSuccess() {
    setShowForm(false)
    setEditTarget(null)
    load()
  }

  function handleFormCancel() {
    setShowForm(false)
    setEditTarget(null)
  }

  const filtered = proveedores.filter((p) => {
    if (!appliedQuery) return true
    const q = appliedQuery.toLowerCase()
    return p.razon_social.toLowerCase().includes(q) || p.ruc.includes(q)
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )
  const hasFilters = !!appliedQuery
  const isNewForm = showForm && !editTarget

  return (
    <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
      <BlurFade delay={0} duration={0.45}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <Truck className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Proveedores</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              Gestiona y consulta el registro de proveedores
            </p>
          </div>
          <Button
            onClick={handleNewProveedor}
            aria-expanded={isNewForm}
            className={cn(
              "shrink-0 gap-2",
              isNewForm
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-[#020617] hover:bg-[#0f172a] text-white",
            )}
            variant={isNewForm ? "ghost" : "default"}
          >
            <Truck className="h-4 w-4" />
            Nuevo proveedor
            {isNewForm ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </BlurFade>

      <AnimatePresence>
        {showForm && (
          <motion.div
            key={`proveedor-form-${editTarget?.id_proveedor ?? "new"}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <ProveedorForm
              editTarget={editTarget}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <BlurFade delay={0.08} duration={0.45}>
        <form
          onSubmit={handleSearch}
          className="mb-6 flex gap-2"
          role="search"
          aria-label="Buscar proveedores"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o RUC..."
              className="pl-9 bg-white"
            />
          </div>
          <Button
            type="submit"
            className="bg-[#020617] hover:bg-[#0f172a] text-white gap-2 shrink-0"
          >
            <Search className="h-4 w-4" />
            Buscar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearSearch}
            disabled={!hasFilters}
            className="gap-2 shrink-0"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        </form>
      </BlurFade>

      {!loading && !error && (
        <BlurFade delay={0.12} duration={0.35}>
          <p className="mb-4 text-xs text-gray-500">
            {filtered.length === 0
              ? "Sin resultados"
              : `${filtered.length} proveedor${filtered.length !== 1 ? "es" : ""}${hasFilters ? " encontrados" : ""}`}
          </p>
        </BlurFade>
      )}

      {loading && <SkeletonRows />}

      {!loading && error && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
            <p className="mb-1 text-sm font-medium text-gray-900">Error al cargar</p>
            <p className="mb-5 max-w-xs text-xs text-gray-500">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Reintentar
            </Button>
          </div>
        </BlurFade>
      )}

      {!loading && !error && filtered.length === 0 && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileX className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Sin resultados</p>
            <p className="text-xs text-gray-400">
              {hasFilters
                ? "No hay proveedores que coincidan con la busqueda"
                : "No hay proveedores registrados aun"}
            </p>
            {!showForm && !hasFilters && (
              <Button
                size="sm"
                onClick={handleNewProveedor}
                className="bg-[#020617] hover:bg-[#0f172a] text-white gap-2 mt-1"
              >
                <Truck className="h-3.5 w-3.5" />
                Registrar primer proveedor
              </Button>
            )}
          </div>
        </BlurFade>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2" role="table" aria-label="Lista de proveedores">
          {paginated.map((p, i) => (
            <ProveedorRow
              key={p.id_proveedor}
              proveedor={p}
              delay={Math.min(i * 0.04, 0.3)}
              onEdit={() => handleEdit(p)}
            />
          ))}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <span className="text-xs text-gray-500">
            Pagina <span className="font-semibold text-gray-900">{currentPage}</span> de{" "}
            <span className="font-semibold text-gray-900">{totalPages}</span>
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
