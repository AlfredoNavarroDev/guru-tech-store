import { Package, Bot, ShoppingCart, Building2, ClipboardList, TrendingUp } from "lucide-react"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import { DotPattern } from "@/components/ui/dot-pattern"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"

const features = [
  {
    Icon: Package,
    name: "Inventario inteligente",
    description: "Análisis de tendencias y reposición automática basada en demanda histórica.",
    href: "#",
    cta: "Ver funcionalidad",
    className: "col-span-3 md:col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <Package className="h-32 w-32 text-blue-400" />
      </div>
    ),
  },
  {
    Icon: Bot,
    name: "Asistente de IA",
    description: "Consulta información del sistema en lenguaje natural para tomar mejores decisiones.",
    href: "#",
    cta: "Ver funcionalidad",
    className: "col-span-3 md:col-span-2",
    background: (
      <div className="absolute inset-0 flex items-end justify-end p-6 opacity-10">
        <div className="text-right font-mono text-xs text-green-400 leading-relaxed">
          {`> stock.sede("Lima")`}<br />
          {`{ total: 842, low: 12 }`}<br />
          {`> ventas.hoy()`}<br />
          {`S/ 8,420 (+5.2%)`}
        </div>
      </div>
    ),
  },
  {
    Icon: ShoppingCart,
    name: "Omni-Ventas",
    description: "Ventas unificadas en tienda física, e-commerce y apps móviles desde una sola plataforma.",
    href: "#",
    cta: "Ver funcionalidad",
    className: "col-span-3 md:col-span-2",
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <div className="grid grid-cols-3 gap-2 p-8 w-full">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-blue-400" />
          ))}
        </div>
      </div>
    ),
  },
  {
    Icon: Building2,
    name: "Multi-Sede",
    description: "Gestión de múltiples sedes desde un panel central con control independiente por ubicación.",
    href: "#",
    cta: "Ver funcionalidad",
    className: "col-span-3 md:col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-15">
        <Building2 className="h-28 w-28 text-purple-400" />
      </div>
    ),
  },
  {
    Icon: ClipboardList,
    name: "Gestión de pedidos",
    description: "Procesamiento, trazabilidad y automatización del ciclo completo de pedidos.",
    href: "#",
    cta: "Ver funcionalidad",
    className: "col-span-3 md:col-span-1",
    background: null,
  },
  {
    Icon: TrendingUp,
    name: "Control de ventas",
    description: "Suite unificada con punto de venta integrado y reportes en tiempo real.",
    href: "#",
    cta: "Ver funcionalidad",
    className: "col-span-3 md:col-span-2",
    background: null,
  },
]

export function FeaturesSection() {
  return (
    <section id="plataforma" className="relative overflow-hidden bg-zinc-950 py-24">
      <DotPattern className="text-white/5" cr={1} width={20} height={20} />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
            <AnimatedShinyText shimmerWidth={120} className="text-zinc-400 text-xs tracking-widest">
              FUNCIONALIDADES
            </AnimatedShinyText>
          </div>
        </div>

        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Funcionalidades principales
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Diseñado para satisfacer las exigencias de los ecosistemas minoristas tecnológicos de alto crecimiento.
          </p>
        </div>

        <BentoGrid>
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} background={feature.background ?? <div />} />
          ))}
        </BentoGrid>
      </div>
    </section>
  )
}
