"use client"

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Power,
  Search,
  UsersRound,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { BlurFade } from "@/components/ui/blur-fade"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getSession } from "@/lib/api/auth"
import {
  ROLES,
  FRECUENCIAS_PAGO,
  createEmpleado,
  frecuenciaPagoLabel,
  getEmpleados,
  roleName,
  updateEmpleado,
  updateEmpleadoEstado,
  updateEmpleadoPassword,
  type CreateEmpleadoInput,
  type Empleado,
  type FrecuenciaPago,
  type PaginatedEmpleados,
  type TipoDocumento,
  type UpdateEmpleadoInput,
} from "@/lib/api/empleados"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

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

function noopSubscribe() {
  return () => undefined
}

const EMPTY_CREATE: CreateEmpleadoInput = {
  tipo_documento: "DNI",
  nro_documento: "",
  nombre_completo: "",
  id_rol: 3,
  password: "",
  telefono: "",
  sueldo_soles: undefined,
  frecuencia_pago: "semanal",
  es_extranjero: false,
  direccion_completa: "",
}

type EstadoFiltro = "todos" | "activo" | "inactivo"
type PanelMode = "create" | "edit" | "password" | null

const inputCls =
  "h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
const labelCls = "block text-xs font-medium text-gray-600 mb-1.5"

function decodeUserId(token?: string): number | null {
  if (!token) return null
  try {
    const payload = token.split(".")[1]
    const json = JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: number }
    return typeof json.sub === "number" ? json.sub : null
  } catch {
    return null
  }
}

function docMaxLength(tipo: TipoDocumento): number {
  return tipo === "DNI" ? 8 : tipo === "CE" ? 12 : 9
}

function cleanDocumentValue(tipo: TipoDocumento, value: string): string {
  const cleaned = tipo === "pasaporte" ? value.replace(/[^a-zA-Z0-9]/g, "") : value.replace(/\D/g, "")
  return cleaned.slice(0, docMaxLength(tipo))
}

function validateDocument(tipo: TipoDocumento, value: string): string | null {
  if (tipo === "DNI" && !/^\d{8}$/.test(value)) return "DNI debe tener 8 digitos numericos."
  if (tipo === "CE" && !/^\d{12}$/.test(value)) return "CE debe tener 12 digitos numericos."
  if (tipo === "pasaporte" && !/^[a-zA-Z0-9]{6,9}$/.test(value)) {
    return "Pasaporte debe tener 6 a 9 caracteres alfanumericos."
  }
  return null
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === "activo") {
    return (
      <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium leading-none text-emerald-700">
        Activo
      </span>
    )
  }
  return (
    <span className="w-fit rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium leading-none text-gray-600">
      Inactivo
    </span>
  )
}

function money(value: number | null) {
  if (value == null) return "Sin sueldo"
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value)
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
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
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <div className="hidden md:flex gap-1.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface EmployeeFormProps {
  mode: "create" | "edit"
  empleado?: Empleado
  onCancel: () => void
  onSaved: () => void
  bare?: boolean
  isSelf?: boolean
}

