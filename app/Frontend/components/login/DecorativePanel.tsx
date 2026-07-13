import Image from "next/image"
import { Check } from "lucide-react"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"

const features = [
  "Inventario en tiempo real",
  "Control de ventas unificado",
  "Gestión multi-sede",
]

export function DecorativePanel() {
  return (
    <div className="relative overflow-hidden bg-[#020617] h-full flex flex-col justify-between p-12">
      <AnimatedGridPattern
        className="absolute inset-0 fill-white/5 stroke-white/5 text-white/5"
        numSquares={20}
        maxOpacity={0.04}
        duration={3}
      />

      {/* Top: logo + brand */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
          <Image
            src="https://pub-70517b8feb72462790b99d3d0d9c7d63.r2.dev/gts_logo.png"
            alt="Guru Tech Store"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            GURU TECH STORE
          </p>
          <p className="mt-0.5 text-xs text-white/50">Gestión Multi-Sede</p>
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
              <Check className="h-4 w-4 shrink-0 text-lime" />
              <span className="text-sm text-white/90">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: copyright */}
      <p className="relative z-10 text-xs text-white/40">
        Guru Tech Dev · Alfredo Navarro Dev · © 2026
      </p>
    </div>
  )
}
