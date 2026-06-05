import Link from "next/link"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { WordRotate } from "@/components/ui/word-rotate"
import { Meteors } from "@/components/ui/meteors"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { BorderBeam } from "@/components/ui/border-beam"

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] pt-20">
      <Meteors number={15} />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs tracking-widest">
            <AnimatedShinyText shimmerWidth={120} className="text-zinc-300 text-xs tracking-widest">
              ✦ SISTEMA DE GESTIÓN
            </AnimatedShinyText>
          </div>
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-7xl">
          Control de{" "}
          <WordRotate
            words={["inventario", "ventas", "personal"]}
            className="text-blue-400"
            duration={2500}
          />
          en múltiples sedes
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Plataforma de gestión que integra inventario, ventas y control de personal,
          diseñada para operar eficientemente en múltiples sedes.
        </p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <Link href="/login" className="w-full sm:w-auto">
            <ShimmerButton
              shimmerDuration="2.5s"
              className="w-full justify-center px-8 py-3.5 text-base font-semibold sm:w-auto"
            >
              Iniciar sesión →
            </ShimmerButton>
          </Link>
          <button className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-base text-zinc-300 transition-all hover:border-white/40 hover:text-white sm:w-auto">
            Ver demo ○
          </button>
        </div>

        <div className="relative mx-auto mt-12 sm:mt-20 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
          <BorderBeam duration={5} colorFrom="#3b82f6" colorTo="#8b5cf6" />
          <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900/80 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <div className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-zinc-500">dashboard.gurutechstore.com</span>
          </div>
          <div className="grid grid-cols-1 gap-3 bg-zinc-900 p-4 sm:grid-cols-3 sm:p-6">
            <div className="col-span-1 rounded-lg border border-white/5 bg-zinc-800/50 p-4 sm:col-span-2">
              <div className="mb-3 text-xs font-medium text-zinc-400">Ventas del mes</div>
              <div className="flex items-end gap-1 h-24">
                {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-blue-500/40 transition-all"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-row gap-3 sm:flex-col">
              <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-4">
                <div className="text-xs text-zinc-400">Total ventas</div>
                <div className="mt-1 text-2xl font-bold text-white">S/ 48.2K</div>
                <div className="mt-1 text-xs text-green-400">↑ 12.5%</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-zinc-800/50 p-4">
                <div className="text-xs text-zinc-400">Stock disponible</div>
                <div className="mt-1 text-2xl font-bold text-white">1,842</div>
                <div className="mt-1 text-xs text-blue-400">5 sedes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
