"use client"

import { Monitor, Wrench, Layers } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { useNuevaReparacion } from "../_context/nueva-reparacion.context"

const TIPOS = [
  { value: "software" as const, label: "Software", icon: Monitor, desc: "Sistema operativo, apps, virus, configuración" },
  { value: "hardware" as const, label: "Hardware", icon: Wrench, desc: "Pantalla, batería, placa, conectores físicos" },
  { value: "mixto" as const, label: "Mixto", icon: Layers, desc: "Combinación de hardware y software" },
]

export function Step3TipoServicio() {
  const {
    tipoAccion, setTipoAccion,
    tipoServicio, setTipoServicio,
    diagnostico, setDiagnostico,
    fechaEst, setFechaEst,
    setRepuestos,
  } = useNuevaReparacion()

  function handleTipoAccion(value: "reparacion" | "diagnostico") {
    setTipoAccion(value)
    if (value === "diagnostico") {
      setRepuestos(() => [])
      setFechaEst("")
    }
  }

  function handleTipoServicio(value: "software" | "hardware" | "mixto") {
    setTipoServicio(value)
    if (value === "software") setRepuestos(() => [])
  }

  return (
    <div className="space-y-4">
      {/* Tipo de acción */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-xs font-medium text-text-muted uppercase tracking-wider">
          Tipo de acción <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["reparacion", "diagnostico"] as const).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleTipoAccion(val)}
              className={cn(
                "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                tipoAccion === val
                  ? "border-[#020617] bg-[#020617]/5 text-[#020617]"
                  : "border-gray-200 text-gray-600 hover:border-[#020617]/25 hover:bg-[#020617]/5",
              )}
            >
              {val === "reparacion" ? "Reparación" : "Diagnóstico"}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de servicio */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Tipo de servicio *
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {TIPOS.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTipoServicio(value)}
              className={cn(
                "flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-2 rounded-2xl border p-4 text-left transition-all",
                tipoServicio === value
                  ? "border-[#020617] bg-[#020617]/5 ring-2 ring-[#020617]/20"
                  : "border-gray-200 bg-white hover:border-[#020617]/25 hover:bg-[#020617]/5",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  tipoServicio === value ? "text-[#020617]" : "text-gray-400",
                )}
              />
              <div>
                <p className={cn("text-sm font-semibold", tipoServicio === value ? "text-[#020617]" : "text-gray-800")}>
                  {label}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400 leading-snug">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Diagnóstico */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Diagnóstico y servicio
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Diagnóstico / Problema reportado
            </label>
            <textarea
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Describe el problema o diagnóstico inicial del equipo..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-heading placeholder:text-gray-400 focus:border-[#020617]/50 focus:outline-none focus:ring-2 focus:ring-[#020617]/10"
            />
          </div>
          {tipoAccion !== "diagnostico" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Fecha estimada de entrega
              </label>
              <DatePicker
                value={fechaEst || undefined}
                onChange={(v) => setFechaEst(v ?? "")}
                placeholder="Seleccionar fecha"
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
