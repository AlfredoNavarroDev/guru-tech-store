"use client"

import { NumberTicker } from "@/components/ui/number-ticker"

const stats = [
  { value: 99.9, suffix: "%", label: "Garantía de tiempo de actividad", decimal: 1 },
  { value: 1.2, suffix: "M+", label: "Ops gestionadas", decimal: 1 },
  { value: 150, suffix: "ms", label: "Latencia de consulta", decimal: 0 },
  { value: 24, suffix: "/7", label: "Soporte experto", decimal: 0 },
]

export function StatsSection() {
  return (
    <section className="border-y border-zinc-200 bg-white py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200 sm:grid-cols-4 sm:divide-y-0">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-6 py-4 text-center">
              <div className="text-4xl font-bold text-zinc-900">
                <NumberTicker
                  value={stat.value}
                  decimalPlaces={stat.decimal}
                  className="text-zinc-900"
                />
                <span className="text-blue-600">{stat.suffix}</span>
              </div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
