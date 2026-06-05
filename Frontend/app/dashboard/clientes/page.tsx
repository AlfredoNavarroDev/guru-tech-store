"use client"

import { useEffect, useRef, useState, startTransition } from "react"
import {
  Users,
  Search,
  UserPlus,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Phone,
  MapPin,
  Globe,
  X,
  Loader2,
  ShoppingBag,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getClientes,
  createCliente,
  type ClienteVista,
  type CreateClienteInput,
  type QueryClientes,
} from "@/lib/api/clientes"

// ─── helpers ─────────────────────────────────────────────────────────────────


function docBadge(tipo: string) {
  const map: Record<string, string> = {
    DNI:       "bg-blue-100 text-blue-700",
    CE:        "bg-amber-100 text-amber-700",
    pasaporte: "bg-violet-100 text-violet-700",
  }
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map[tipo] ?? "bg-gray-100 text-gray-600")}>
      {tipo}
    </span>
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

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

// ─── skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-1/3" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-10 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col gap-1.5 min-w-[140px]">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-gray-50 px-3 py-2 min-w-[72px] gap-1">
            <Skeleton className="h-3.5 w-5 rounded" />
            <Skeleton className="h-5 w-6 rounded" />
            <Skeleton className="h-2.5 w-10 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── create form ──────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateClienteInput = {
  tipo_documento: "DNI",
  nro_documento: "",
  nombre_completo: "",
  telefono: "",
  direccion_completa: "",
}

interface CreateFormProps {
  onSuccess: (cliente: ClienteVista) => void
  onCancel: () => void
}

