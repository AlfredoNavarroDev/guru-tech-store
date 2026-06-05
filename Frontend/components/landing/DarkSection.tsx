import { Shield, Database } from "lucide-react"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { BorderBeam } from "@/components/ui/border-beam"

export function DarkSection() {
  return (
    <section className="bg-[#0a0a0a] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-blue-400">
              ENTERPRISE SOLUTIONS
            </p>
            <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
              Diseñado para{" "}
              <AnimatedGradientText
                colorFrom="#3b82f6"
                colorTo="#8b5cf6"
                speed={0.8}
                className="text-3xl font-bold sm:text-4xl md:text-5xl"
              >
                optimizar la gestión empresarial
              </AnimatedGradientText>
            </h2>
            <p className="mt-6 text-zinc-400 leading-relaxed">
              Apoyamos a empresas de comercio electrónico de cualquier tamaño con datos
              en tiempo real que optimizan sus ciclos de pedidos y garantizan la continuidad.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                  <Database className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Motor de datos relacional</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    El sistema recopila datos en tiempo real de forma rápida,
                    garantizando la sincronización y los puntos de reposición.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                  <Shield className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Seguridad inmutable</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Los más altos estándares de seguridad garantizan la confidencialidad
                    y el acceso controlado a todos los datos.
                  </p>
                </div>
              </div>
            </div>

            <button className="mt-8 rounded-xl border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20">
              Ver especificaciones de la plataforma →
            </button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-8">
            <BorderBeam duration={6} colorFrom="#3b82f6" colorTo="#8b5cf6" />
            <div className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-500">
              NEXT-GEN INTELLIGENCE
            </div>
            <h3 className="mb-6 text-3xl font-bold text-white">
              Meet Guru{" "}
              <AnimatedGradientText
                colorFrom="#22c55e"
                colorTo="#3b82f6"
                speed={1.2}
                className="text-3xl font-bold"
              >
                AI
              </AnimatedGradientText>
            </h3>
            <div className="space-y-3">
              {[
                { label: "Gestión de ingresos y ventas", color: "text-green-400" },
                { label: "Análisis y planificación de datos", color: "text-blue-400" },
                { label: "Predicción de demanda por sede", color: "text-purple-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-current opacity-70" style={{ color: item.color.replace("text-", "").replace("-400", "") }} />
                  <span className={`text-sm ${item.color}`}>{item.label}</span>
                </div>
              ))}
            </div>
            <button className="mt-8 flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/20">
              Solicitar acceso ○
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
