"use client"

import React, { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  KeyRound,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/ui/blur-fade"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberTicker } from "@/components/ui/number-ticker"
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
const rowTransition = { duration: 0.22, ease: "easeOut" as const }

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

function docExpectedLength(tipo: TipoDocumento): number {
  return tipo === "DNI" ? 8 : tipo === "CE" ? 12 : 9
}

function docMaxLength(tipo: TipoDocumento): number {
  return tipo === "pasaporte" ? 9 : docExpectedLength(tipo)
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

function estadoBadge(estado: string) {
  if (estado === "activo") {
    return <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>
  }
  return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactivo</Badge>
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

function SkeletonTable() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr_120px] md:items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

function LockedField({ locked, msg, children }: { locked: boolean; msg: string; children: React.ReactElement }) {
  if (!locked) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{msg}</TooltipContent>
    </Tooltip>
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-950">
            {mode === "create" ? "Nuevo empleado" : "Editar empleado"}
          </h2>
          <p className="text-sm text-gray-500">Datos operativos para sede actual.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Cerrar formulario">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TooltipProvider>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium text-gray-700">
            Tipo documento
            <select
              disabled={mode === "edit" || submitting}
              value={form.tipo_documento}
              onChange={(event) => set("tipo_documento", event.target.value as TipoDocumento)}
              className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
            >
              <option value="DNI">DNI</option>
              <option value="CE">CE</option>
              <option value="pasaporte">Pasaporte</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium text-gray-700">
            Numero documento
            <Input
              disabled={mode === "edit" || submitting}
              value={form.nro_documento}
              maxLength={docMaxLength(form.tipo_documento)}
              onChange={(event) => set("nro_documento", cleanDocumentValue(form.tipo_documento, event.target.value))}
              placeholder={form.tipo_documento === "pasaporte" ? "AB123456" : "12345678"}
            />
          </label>

          <LockedField locked={mode === "edit" && !!isSelf} msg="No puedes modificar tu propio rol">
            <label className="space-y-1.5 text-sm font-medium text-gray-700">
              Rol
              <select
                disabled={submitting || (mode === "edit" && isSelf)}
                value={form.id_rol}
                onChange={(event) => set("id_rol", Number(event.target.value))}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              >
                {ROLES.map((role) => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </select>
            </label>
          </LockedField>

          <label className="space-y-1.5 text-sm font-medium text-gray-700 md:col-span-2">
            Nombre completo
            <Input
              disabled={submitting}
              value={form.nombre_completo}
              onChange={(event) => set("nombre_completo", event.target.value)}
              placeholder="Nombre y apellidos"
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium text-gray-700">
            Telefono
            <Input
              disabled={submitting}
              value={form.telefono ?? ""}
              onChange={(event) => set("telefono", event.target.value)}
              placeholder="987654321"
            />
          </label>

          <LockedField locked={mode === "edit" && !!isSelf} msg="No puedes modificar tu propio sueldo">
            <label className="space-y-1.5 text-sm font-medium text-gray-700">
              Sueldo
              <Input
                disabled={submitting || (mode === "edit" && isSelf)}
                type="number"
                min="0"
                step="0.01"
                value={form.sueldo_soles ?? ""}
                onChange={(event) =>
                  set("sueldo_soles", event.target.value ? Number(event.target.value) : undefined)
                }
                placeholder="1200"
              />
            </label>
          </LockedField>

          <LockedField locked={mode === "edit" && !!isSelf} msg="No puedes modificar tu propia frecuencia de pago">
            <label className="space-y-1.5 text-sm font-medium text-gray-700">
              Frecuencia de pago
              <select
                disabled={submitting || (mode === "edit" && isSelf)}
                value={form.frecuencia_pago}
                onChange={(event) => set("frecuencia_pago", event.target.value as FrecuenciaPago)}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              >
                {FRECUENCIAS_PAGO.map((frecuencia) => (
                  <option key={frecuencia.value} value={frecuencia.value}>{frecuencia.label}</option>
                ))}
              </select>
            </label>
          </LockedField>

          <label className="space-y-1.5 text-sm font-medium text-gray-700 md:col-span-2">
            Direccion
            <Input
              disabled={submitting}
              value={form.direccion_completa ?? ""}
              onChange={(event) => set("direccion_completa", event.target.value)}
              placeholder="Av. Lima 123"
            />
          </label>

        </div>
        </TooltipProvider>

        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={rowTransition}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Crear empleado" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </>
  )

  if (bare) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={rowTransition}
      >
        {inner}
      </motion.div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={rowTransition}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      {inner}
    </motion.section>
  )
}

interface PasswordPanelProps {
  empleado: Empleado
  onCancel: () => void
  onSaved: () => void
  bare?: boolean
}

function PasswordPanel({ empleado, onCancel, onSaved, bare }: PasswordPanelProps) {
  const [password, setPassword] = useState("")
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

  const inner = (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-950">Cambiar contraseña</h2>
          <p className="text-sm text-gray-500">{empleado.nombre_completo}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Cerrar formulario">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block max-w-sm space-y-1.5 text-sm font-medium text-gray-700">
          Nueva contraseña
          <Input
            type="password"
            value={password}
            disabled={submitting}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimo 8 caracteres"
          />
        </label>
        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={rowTransition}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </>
  )

  if (bare) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={rowTransition}
      >
        {inner}
      </motion.div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={rowTransition}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      {inner}
    </motion.section>
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

  const session = getSession()
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
  }, [page, roleFilter, estadoFilter])

  const filteredItems = useMemo(() => {
    const items = data?.items ?? []
    const normalized = search.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((empleado) => {
      return [
        empleado.nombre_completo,
        empleado.nro_documento,
        empleado.telefono ?? "",
        roleName(empleado.id_rol, empleado.rol_nombre),
      ].some((value) => value.toLowerCase().includes(normalized))
    })
  }, [data?.items, search])

  const activeCount = data?.items.filter((empleado) => empleado.estado === "activo").length ?? 0

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

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const result = await getEmpleados({
        page,
        limit: PAGE_SIZE,
        ...(roleFilter !== "todos" ? { id_rol: roleFilter } : {}),
        ...(estadoFilter !== "todos" ? { activo: estadoFilter === "activo" } : {}),
      })
      setData(result)
      closePanel()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar empleados.")
    } finally {
      setLoading(false)
    }
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
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar estado")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <BlurFade delay={0} duration={0.4}>
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Rol administrador
              </div>
              <h1 className="text-2xl font-semibold text-gray-950 sm:text-3xl">Empleados de la sede</h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Gestiona altas, cambios de rol, contraseñas y estado de acceso para empleados de {session?.sede ?? "tu sede"}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={reload} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Actualizar
              </Button>
              <Button onClick={toggleCreatePanel} aria-expanded={panelMode === "create"}>
                <Plus className={cn("h-4 w-4 transition-transform", panelMode === "create" && "rotate-45")} />
                {panelMode === "create" ? "Cerrar formulario" : "Nuevo empleado"}
              </Button>
            </div>
          </header>
        </BlurFade>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Total filtrado", value: data?.total ?? 0, icon: UsersRound, color: "text-blue-600" },
            { label: "Activos en pagina", value: activeCount, icon: CheckCircle2, color: "text-emerald-600" },
          ].map((stat, index) => {
            const Icon = stat.icon
            return (
              <BlurFade key={stat.label} delay={0.06 + index * 0.06} duration={0.35}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={rowTransition}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{stat.label}</span>
                    <Icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-950">
                    <NumberTicker value={stat.value} />
                  </p>
                </motion.div>
              </BlurFade>
            )
          })}
          <BlurFade delay={0.18} duration={0.35}>
            <motion.div
              whileHover={{ y: -2 }}
              transition={rowTransition}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Sede</span>
                <ShieldCheck className="h-4 w-4 text-violet-600" />
              </div>
              <p className="mt-2 truncate text-lg font-semibold text-gray-950">{session?.sede ?? "No cargada"}</p>
            </motion.div>
          </BlurFade>
        </section>

        <AnimatePresence mode="wait">
          {panelMode === "create" && (
            <EmployeeForm key="create" mode="create" onCancel={closePanel} onSaved={reload} />
          )}
        </AnimatePresence>

        <BottomSheet open={panelMode === "edit" && selected !== null} onClose={closePanel}>
          <div className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: "92dvh" }}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5">
              {panelMode === "edit" && selected && (
                <EmployeeForm bare mode="edit" empleado={selected} onCancel={closePanel} onSaved={reload} isSelf={selected.id_empleado === currentUserId} />
              )}
            </div>
          </div>
        </BottomSheet>

        <BottomSheet open={panelMode === "password" && selected !== null} onClose={closePanel}>
          <div className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: "92dvh" }}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5">
              {panelMode === "password" && selected && (
                <PasswordPanel bare empleado={selected} onCancel={closePanel} onSaved={closePanel} />
              )}
            </div>
          </div>
        </BottomSheet>

        <BlurFade delay={0.22} duration={0.35}>
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar en pagina por nombre, documento, telefono o rol"
                />
              </label>
              <select
                value={roleFilter}
                onChange={(event) => { setPage(1); setRoleFilter(event.target.value === "todos" ? "todos" : Number(event.target.value)) }}
                className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="todos">Todos los roles</option>
                {ROLES.map((role) => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </select>
              <select
                value={estadoFilter}
                onChange={(event) => { setPage(1); setEstadoFilter(event.target.value as EstadoFiltro) }}
                className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>
          </section>
        </BlurFade>

        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={rowTransition}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <BlurFade delay={0.28} duration={0.35}>
        <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          {loading ? (
            <SkeletonTable />
          ) : filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={rowTransition}
              className="flex min-h-52 flex-col items-center justify-center gap-2 text-center"
            >
              <UsersRound className="h-10 w-10 text-gray-300" />
              <h2 className="text-base font-semibold text-gray-900">Sin empleados para mostrar</h2>
              <p className="text-sm text-gray-500">Cambia filtros o registra un empleado nuevo.</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <div className="hidden grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr_150px] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 md:grid">
                <span>Empleado</span>
                <span>Rol</span>
                <span>Estado</span>
                <span>Sueldo</span>
                <span className="text-right">Acciones</span>
              </div>
              <AnimatePresence initial={false}>
              {filteredItems.map((empleado, index) => {
                const isSelf = empleado.id_empleado === currentUserId
                const inactive = empleado.estado !== "activo"
                return (
                  <motion.article
                    key={empleado.id_empleado}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    whileHover={{ y: -1 }}
                    transition={{ ...rowTransition, delay: index * 0.035 }}
                    className={cn(
                      "grid gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors md:grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr_150px] md:items-center",
                      inactive && "bg-gray-50"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {initials(empleado.nombre_completo)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-950">{empleado.nombre_completo}</p>
                        <p className="text-sm text-gray-500">
                          {empleado.tipo_documento} {empleado.nro_documento}
                          {empleado.telefono ? ` · ${empleado.telefono}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">{roleName(empleado.id_rol, empleado.rol_nombre)}</div>
                    <div>{estadoBadge(empleado.estado)}</div>
                    <div className="text-sm text-gray-700">
                      <p>{money(empleado.sueldo_soles)}</p>
                      <p className="text-xs text-gray-500">{frecuenciaPagoLabel(empleado.frecuencia_pago)}</p>
                    </div>
                    <TooltipProvider>
                    <div className="flex justify-end gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Editar empleado"
                            onClick={() => { setSelected(empleado); setPanelMode("edit") }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar empleado</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Cambiar contraseña"
                            onClick={() => { setSelected(empleado); setPanelMode("password") }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cambiar contraseña</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon-sm"
                            variant={inactive ? "ghost" : "destructive"}
                            aria-label={inactive ? "Activar empleado" : "Desactivar empleado"}
                            disabled={busyId === empleado.id_empleado || (isSelf && !inactive)}
                            onClick={() => toggleEstado(empleado)}
                          >
                            {busyId === empleado.id_empleado ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isSelf && !inactive ? "No puedes desactivar tu propia cuenta" : inactive ? "Activar empleado" : "Desactivar empleado"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    </TooltipProvider>
                  </motion.article>
                )
              })}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Pagina {data?.page ?? page} de {data?.totalPages ?? 1} · {data?.total ?? 0} registros
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={loading || page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
        </BlurFade>
      </div>
    </main>
  )
}