function CreateForm({ onSuccess, onCancel }: CreateFormProps) {
  const [form, setForm] = useState<CreateClienteInput>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function set<K extends keyof CreateClienteInput>(key: K, value: CreateClienteInput[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "tipo_documento") {
        next.nro_documento = ""
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.nro_documento.trim()) {
      setFormError("El número de documento es requerido.")
      return
    }
    const docLengths: Record<string, number> = { DNI: 8, CE: 12, pasaporte: 9 }
    const expectedLen = docLengths[form.tipo_documento]
    if (expectedLen && form.nro_documento.trim().length !== expectedLen) {
      setFormError(`El ${form.tipo_documento} debe tener exactamente ${expectedLen} caracteres.`)
      return
    }
    if (!form.nombre_completo.trim()) {
      setFormError("El nombre completo es requerido.")
      return
    }
    const dto: CreateClienteInput = {
      tipo_documento: form.tipo_documento,
      nro_documento: form.nro_documento.trim(),
      nombre_completo: form.nombre_completo.trim(),
      ...(form.telefono?.trim() ? { telefono: form.telefono.trim() } : {}),
      ...(form.direccion_completa?.trim() ? { direccion_completa: form.direccion_completa.trim() } : {}),
    }

    setSubmitting(true)
    try {
      const created = await createCliente(dto)
      onSuccess(created)
    } catch {
      setFormError("No se pudo registrar el cliente. Verifica los datos e intenta nuevamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    "h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"

  const labelCls = "block text-xs font-medium text-gray-600 mb-1.5"

  return (
    <div className="mb-6 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
      <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gray-100">
                <UserPlus className="h-4 w-4 text-gray-900" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Nuevo cliente</h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancelar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* tipo_documento */}
              <div>
                <label className={labelCls} htmlFor="tipo_documento">
                  Tipo de documento <span className="text-red-500">*</span>
                </label>
                <select
                  id="tipo_documento"
                  value={form.tipo_documento}
                  onChange={(e) =>
                    set("tipo_documento", e.target.value as CreateClienteInput["tipo_documento"])
                  }
                  disabled={submitting}
                  className={cn(inputCls, "cursor-pointer appearance-none")}
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>

              {/* nro_documento */}
              <div>
                <label className={labelCls} htmlFor="nro_documento">
                  Número de documento <span className="text-red-500">*</span>
                  {form.tipo_documento && (
                    <span className="ml-1 font-normal text-gray-400">
                      ({({ DNI: 8, CE: 12, pasaporte: 9 } as Record<string, number>)[form.tipo_documento]} dígitos)
                    </span>
                  )}
                </label>
                <input
                  id="nro_documento"
                  type="text"
                  inputMode={form.tipo_documento === "pasaporte" ? "text" : "numeric"}
                  value={form.nro_documento}
                  onChange={(e) => set("nro_documento", e.target.value)}
                  placeholder={{ DNI: "12345678", CE: "123456789012", pasaporte: "AB1234567" }[form.tipo_documento] ?? ""}
                  maxLength={({ DNI: 8, CE: 12, pasaporte: 9 } as Record<string, number>)[form.tipo_documento]}
                  disabled={submitting}
                  className={inputCls}
                />
              </div>

              {/* nombre_completo */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className={labelCls} htmlFor="nombre_completo">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="nombre_completo"
                  type="text"
                  value={form.nombre_completo}
                  onChange={(e) => set("nombre_completo", e.target.value)}
                  placeholder="Juan Pérez García"
                  disabled={submitting}
                  className={inputCls}
                />
              </div>

              {/* telefono */}
              <div>
                <label className={labelCls} htmlFor="telefono">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  type="tel"
                  value={form.telefono ?? ""}
                  onChange={(e) => set("telefono", e.target.value)}
                  placeholder="999 999 999"
                  disabled={submitting}
                  className={inputCls}
                />
              </div>

              {/* direccion_completa */}
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="direccion_completa">
                  Dirección
                </label>
                <input
                  id="direccion_completa"
                  type="text"
                  value={form.direccion_completa ?? ""}
                  onChange={(e) => set("direccion_completa", e.target.value)}
                  placeholder="Av. Ejemplo 123, Lima"
                  disabled={submitting}
                  className={inputCls}
                />
              </div>
            </div>

            {/* error */}
            {formError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* actions */}
            <div className="mt-5 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#020617] hover:bg-[#0f172a] text-white gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registrando…
                  </>
                ) : (
                  "Registrar cliente"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
  )
}

// ─── client row ───────────────────────────────────────────────────────────────

function ClientRow({ cliente, delay }: { cliente: ClienteVista; delay: number }) {
  return (
    <BlurFade delay={delay} duration={0.35}>
      <div
        className="flex cursor-default items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:shadow-md hover:border-blue-200 hover:bg-blue-50"
        role="row"
        aria-label={`Cliente: ${cliente.nombre_completo}`}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            avatarColor(cliente.id_cliente),
          )}
        >
          {initials(cliente.nombre_completo)}
        </div>

        {/* Name + doc */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{cliente.nombre_completo}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {docBadge(cliente.tipo_documento)}
            <span className="font-mono text-xs text-gray-500">{cliente.nro_documento}</span>
            {cliente.es_extranjero && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <Globe className="h-3 w-3" />
                Extranjero
              </span>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="hidden min-w-[140px] flex-col gap-0.5 sm:flex">
          {cliente.telefono ? (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <Phone className="h-3 w-3 shrink-0" />
              {cliente.telefono}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Sin teléfono</span>
          )}
          {cliente.direccion_completa && (
            <span className="flex items-center gap-1.5 truncate text-xs text-gray-500">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{cliente.direccion_completa}</span>
            </span>
          )}
        </div>

        {/* Compras realizadas */}
        <div
          className={cn(
            "shrink-0 flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[72px]",
            cliente.total_compras > 0
              ? "bg-emerald-50 ring-1 ring-emerald-200"
              : "bg-gray-50 ring-1 ring-gray-200",
          )}
        >
          <ShoppingBag
            className={cn(
              "h-3.5 w-3.5 mb-0.5",
              cliente.total_compras > 0 ? "text-emerald-500" : "text-gray-300",
            )}
          />
          <NumberTicker
            value={cliente.total_compras}
            delay={delay}
            className={cn(
              "text-xl font-bold tabular-nums leading-none",
              cliente.total_compras > 0 ? "text-emerald-700" : "text-gray-400",
            )}
          />
          <p className={cn(
            "mt-0.5 text-[10px] font-medium",
            cliente.total_compras > 0 ? "text-emerald-600" : "text-gray-400",
          )}>
            {cliente.total_compras === 1 ? "compra" : "compras"}
          </p>
        </div>
      </div>
    </BlurFade>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteVista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [clientesPage, setClientesPage] = useState(1)
  const CLIENTES_LIMIT = 12

  const initialLoad = useRef(true)

  // ─── initial load ──────────────────────────────────────────────────────────

  async function fetchClientes(filters?: QueryClientes) {
    if (initialLoad.current) {
      setLoading(true)
    } else {
      setSearching(true)
    }
    setError(null)
    try {
      const data = await getClientes(filters)
      setClientes(data)
      setClientesPage(1)
    } catch {
      setError("No se pudo cargar la lista de clientes.")
    } finally {
      setLoading(false)
      setSearching(false)
      initialLoad.current = false
    }
  }

  useEffect(() => {
    startTransition(() => {
      fetchClientes()
    })
  }, [])

  // ─── search ────────────────────────────────────────────────────────────────

  function buildFilters(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return undefined
    return { search: trimmed }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchClientes(buildFilters(query))
  }

  function handleClearSearch() {
    setQuery("")
    fetchClientes()
  }

  const hasFilters = query.trim() !== ""

  const clientesTotalPages = Math.ceil(clientes.length / CLIENTES_LIMIT)
  const paginatedClientes = clientes.slice(
    (clientesPage - 1) * CLIENTES_LIMIT,
    clientesPage * CLIENTES_LIMIT,
  )

  // ─── create success ────────────────────────────────────────────────────────

  function handleCreated(cliente: ClienteVista) {
    setShowForm(false)
    // Prepend new client and re-fetch in background for accurate total_compras
    setClientes((prev) => [cliente, ...prev])
    fetchClientes(buildFilters(query))
  }

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
      {/* Page header */}
      <BlurFade delay={0} duration={0.45}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <Users className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Clientes</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              Gestiona y consulta el registro de clientes
            </p>
          </div>

          <Button
            onClick={() => setShowForm((v) => !v)}
            aria-expanded={showForm}
            className={cn(
              "shrink-0 gap-2",
              showForm
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-[#020617] hover:bg-[#0f172a] text-white",
            )}
            variant={showForm ? "ghost" : "default"}
          >
            <UserPlus className="h-4 w-4" />
            Nuevo cliente
            {showForm ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </BlurFade>

      {/* Create form (togglable) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <CreateForm
              onSuccess={handleCreated}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <BlurFade delay={0.08} duration={0.45}>
        <form
          onSubmit={handleSearch}
          className="mb-6 flex gap-2"
          role="search"
          aria-label="Buscar clientes"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="search-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o DNI…"
              className="pl-9"
            />
          </div>

          <Button
            type="submit"
            disabled={searching}
            className="bg-[#020617] hover:bg-[#0f172a] text-white gap-2 shrink-0"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleClearSearch}
            disabled={searching || !hasFilters}
            className="gap-2 shrink-0"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        </form>
      </BlurFade>

      {/* Results count */}
      {!loading && !error && (
        <BlurFade delay={0.12} duration={0.35}>
          <p className="mb-4 text-xs text-gray-500">
            {clientes.length === 0
              ? "Sin resultados"
              : `${clientes.length} cliente${clientes.length !== 1 ? "s" : ""}${hasFilters ? " encontrados" : ""}`}
          </p>
        </BlurFade>
      )}

      {/* Loading state */}
      {loading && <SkeletonRows />}

      {/* Error state */}
      {!loading && error && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
            <p className="mb-1 text-sm font-medium text-gray-900">Error al cargar</p>
            <p className="mb-5 max-w-xs text-xs text-gray-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchClientes(buildFilters(query))}
            >
              Reintentar
            </Button>
          </div>
        </BlurFade>
      )}

      {/* Empty state */}
      {!loading && !error && clientes.length === 0 && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Sin resultados</p>
            <p className="text-xs text-gray-400">
              {hasFilters
                ? "No hay clientes que coincidan con la búsqueda"
                : "Prueba con otro término de búsqueda"}
            </p>
            {!showForm && !hasFilters && (
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="bg-[#020617] hover:bg-[#0f172a] text-white gap-2 mt-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Registrar primer cliente
              </Button>
            )}
          </div>
        </BlurFade>
      )}

      {/* Client list */}
      {!loading && !error && clientes.length > 0 && (
        <div
          className="space-y-2"
          role="table"
          aria-label="Lista de clientes"
        >
          {paginatedClientes.map((cliente, i) => (
            <ClientRow key={cliente.id_cliente} cliente={cliente} delay={Math.min(i * 0.04, 0.3)} />
          ))}
        </div>
      )}

      {!loading && !error && clientesTotalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={clientesPage <= 1}
            onClick={() => setClientesPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <span className="text-xs text-gray-500">
            Página{" "}
            <span className="font-semibold text-gray-900">{clientesPage}</span> de{" "}
            <span className="font-semibold text-gray-900">{clientesTotalPages}</span>
          </span>
          <button
            disabled={clientesPage >= clientesTotalPages}
            onClick={() => setClientesPage((p) => Math.min(clientesTotalPages, p + 1))}
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
