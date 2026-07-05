"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wrench, ArrowLeft, ArrowRight, Loader2, CheckCircle2, Package } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import {
  createReparacion,
  addRepuesto,
  uploadFotoReparacion,
  createPagoReparacion,
  emitirBoletaReparacion,
} from "@/lib/api/reparaciones"
import {
  NuevaReparacionProvider,
  useNuevaReparacion,
} from "./_context/nueva-reparacion.context"
import { Step1Cliente } from "./_steps/Step1Cliente"
import { Step2EquipoFoto } from "./_steps/Step2EquipoFoto"
import { Step3TipoServicio } from "./_steps/Step3TipoServicio"
import { Step4Repuestos } from "./_steps/Step4Repuestos"
import { Step5Pago } from "./_steps/Step5Pago"

const ALL_STEPS = [
  { id: 0, label: "Cliente", description: "Selecciona el cliente" },
  { id: 1, label: "Equipo y Foto", description: "Datos del equipo y foto de ingreso" },
  { id: 2, label: "Tipo de Servicio", description: "Diagnóstico y tipo de reparación" },
  { id: 3, label: "Repuestos", description: "Asigna los repuestos necesarios", conditional: true },
  { id: 4, label: "Pago", description: "Presupuesto y adelanto" },
]

function WizardContent() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    idCliente,
    marca, modelo, imei, estaEncendido, checklist,
    fotoBase64, fotoContentType,
    tipoServicio, diagnostico, fechaEst, cotizado,
    repuestos,
    tipoDescuento, valorDescuento, justificacionDescuento,
    pagos,
  } = useNuevaReparacion()

  const skipRepuestos = tipoServicio === "software"
  const visibleSteps = skipRepuestos
    ? ALL_STEPS.filter((s) => !s.conditional)
    : ALL_STEPS

  const visibleIndex = visibleSteps.findIndex((s) => s.id === step)

  function canNext(): boolean {
    if (step === 0) return idCliente !== null
    if (step === 1) return marca.trim() !== "" && modelo.trim() !== ""
    if (step === 2) return tipoServicio !== null
    if (step === 4) {
      const descV = parseFloat(valorDescuento) || 0
      if (descV > 0 && !justificacionDescuento.trim()) return false
      return true
    }
    return true
  }

  function goNext() {
    setError(null)
    if (step === 2 && skipRepuestos) {
      setStep(4)
    } else {
      setStep((s) => s + 1)
    }
  }

  function goPrev() {
    setError(null)
    if (step === 4 && skipRepuestos) {
      setStep(2)
    } else {
      setStep((s) => s - 1)
    }
  }

  const isLastStep = step === 4

  async function handleSubmit() {
    if (!idCliente) return
    setSaving(true)
    setError(null)
    try {
      const checklistJsonb =
        Object.keys(checklist).length > 0
          ? (checklist as Record<string, unknown>)
          : undefined

      const laborCost = parseFloat(cotizado) || 0
      const repuestosCostCalc = repuestos.reduce((s, r) => s + r.precio_cobrado * r.cantidad, 0)
      const subtotalCalc = laborCost + repuestosCostCalc
      const descV = parseFloat(valorDescuento) || 0
      const montoDescCalc = descV > 0
        ? (tipoDescuento === "porcentaje"
            ? Math.min(subtotalCalc, (subtotalCalc * descV) / 100)
            : Math.min(subtotalCalc, Math.max(0, descV)))
        : 0

      const rep = await createReparacion({
        id_cliente: idCliente,
        marca: marca.trim() || undefined,
        modelo: modelo.trim() || undefined,
        imei: imei.trim() || undefined,
        esta_encendido: estaEncendido ?? undefined,
        checklist_estado: checklistJsonb,
        tipo_servicio: tipoServicio ?? undefined,
        diagnostico_tecnico: diagnostico.trim() || undefined,
        fecha_estimada: fechaEst || undefined,
        monto_cotizado: laborCost > 0 ? laborCost : undefined,
        ...(montoDescCalc > 0
          ? {
              monto_descuento: descV,
              tipo_descuento: tipoDescuento,
              justificacion_descuento: justificacionDescuento,
            }
          : {}),
      })

      const id = rep.id_reparacion

      if (fotoBase64 && fotoContentType) {
        try {
          await uploadFotoReparacion(id, {
            imagen_base64: fotoBase64,
            content_type: fotoContentType,
            estado: "pendiente",
          })
        } catch {
          toast.warning("No se pudo subir la foto. Agrégala desde el detalle.")
        }
      }

      if (repuestos.length > 0) {
        const results = await Promise.allSettled(
          repuestos.map((r) =>
            addRepuesto(id, {
              id_item: r.id_item,
              cantidad: r.cantidad,
              precio_cobrado: r.precio_cobrado,
              costo_unitario_momento: r.precio_compra_actual,
            }),
          ),
        )
        const failures = results
          .map((r, i) => (r.status === "rejected" ? repuestos[i].nombre : null))
          .filter(Boolean) as string[]
        if (failures.length > 0) {
          toast.warning(`Repuestos no guardados: ${failures.join(", ")}. Agrégalos desde el detalle.`)
        }
      }

      const pagosValidos = pagos.filter((p) => parseFloat(p.monto) > 0)
      if (pagosValidos.length > 0) {
        const pagoResults = await Promise.allSettled(
          pagosValidos.map((p) =>
            createPagoReparacion(id, {
              monto: parseFloat(p.monto),
              metodo_pago: p.metodo,
              es_adelanto: true,
            }),
          ),
        )
        const failedCount = pagoResults.filter((r) => r.status === "rejected").length
        if (failedCount > 0) {
          toast.warning(
            `${failedCount} pago(s) no se registraron. Agrégalos desde el detalle.`,
          )
        }
      }

      let boletaNumero: string | null = null
      try {
        const boleta = await emitirBoletaReparacion(id)
        boletaNumero = boleta.numero
      } catch {
        toast.warning("Boleta no generada. Puedes emitirla desde el detalle.")
      }

      toast.success(
        boletaNumero
          ? `Reparación REP-${String(id).padStart(3, "0")} registrada · Boleta ${boletaNumero} emitida`
          : `Reparación REP-${String(id).padStart(3, "0")} registrada`,
      )
      router.push(`/dashboard/reparaciones/${id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error al registrar el equipo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Mobile header */}
      <div className="mb-5 md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={step === 0 ? () => router.back() : goPrev}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Volver" : "Atrás"}
          </button>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            Paso {visibleIndex + 1} / {visibleSteps.length}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-1 rounded-full bg-[#020617] transition-all duration-300"
            style={{ width: `${((visibleIndex + 1) / visibleSteps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar desktop */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                <Wrench className="h-4 w-4 text-gray-700" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Registrar equipo</span>
            </div>
            <nav className="space-y-1">
              {visibleSteps.map((s, i) => {
                const isCurrent = s.id === step
                const isDone = visibleSteps.findIndex((vs) => vs.id === step) > i
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        isDone
                          ? "bg-[#020617] text-lime"
                          : isCurrent
                            ? "bg-lime/30 text-[#020617] ring-2 ring-lime"
                            : "bg-gray-100 text-gray-400",
                      )}
                    >
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isCurrent ? "text-[#020617] font-semibold" : isDone ? "text-gray-600" : "text-gray-400",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </nav>
            <button
              onClick={() => router.back()}
              className="mt-6 w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <BlurFade key={step} delay={0} duration={0.25}>
            <div className="rounded-2xl border border-gray-200 bg-white">
              <div className="rounded-t-2xl border-b border-gray-100 px-6 py-5">
                <h1 className="text-base font-semibold text-gray-900">
                  {ALL_STEPS.find((s) => s.id === step)?.label}
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {ALL_STEPS.find((s) => s.id === step)?.description}
                </p>
              </div>

              <div className="p-6">
                {step === 0 && <Step1Cliente />}
                {step === 1 && <Step2EquipoFoto />}
                {step === 2 && <Step3TipoServicio />}
                {step === 3 && <Step4Repuestos />}
                {step === 4 && <Step5Pago />}

                {error && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <button
                  onClick={step === 0 ? () => router.back() : goPrev}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {step > 0 && <ArrowLeft className="h-4 w-4" />}
                  {step === 0 ? "Cancelar" : "Atrás"}
                </button>

                {isLastStep ? (
                  <button
                    onClick={handleSubmit}
                    disabled={saving || !canNext()}
                    className="flex items-center gap-1.5 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-[#020617] transition-colors hover:bg-lime/85 disabled:opacity-50 shadow-[0_0_16px_rgba(172,248,71,0.35)]"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    Registrar ingreso
                  </button>
                ) : (
                  <button
                    onClick={goNext}
                    disabled={!canNext()}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  )
}

export default function NuevaReparacionPage() {
  return (
    <NuevaReparacionProvider>
      <WizardContent />
    </NuevaReparacionProvider>
  )
}