function EmployeeForm({ mode, empleado, onCancel, onSaved, bare, isSelf }: EmployeeFormProps) {
  const [form, setForm] = useState<CreateEmpleadoInput>(() => ({
    ...EMPTY_CREATE,
    tipo_documento: empleado?.tipo_documento ?? EMPTY_CREATE.tipo_documento,
    nro_documento: empleado?.nro_documento ?? "",
    nombre_completo: empleado?.nombre_completo ?? "",
    id_rol: empleado?.id_rol ?? 3,
    password: "",
    telefono: empleado?.telefono ?? "",
    sueldo_soles: empleado?.sueldo_soles ?? undefined,
    frecuencia_pago: empleado?.frecuencia_pago ?? "semanal",
    es_extranjero: empleado?.es_extranjero ?? false,
    direccion_completa: empleado?.direccion_completa ?? "",
  }))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof CreateEmpleadoInput>(key: K, value: CreateEmpleadoInput[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "tipo_documento") next.nro_documento = ""
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!form.nombre_completo.trim()) {
      setError("Nombre completo requerido.")
      return
    }
    if (mode === "create") {
      const documentError = validateDocument(form.tipo_documento, form.nro_documento.trim())
      if (documentError) {
        setError(documentError)
        return
      }
    }

    const optional = {
      ...(form.telefono?.trim() ? { telefono: form.telefono.trim() } : {}),
      ...(form.direccion_completa?.trim() ? { direccion_completa: form.direccion_completa.trim() } : {}),
      ...(form.sueldo_soles ? { sueldo_soles: Number(form.sueldo_soles) } : {}),
      frecuencia_pago: form.frecuencia_pago,
      es_extranjero: form.tipo_documento !== "DNI",
    }

    setSubmitting(true)
    try {
      if (mode === "create") {
        await createEmpleado({
          tipo_documento: form.tipo_documento,
          nro_documento: form.nro_documento.trim(),
          nombre_completo: form.nombre_completo.trim(),
          id_rol: Number(form.id_rol),
          password: form.nro_documento.trim(),
          ...optional,
        })
        toast.success("Empleado creado")
      } else if (empleado) {
        const dto: UpdateEmpleadoInput = {
          nombre_completo: form.nombre_completo.trim(),
          id_rol: Number(form.id_rol),
          ...optional,
        }
        await updateEmpleado(empleado.id_empleado, dto)
        toast.success("Empleado actualizado")
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el empleado.")
    } finally {
      setSubmitting(false)
    }
  }

  const inner = (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gray-100">
            <UsersRound className="h-4 w-4 text-gray-900" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">
            {mode === "create" ? "Nuevo empleado" : "Editar empleado"}
          </h2>
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
          <div>
            <label className={labelCls}>
              Tipo documento <span className="text-red-500">*</span>
            </label>
            <select
              disabled={mode === "edit" || submitting}
              value={form.tipo_documento}
              onChange={(event) => set("tipo_documento", event.target.value as TipoDocumento)}
              className={cn(inputCls, "cursor-pointer appearance-none")}
            >
              <option value="DNI">DNI</option>
              <option value="CE">CE</option>
              <option value="pasaporte">Pasaporte</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>
              Numero documento <span className="text-red-500">*</span>
            </label>
            <input
              disabled={mode === "edit" || submitting}
              value={form.nro_documento}
              maxLength={docMaxLength(form.tipo_documento)}
              inputMode={form.tipo_documento === "pasaporte" ? "text" : "numeric"}
              onChange={(event) => set("nro_documento", cleanDocumentValue(form.tipo_documento, event.target.value))}
              placeholder={form.tipo_documento === "pasaporte" ? "AB123456" : "12345678"}
              className={inputCls}
            />
          </div>

          <div>
            <label className={cn(labelCls, mode === "edit" && isSelf && "opacity-50")}>
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              disabled={submitting || (mode === "edit" && isSelf)}
              value={form.id_rol}
              onChange={(event) => set("id_rol", Number(event.target.value))}
              className={cn(inputCls, "cursor-pointer appearance-none")}
              title={mode === "edit" && isSelf ? "No puedes modificar tu propio rol" : undefined}
            >
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              disabled={submitting}
              value={form.nombre_completo}
              onChange={(event) => set("nombre_completo", event.target.value)}
              placeholder="Nombre y apellidos"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Telefono</label>
            <input
              disabled={submitting}
              type="tel"
              value={form.telefono ?? ""}
              onChange={(event) => set("telefono", event.target.value)}
              placeholder="987654321"
              className={inputCls}
            />
          </div>

          <div>
            <label className={cn(labelCls, mode === "edit" && isSelf && "opacity-50")}>Sueldo</label>
            <input
              disabled={submitting || (mode === "edit" && isSelf)}
              type="number"
              min="0"
              step="0.01"
              value={form.sueldo_soles ?? ""}
              onChange={(event) =>
                set("sueldo_soles", event.target.value ? Number(event.target.value) : undefined)
              }
              placeholder="1200"
              className={inputCls}
              title={mode === "edit" && isSelf ? "No puedes modificar tu propio sueldo" : undefined}
            />
          </div>

          <div>
            <label className={cn(labelCls, mode === "edit" && isSelf && "opacity-50")}>Frecuencia de pago</label>
            <select
              disabled={submitting || (mode === "edit" && isSelf)}
              value={form.frecuencia_pago}
              onChange={(event) => set("frecuencia_pago", event.target.value as FrecuenciaPago)}
              className={cn(inputCls, "cursor-pointer appearance-none")}
              title={mode === "edit" && isSelf ? "No puedes modificar tu propia frecuencia de pago" : undefined}
            >
              {FRECUENCIAS_PAGO.map((frecuencia) => (
                <option key={frecuencia.value} value={frecuencia.value}>{frecuencia.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Direccion</label>
            <input
              disabled={submitting}
              value={form.direccion_completa ?? ""}
              onChange={(event) => set("direccion_completa", event.target.value)}
              placeholder="Av. Lima 123"
              className={inputCls}
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
            {mode === "create" ? "Crear empleado" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </>
  )

  if (bare) return inner

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
      <div className="p-6">{inner}</div>
    </div>
  )
}

interface PasswordPanelProps {
  empleado: Empleado
  onCancel: () => void
  onSaved: () => void
}

function PasswordPanel({ empleado, onCancel, onSaved }: PasswordPanelProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Nueva contraseña debe tener mínimo 8 caracteres.")
      return
    }
    setSubmitting(true)
    try {
      await updateEmpleadoPassword(empleado.id_empleado, password)
      toast.success("Contraseña actualizada")
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gray-100">
            <KeyRound className="h-4 w-4 text-gray-900" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Cambiar contraseña</h2>
            <p className="text-xs text-gray-500">{empleado.nombre_completo}</p>
          </div>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="max-w-sm">
          <label className={labelCls}>Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo 8 caracteres"
              className={cn(inputCls, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#020617] hover:bg-[#0f172a] text-white gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </>
  )
}

export default function AdminEmpleadosPage() {
  const [data, setData] = useState<PaginatedEmpleados | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<number | "todos">("todos")
  const [estadoFilter, setEstadoFilter] = useState<EstadoFiltro>("todos")
  const [search, setSearch] = useState("")
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [selected, setSelected] = useState<Empleado | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)

  const session = useSyncExternalStore(noopSubscribe, getSession, () => null)
  const currentUserId = useMemo(() => decodeUserId(session?.access_token), [session?.access_token])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await getEmpleados({
          page,
          limit: PAGE_SIZE,
          ...(roleFilter !== "todos" ? { id_rol: roleFilter } : {}),
          ...(estadoFilter !== "todos" ? { activo: estadoFilter === "activo" } : {}),
        })
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar empleados.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [page, roleFilter, estadoFilter, refetchKey])

  const filteredItems = useMemo(() => {
    const items = data?.items ?? []
    const normalized = search.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((empleado) =>
      [
        empleado.nombre_completo,
        empleado.nro_documento,
        empleado.telefono ?? "",
        roleName(empleado.id_rol, empleado.rol_nombre),
      ].some((value) => value.toLowerCase().includes(normalized))
    )
  }, [data?.items, search])

  function closePanel() {
    setPanelMode(null)
    setSelected(null)
  }

  function toggleCreatePanel() {
    if (panelMode === "create") {
      closePanel()
      return
    }
    setPanelMode("create")
    setSelected(null)
  }

  function reload() {
    closePanel()
    setRefetchKey((k) => k + 1)
  }

  async function toggleEstado(empleado: Empleado) {
    const nextActive = empleado.estado !== "activo"
    if (empleado.id_empleado === currentUserId && !nextActive) {
      toast.error("No puedes desactivar tu propia cuenta")
      return
    }
    setBusyId(empleado.id_empleado)
    try {
      await updateEmpleadoEstado(empleado.id_empleado, nextActive)
      toast.success(nextActive ? "Empleado activado" : "Empleado desactivado")
      reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar estado")
    } finally {
      setBusyId(null)
    }
  }

  const isCreateOpen = panelMode === "create"
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.45}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <UsersRound className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Empleados</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              Gestiona altas, roles, contraseñas y estado de acceso de {session?.sede ?? "tu sede"}
            </p>
          </div>
          <Button
            onClick={toggleCreatePanel}
            aria-expanded={isCreateOpen}
            className={cn(
              "shrink-0 gap-2",
              isCreateOpen
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-[#020617] hover:bg-[#0f172a] text-white",
            )}
            variant={isCreateOpen ? "ghost" : "default"}
          >
            <Plus className="h-4 w-4" />
            Nuevo empleado
            {isCreateOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </BlurFade>

      {/* Create form */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <EmployeeForm mode="create" onCancel={closePanel} onSaved={reload} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* BottomSheet: edit */}
      <BottomSheet open={panelMode === "edit" && selected !== null} onClose={closePanel}>
        <div
          className="relative flex w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
          style={{ maxHeight: "92dvh" }}
        >
          <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-200" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {panelMode === "edit" && selected && (
              <EmployeeForm
                bare
                mode="edit"
                empleado={selected}
                onCancel={closePanel}
                onSaved={reload}
                isSelf={selected.id_empleado === currentUserId}
              />
            )}
          </div>
        </div>
      </BottomSheet>

      {/* BottomSheet: password */}
      <BottomSheet open={panelMode === "password" && selected !== null} onClose={closePanel}>
        <div
          className="relative flex w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
          style={{ maxHeight: "92dvh" }}
        >
          <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-200" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {panelMode === "password" && selected && (
              <PasswordPanel empleado={selected} onCancel={closePanel} onSaved={closePanel} />
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Filters */}
      <BlurFade delay={0.08} duration={0.45}>
        <div className="mb-6 flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 bg-white"
              placeholder="Buscar por nombre, documento o telefono..."
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => {
              setPage(1)
              setRoleFilter(event.target.value === "todos" ? "todos" : Number(event.target.value))
            }}
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los roles</option>
            {ROLES.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
          <select
            value={estadoFilter}
            onChange={(event) => {
              setPage(1)
              setEstadoFilter(event.target.value as EstadoFiltro)
            }}
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
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
            {filteredItems.length === 0
              ? "Sin resultados"
              : `${data?.total ?? 0} empleado${(data?.total ?? 0) !== 1 ? "s" : ""} en total`}
          </p>
        </BlurFade>
      )}

      {/* Loading */}
      {loading && <SkeletonRows />}

      {/* Empty state */}
      {!loading && !error && filteredItems.length === 0 && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <UsersRound className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Sin empleados para mostrar</p>
            <p className="text-xs text-gray-400">Cambia los filtros o registra un empleado nuevo.</p>
            {!isCreateOpen && (
              <Button
                size="sm"
                onClick={toggleCreatePanel}
                className="mt-1 gap-2 bg-[#020617] text-white hover:bg-[#0f172a]"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar primer empleado
              </Button>
            )}
          </div>
        </BlurFade>
      )}

      {/* Employee list */}
      {!loading && !error && filteredItems.length > 0 && (
        <>
          <div className="space-y-2" role="table" aria-label="Lista de empleados">
            <AnimatePresence initial={false}>
              {filteredItems.map((empleado, index) => {
                const isSelf = empleado.id_empleado === currentUserId
                const inactive = empleado.estado !== "activo"
                return (
                  <BlurFade key={empleado.id_empleado} delay={Math.min(index * 0.04, 0.3)} duration={0.35}>
                    <div
                      className={cn(
                        "flex cursor-default items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm",
                        inactive && "opacity-70",
                      )}
                      role="row"
                      aria-label={`Empleado: ${empleado.nombre_completo}`}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          inactive ? "bg-gray-100 text-gray-500" : avatarColor(empleado.id_empleado),
                        )}
                      >
                        {initials(empleado.nombre_completo)}
                      </div>

                      {/* Name + doc */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {empleado.nombre_completo}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs text-gray-500">
                            {empleado.tipo_documento} {empleado.nro_documento}
                          </span>
                          {empleado.telefono && (
                            <span className="text-xs text-gray-400">· {empleado.telefono}</span>
                          )}
                        </div>
                      </div>

                      {/* Role + estado */}
                      <div className="hidden min-w-[140px] flex-col gap-1 sm:flex">
                        <span className="text-xs font-medium text-gray-700">
                          {roleName(empleado.id_rol, empleado.rol_nombre)}
                        </span>
                        <EstadoBadge estado={empleado.estado} />
                      </div>

                      {/* Salary */}
                      <div className="hidden min-w-[120px] flex-col gap-0.5 md:flex">
                        <span className="tabular-nums text-xs font-medium text-gray-700">
                          {money(empleado.sueldo_soles)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {frecuenciaPagoLabel(empleado.frecuencia_pago)}
                        </span>
                      </div>

                      {/* Actions */}
                      <TooltipProvider>
                        <div className="flex shrink-0 gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Editar empleado"
                                onClick={() => { setSelected(empleado); setPanelMode("edit") }}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Editar empleado</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Cambiar contraseña"
                                onClick={() => { setSelected(empleado); setPanelMode("password") }}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Cambiar contraseña</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                                  inactive
                                    ? "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                    : "text-red-400 hover:bg-red-50 hover:text-red-600",
                                  (busyId === empleado.id_empleado || (isSelf && !inactive)) &&
                                    "cursor-not-allowed opacity-30",
                                )}
                                aria-label={inactive ? "Activar empleado" : "Desactivar empleado"}
                                disabled={busyId === empleado.id_empleado || (isSelf && !inactive)}
                                onClick={() => toggleEstado(empleado)}
                              >
                                {busyId === empleado.id_empleado ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Power className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isSelf && !inactive
                                ? "No puedes desactivar tu propia cuenta"
                                : inactive
                                  ? "Activar empleado"
                                  : "Desactivar empleado"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  </BlurFade>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
              <span className="text-xs text-gray-500">
                Pagina{" "}
                <span className="font-semibold text-gray-900">{data?.page ?? page}</span> de{" "}
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </span>
              <button
                disabled={loading || page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
