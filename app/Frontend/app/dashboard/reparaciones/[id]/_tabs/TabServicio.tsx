"use client"

import { useState } from "react"
import { Loader2, Wrench, Check, Camera, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import {
  updateEstadoReparacion,
  getReparacion,
  uploadFotoReparacion,
  type ReparacionResponse,
} from "@/lib/api/reparaciones"

const ESTADO_FLOW: { id: number; key: string; label: string; desc: string }[] = [
  { id: 1, key: "pendiente",  label: "Recibido",   desc: "El equipo fue recibido" },
  { id: 2, key: "reparacion", label: "Reparando",   desc: "Trabajando en el equipo" },
  { id: 3, key: "listo",      label: "Listo",       desc: "Ya se puede recoger" },
  { id: 4, key: "entregado",  label: "Entregado",   desc: "El cliente lo recogió" },
]

interface TabServicioProps {
  rep: ReparacionResponse
  estadoEsFinal: boolean
  onRepUpdated: (rep: ReparacionResponse) => void
  onEntregarClick?: () => void
}

export function TabServicio({ rep, estadoEsFinal, onRepUpdated, onEntregarClick }: TabServicioProps) {
  const [diagUpdate, setDiagUpdate]               = useState(rep.diagnostico_tecnico ?? "")
  const [fechaUpdate, setFechaUpdate]             = useState(rep.fecha_estimada ?? "")
  const [savingEstado, setSavingEstado]           = useState(false)
  const [savingEstadoKey, setSavingEstadoKey]     = useState<string | null>(null)
  const [estadoError, setEstadoError]             = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto]         = useState(false)
  const [pendingStep, setPendingStep]             = useState<(typeof ESTADO_FLOW)[number] | null>(null)

  const fotosByEtapa = new Map<string, { url: string; etapa: string; created_at: string }[]>()
  for (const foto of rep.fotos ?? []) {
    const arr = fotosByEtapa.get(foto.etapa) ?? []
    arr.push(foto)
    fotosByEtapa.set(foto.etapa, arr)
  }

  const currentStageHasPhoto = fotosByEtapa.has(rep.estado ?? "pendiente")

  const currentEstadoIdx = ESTADO_FLOW.findIndex(e => e.key === rep.estado)

  const executeStepChange = async (step: (typeof ESTADO_FLOW)[number]) => {
    setSavingEstadoKey(step.key)
    setEstadoError(null)
    try {
      const updated = await updateEstadoReparacion(rep.id_reparacion, { id_estado: step.id })
      onRepUpdated(updated)
      toast.success(`Estado: ${step.label}`)
    } catch (e) {
      setEstadoError(e instanceof ApiError ? e.message : "Error actualizando estado")
    } finally {
      setSavingEstadoKey(null)
      setPendingStep(null)
    }
  }

  const handleUploadFoto = async (file: File) => {
    setUploadingFoto(true)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload  = () => resolve((reader.result as string).split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await uploadFotoReparacion(rep.id_reparacion, {
        imagen_base64: base64,
        content_type: file.type || "image/jpeg",
        estado: rep.estado ?? "pendiente",
      })
      const updated = await getReparacion(rep.id_reparacion)
      onRepUpdated(updated)
      toast.success("Foto registrada")
      if (pendingStep) {
        await executeStepChange(pendingStep)
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error subiendo foto")
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleStepClick = async (step: (typeof ESTADO_FLOW)[number]) => {
    if (step.key === rep.estado || estadoEsFinal || savingEstadoKey) return
    const stepIdx = ESTADO_FLOW.findIndex(e => e.key === step.key)
    if (stepIdx > currentEstadoIdx + 1) return
    if (step.key === "entregado" && onEntregarClick) {
      onEntregarClick()
      return
    }
    if (stepIdx > currentEstadoIdx && !currentStageHasPhoto) {
      setPendingStep(step)
      return
    }
    await executeStepChange(step)
  }

  const handleUpdateDiagnostico = async () => {
    setSavingEstado(true)
    setEstadoError(null)
    const currentId = ESTADO_FLOW.find(e => e.key === rep.estado)?.id ?? 1
    try {
      const updated = await updateEstadoReparacion(rep.id_reparacion, {
        id_estado: currentId,
        diagnostico_tecnico: diagUpdate.trim() || undefined,
        fecha_estimada: fechaUpdate || undefined,
      })
      onRepUpdated(updated)
      toast.success("Guardado")
    } catch (e) {
      setEstadoError(e instanceof ApiError ? e.message : "Error guardando")
    } finally {
      setSavingEstado(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Estado y diagnóstico */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <Wrench className="h-3.5 w-3.5 text-gray-700" />
          </div>
          <h2 className="text-sm font-semibold text-text-heading">¿En qué paso va?</h2>
        </div>
        <div className="space-y-4 p-5">
          {/* Progreso visual */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                Paso {currentEstadoIdx + 1} de {ESTADO_FLOW.length}
              </span>
              <span className="text-xs font-semibold text-gray-700">
                {ESTADO_FLOW[currentEstadoIdx]?.label}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#020617] transition-[width] duration-500"
                style={{ width: `${((currentEstadoIdx + 1) / ESTADO_FLOW.length) * 100}%` }}
              />
            </div>
            {/* Steps */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ESTADO_FLOW.map((step, idx) => {
                const isPast    = idx < currentEstadoIdx
                const isCurrent = idx === currentEstadoIdx
                const isNext    = idx === currentEstadoIdx + 1
                const isLocked  = idx > currentEstadoIdx + 1
                const isSaving  = savingEstadoKey === step.key
                const hasPhoto  = fotosByEtapa.has(step.key)
                const needsPhoto = (isPast || isCurrent) && !hasPhoto && step.key !== "entregado"
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => handleStepClick(step)}
                    disabled={estadoEsFinal || !!savingEstadoKey || isLocked}
                    title={isLocked ? "Completa el paso anterior primero" : step.desc}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all",
                      !estadoEsFinal && !savingEstadoKey && !isLocked && "cursor-pointer hover:bg-gray-50",
                      (estadoEsFinal || !!savingEstadoKey || isLocked) && "cursor-not-allowed opacity-40",
                      isCurrent && "bg-[#020617]/5 ring-1 ring-[#020617]/20",
                    )}
                  >
                    <div
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                        isCurrent  && "bg-[#020617] text-white shadow-sm",
                        isPast     && "bg-green-500 text-white",
                        !isCurrent && !isPast && "bg-gray-200 text-gray-400",
                      )}
                    >
                      {isSaving
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : isPast
                          ? <Check className="h-3.5 w-3.5" />
                          : idx + 1
                      }
                      {/* Photo status indicator */}
                      {(isPast || isCurrent) && step.key !== "entregado" && (
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white",
                            hasPhoto ? "bg-green-500" : "bg-amber-400",
                          )}
                        >
                          {hasPhoto
                            ? <CheckCircle2 className="h-2 w-2 text-white" />
                            : <Camera className="h-2 w-2 text-white" />
                          }
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-center text-[10px] leading-tight sm:text-[11px]",
                        isCurrent ? "font-semibold text-gray-900" : "text-gray-400",
                        needsPhoto && !isCurrent && "text-amber-600",
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Current step description */}
            {ESTADO_FLOW[currentEstadoIdx] && (
              <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-center text-xs text-blue-700">
                {ESTADO_FLOW[currentEstadoIdx].desc}
              </p>
            )}
          </div>

          {/* Photo prompt for current stage */}
          {!estadoEsFinal && (
            <div className={cn(
              "rounded-xl border-2 border-dashed p-4",
              currentStageHasPhoto
                ? "border-green-200 bg-green-50/50"
                : "border-amber-300 bg-amber-50",
            )}>
              {currentStageHasPhoto ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800">
                      Foto registrada para esta etapa
                    </p>
                    <p className="text-xs text-green-600">
                      {fotosByEtapa.get(rep.estado ?? "pendiente")!.length} foto(s) en &quot;{ESTADO_FLOW[currentEstadoIdx]?.label}&quot;
                    </p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors">
                    <Camera className="h-3.5 w-3.5" />
                    Otra foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      disabled={uploadingFoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleUploadFoto(file)
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
                    <Camera className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Falta foto de esta etapa
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Toma una foto del equipo en &quot;{ESTADO_FLOW[currentEstadoIdx]?.label}&quot; antes de avanzar
                    </p>
                  </div>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors",
                      uploadingFoto
                        ? "bg-amber-300 cursor-not-allowed"
                        : "bg-amber-600 hover:bg-amber-700 shadow-sm",
                    )}
                  >
                    {uploadingFoto ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                    ) : (
                      <><Camera className="h-4 w-4" /> Tomar foto de esta etapa</>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      disabled={uploadingFoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleUploadFoto(file)
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Warning modal when advancing without photo */}
          {pendingStep && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <Camera className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    No hay foto de &quot;{ESTADO_FLOW[currentEstadoIdx]?.label}&quot;
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Se recomienda adjuntar una foto antes de avanzar al siguiente paso.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
                      <Camera className="h-3.5 w-3.5" />
                      Tomar foto primero
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        disabled={uploadingFoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleUploadFoto(file)
                          e.target.value = ""
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void executeStepChange(pendingStep)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Avanzar sin foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingStep(null)}
                      className="rounded-lg px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mini photo gallery for current stage */}
          {currentStageHasPhoto && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(fotosByEtapa.get(rep.estado ?? "pendiente") ?? []).map((foto, i) => (
                <a
                  key={i}
                  href={foto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 h-16 w-16"
                >
                  <img
                    src={foto.url}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Notas del técnico */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Notas del técnico
            </label>
            <textarea
              value={diagUpdate}
              onChange={(e) => setDiagUpdate(e.target.value)}
              placeholder="¿Qué se encontró? ¿Qué se hizo? Escribe aquí..."
              rows={3}
              disabled={estadoEsFinal}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-heading placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              ¿Cuándo estará listo?
            </label>
            <Input
              type="date"
              value={fechaUpdate}
              onChange={(e) => setFechaUpdate(e.target.value)}
              disabled={estadoEsFinal}
              className="rounded-xl"
            />
          </div>

          {estadoError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{estadoError}</p>
          )}

          <Button
            onClick={handleUpdateDiagnostico}
            disabled={savingEstado || estadoEsFinal}
            className="w-full rounded-xl bg-[#020617] hover:bg-[#0f172a] text-white"
          >
            {savingEstado ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </div>

    </div>
  )
}
