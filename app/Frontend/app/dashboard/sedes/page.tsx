// app/Frontend/app/dashboard/sedes/page.tsx
"use client"

import React, { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  AlertCircle,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Power,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { BlurFade } from "@/components/ui/blur-fade"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getSedes,
  createSede,
  updateSede,
  toggleSede,
  type Sede,
  type CreateSedePayload,
} from "@/lib/api/sedes"
import { cn } from "@/lib/utils"

// ─── constants ────────────────────────────────────────────────────────────────

const SEDE_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
]

function sedeColor(id: number) {
  return SEDE_COLORS[id % SEDE_COLORS.length]
}

function sedeInitial(nombre: string) {
  return nombre.trim()[0]?.toUpperCase() ?? "S"
}

const inputCls =
  "h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
const labelCls = "block text-xs font-medium text-gray-600 mb-1.5"

const emptyForm = (): CreateSedePayload => ({
  nombre: "",
  direccion: "",
  telefono: "",
  hora_apertura: "",
  hora_cierre: "",
})

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="hidden sm:flex flex-col gap-1 min-w-[120px]">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SedesPage() {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Sede | null>(null)
  const [form, setForm] = useState<CreateSedePayload>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setSedes(await getSedes())
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar las sedes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(sede: Sede) {
    setEditing(sede)
    setForm({
      nombre: sede.nombre,
      direccion: sede.direccion ?? "",
      telefono: sede.telefono ?? "",
      hora_apertura: sede.hora_apertura ?? "",
      hora_cierre: sede.hora_cierre ?? "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setFormError("El nombre es obligatorio.")
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const payload: CreateSedePayload = {
        nombre: form.nombre.trim(),
        ...(form.direccion?.trim() ? { direccion: form.direccion.trim() } : {}),
        ...(form.telefono?.trim() ? { telefono: form.telefono.trim() } : {}),
        ...(form.hora_apertura?.trim() ? { hora_apertura: form.hora_apertura.trim() } : {}),
        ...(form.hora_cierre?.trim() ? { hora_cierre: form.hora_cierre.trim() } : {}),
      }
      if (editing) {
        await updateSede(editing.id_sede, payload)
        toast.success("Sede actualizada")
      } else {
        await createSede(payload)
        toast.success("Sede creada")
      }
      setDialogOpen(false)
      await load()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(sede: Sede) {
    setBusyId(sede.id_sede)
    try {
      await toggleSede(sede.id_sede)
      toast.success(sede.esta_habilitada ? "Sede deshabilitada" : "Sede habilitada")
      await load()
    } catch {
      toast.error("No se pudo actualizar el estado")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <BlurFade delay={0} duration={0.45}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <MapPin className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Sedes</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              Gestiona las sucursales y puntos de venta del negocio
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="shrink-0 gap-2 bg-[#020617] hover:bg-[#0f172a] text-white"
          >
            <Plus className="h-4 w-4" />
            Nueva sede
          </Button>
        </div>
      </BlurFade>

      {/* Error state */}
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

      {/* Results count */}
      {!loading && !error && (
        <BlurFade delay={0.08} duration={0.35}>
          <p className="mb-4 text-xs text-gray-500">
            {sedes.length === 0
              ? "Sin sedes registradas"
              : `${sedes.length} sede${sedes.length !== 1 ? "s" : ""} en total`}
          </p>
        </BlurFade>
      )}

      {/* Loading */}
      {loading && <SkeletonRows />}

      {/* Empty state */}
      {!loading && !error && sedes.length === 0 && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <MapPin className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Sin sedes para mostrar</p>
            <p className="text-xs text-gray-400">Registra la primera sucursal del negocio.</p>
            <Button
              size="sm"
              onClick={openCreate}
              className="mt-1 gap-2 bg-[#020617] text-white hover:bg-[#0f172a]"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar primera sede
            </Button>
          </div>
        </BlurFade>
      )}

      {/* Sede list */}
      {!loading && !error && sedes.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sedes.map((sede, index) => {
              const isBusy = busyId === sede.id_sede
              const inactive = !sede.esta_habilitada
              return (
                <BlurFade key={sede.id_sede} delay={Math.min(index * 0.04, 0.3)} duration={0.35}>
                  <div
                    className={cn(
                      "flex cursor-default items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm",
                      inactive && "opacity-60",
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        inactive ? "bg-gray-100 text-gray-400" : sedeColor(sede.id_sede),
                      )}
                    >
                      {sedeInitial(sede.nombre)}
                    </div>

                    {/* Name + address */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {sede.nombre}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {sede.direccion && (
                          <span className="text-xs text-gray-500 truncate">{sede.direccion}</span>
                        )}
                        {sede.telefono && (
                          <span className="text-xs text-gray-400">· {sede.telefono}</span>
                        )}
                      </div>
                    </div>

                    {/* Horario + estado */}
                    <div className="hidden min-w-[160px] flex-col gap-1 sm:flex">
                      {sede.hora_apertura && sede.hora_cierre ? (
                        <span className="text-xs text-gray-500">
                          {sede.hora_apertura} – {sede.hora_cierre}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sin horario</span>
                      )}
                      {sede.esta_habilitada ? (
                        <span className="w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium leading-none text-emerald-700">
                          Habilitada
                        </span>
                      ) : (
                        <span className="w-fit rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium leading-none text-gray-600">
                          Deshabilitada
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEdit(sede)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Editar sede"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(sede)}
                        disabled={isBusy}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40",
                          sede.esta_habilitada
                            ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                            : "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700",
                        )}
                        aria-label={sede.esta_habilitada ? "Deshabilitar sede" : "Habilitar sede"}
                      >
                        {isBusy
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Power className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  </div>
                </BlurFade>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog create / edit */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <div
          className="relative flex w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
          style={{ maxHeight: "92dvh" }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {/* Dialog header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gray-100">
                  <MapPin className="h-4 w-4 text-gray-900" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {editing ? "Editar sede" : "Nueva sede"}
                  </h2>
                  {editing && (
                    <p className="text-xs text-gray-500">{editing.nombre}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDialogOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className={labelCls}>
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  maxLength={100}
                  placeholder="TechStore Lima Centro"
                />
              </div>

              <div>
                <label className={labelCls}>Dirección</label>
                <input
                  className={inputCls}
                  value={form.direccion ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                  placeholder="Av. Javier Prado 123, Lima"
                />
              </div>

              <div>
                <label className={labelCls}>Teléfono</label>
                <input
                  className={inputCls}
                  value={form.telefono ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  maxLength={20}
                  placeholder="01-4271890"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Hora apertura</label>
                  <input
                    className={inputCls}
                    value={form.hora_apertura ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, hora_apertura: e.target.value }))}
                    placeholder="09:00"
                  />
                </div>
                <div>
                  <label className={labelCls}>Hora cierre</label>
                  <input
                    className={inputCls}
                    value={form.hora_cierre ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, hora_cierre: e.target.value }))}
                    placeholder="20:00"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-2 bg-[#020617] hover:bg-[#0f172a] text-white"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Guardar cambios" : "Crear sede"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
