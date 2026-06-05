import { SparklesText } from "@/components/ui/sparkles-text"
import { ShimmerButton } from "@/components/ui/shimmer-button"

export function CTASection() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <SparklesText
          className="text-4xl font-bold text-zinc-900 md:text-5xl"
          sparklesCount={8}
          colors={{ first: "#3b82f6", second: "#8b5cf6" }}
        >
          ¿Listo para mejorar la gestión de tus operaciones comerciales?
        </SparklesText>
        <p className="mx-auto mt-6 max-w-xl text-zinc-500">
          Únete a las empresas que ya confían en Guru Tech Store para gestionar
          sus operaciones con precisión y eficiencia.
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <ShimmerButton
            background="rgba(0,0,0,0.9)"
            borderRadius="10px"
            shimmerDuration="2.5s"
            className="w-full justify-center px-8 py-3.5 text-base font-semibold sm:w-auto"
          >
            Solicitar acceso
          </ShimmerButton>
          <button className="w-full rounded-xl border border-zinc-300 px-8 py-3.5 text-base font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 sm:w-auto">
            Contactar al administrador
          </button>
        </div>
      </div>
    </section>
  )
}
