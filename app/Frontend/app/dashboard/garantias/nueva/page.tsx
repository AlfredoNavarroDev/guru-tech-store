"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Search, Loader2, CheckCircle2 } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { toast } from "sonner"
import { getSession } from "@/lib/api/auth"
import {
  getReparacionPreview,
  createGarantia,
  type ReparacionPreview,
} from "@/lib/api/garantias"
import { ApiError } from "@/lib/api/client"

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function NuevaGarantiaPage() {
  const router = useRouter()
  const [idRep, setIdRep] = useState("")
  const [reparacion, setReparacion] = useState<ReparacionPreview | null>(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [fechaInicio, setFechaInicio] = useState(todayIso())
  const [fechaFin, setFechaFin] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session || session.rol !== "tecnico") {
      router.replace("/dashboard/garantias")
    }
  }, [router])

  const handleSearch = async () => {
    const id = parseInt(idRep, 10)
    if (!id) return
    setLoadingSearch(true)
    setReparacion(null)
    try {
      const data = await getReparacionPreview(id)
      setReparacion(data)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Reparación no encontrada")
    } finally {
      setLoadingSearch(false)
    }
  }

  const handleSubmit = async () => {
    if (!reparacion) return
    if (!fechaInicio || !fechaFin) {
      toast.error("Completa las fechas")
      return
    }
    if (new Date(fechaFin) <= new Date(fechaInicio)) {
      toast.error("La fecha de fin debe ser posterior a la fecha de inicio")
      return
    }
    setSubmitting(true)
    try {
      await createGarantia({
        id_reparacion: reparacion.id_reparacion,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      })
      toast.success("Garantía creada")
      router.push("/dashboard/garantias")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al crear garantía")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
            <ShieldCheck className="h-4 w-4 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold text-text-heading">Nueva garantía</h1>
        </div>
      </BlurFade>

      <div className="mx-auto max-w-lg space-y-6">
        {/* Step 1: Buscar reparación */}
        <BlurFade delay={0.06} duration={0.4}>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              1. Buscar reparación
            </h2>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                placeholder="Nº de reparación"
                value={idRep}
                onChange={(e) => setIdRep(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
                className={inputCls}
              />
              <button
                onClick={handleSearch}
                disabled={loadingSearch || !idRep}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#020617] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a] disabled:opacity-50"
              >
                {loadingSearch ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </button>
            </div>

            {reparacion && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">
                    Reparación #{reparacion.id_reparacion}
                  </p>
                  {(reparacion.marca || reparacion.modelo) && (
                    <p className="text-gray-600">
                      {[reparacion.marca, reparacion.modelo]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  )}
                  {reparacion.cliente && (
                    <p className="text-gray-500">{reparacion.cliente}</p>
                  )}
                  {reparacion.estado && (
                    <p className="mt-1 text-xs text-gray-400">
                      Estado: {reparacion.estado}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </BlurFade>

        {/* Step 2: Fechas */}
        <BlurFade delay={0.1} duration={0.4}>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              2. Período de garantía
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  min={fechaInicio}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Submit */}
        <BlurFade delay={0.14} duration={0.4}>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reparacion || !fechaInicio || !fechaFin}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#020617] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Crear garantía
          </button>
        </BlurFade>
      </div>
    </div>
  )
}
