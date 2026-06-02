import { Check } from "lucide-react"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"

const features = [
  "Inventario en tiempo real",
  "Control de ventas unificado",
  "Gestión multi-sede",
]

export function DecorativePanel() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 h-full flex flex-col justify-between p-12">
      <AnimatedGridPattern
        className="absolute inset-0 fill-white/5 stroke-white/5 text-white/5"
        numSquares={20}
        maxOpacity={0.04}
        duration={3}
      />

      {/* Top: logo + brand */}
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-xl font-bold text-white">
          G
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            GURU TECH STORE
          </p>
          <p className="mt-0.5 text-xs text-white/50">ERP Multi-Sede</p>
        </div>
      </div>

      {/* Middle: heading + features */}
      <div className="relative z-10 flex flex-col gap-8">
        <h2 className="text-3xl font-bold leading-snug text-white">
          Sistema de gestión empresarial para múltiples sedes
        </h2>

        <div className="flex flex-col gap-3">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-3">
              <Check className="h-4 w-4 shrink-0 text-blue-200" />
              <span className="text-sm text-white/90">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: copyright */}
      <p className="relative z-10 text-xs text-white/40">
        Sistema seguro y confiable · © 2026
      </p>
    </div>
  )
}
