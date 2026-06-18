"use client"

import { useState } from "react"
import { CheckCircle2, Search, Phone, User } from "lucide-react"
import { motion } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Input } from "@/components/ui/input"
import { cn, formatNum } from "@/lib/utils"

type EstadoReparacion = "Entregado"

interface ReparacionHistorial {
  id: string
  cliente: string
  telefono: string
  equipo: string
  marca: string
  modelo: string
  problema: string
  estado: EstadoReparacion
  fecha_ingreso: string
  fecha_entrega: string
  tecnico: string
  total: number
  adelanto: number
}

const HISTORIAL: ReparacionHistorial[] = [
  {
    id: "REP-006",
    cliente: "Lucía Mamani",
    telefono: "978 901 234",
    equipo: "Impresora",
    marca: "Epson",
    modelo: "L3150",
    problema: "Cabezal obstruido, luces parpadeantes",
    estado: "Entregado",
    fecha_ingreso: "2026-06-09",
    fecha_entrega: "2026-06-13",
    tecnico: "Juan Pérez",
    total: 120,
    adelanto: 60,
  },
  {
    id: "REP-010",
    cliente: "Diego Huanca",
    telefono: "945 123 456",
    equipo: "Laptop",
    marca: "Lenovo",
    modelo: "IdeaPad 5",
    problema: "Teclado derramado, no responde",
    estado: "Entregado",
    fecha_ingreso: "2026-06-05",
    fecha_entrega: "2026-06-08",
    tecnico: "Luis Torres",
    total: 180,
    adelanto: 180,
  },
  {
    id: "REP-009",
    cliente: "Patricia León",
    telefono: "962 789 000",
    equipo: "Smartphone",
    marca: "Xiaomi",
    modelo: "Redmi Note 11",
    problema: "Micrófono sin sonido, altavoz con distorsión",
    estado: "Entregado",
    fecha_ingreso: "2026-06-03",
    fecha_entrega: "2026-06-07",
    tecnico: "Juan Pérez",
    total: 90,
    adelanto: 90,
  },
]

function fmtFecha(iso: string) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-PE", {
      day: "2-digit", month: "short", year: "numeric",
    })
  } catch {
    return iso
  }
}

export default function HistorialPage() {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? HISTORIAL.filter(
        (r) =>
          r.id.toLowerCase().includes(search.toLowerCase()) ||
          r.cliente.toLowerCase().includes(search.toLowerCase()) ||
          r.equipo.toLowerCase().includes(search.toLowerCase()),
      )
    : HISTORIAL

  return (
    <div className="min-h-full bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <BlurFade delay={0} duration={0.35}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-text-heading">Historial de reparaciones</h2>
              <p className="text-xs text-text-muted">{filtered.length} reparaciones entregadas</p>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.1} duration={0.35}>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente, equipo, ID..."
                  className="rounded-xl pl-9 text-sm bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {[
                      { label: "ID",        align: "left"  },
                      { label: "Cliente",   align: "left"  },
                      { label: "Equipo",    align: "left"  },
                      { label: "Ingreso",   align: "left"  },
                      { label: "Entrega",   align: "left"  },
                      { label: "Técnico",   align: "left"  },
                      { label: "Total S/",  align: "right" },
                      { label: "Pagado S/", align: "right" },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={cn(
                          "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                          h.align === "right" ? "text-right" : "text-left",
                        )}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-text-muted">
                        Sin resultados
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.2 }}
                        className="hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-muted">{r.id}</td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <div className="font-semibold text-text-heading">{r.cliente}</div>
                          <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            {r.telefono}
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-[130px]">
                          <div className="font-medium text-text-heading">{r.equipo}</div>
                          <div className="text-xs text-text-muted">{r.marca} {r.modelo}</div>
                        </td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtFecha(r.fecha_ingreso)}</td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtFecha(r.fecha_entrega)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-text-muted">
                            <User className="h-3 w-3 shrink-0" />
                            {r.tecnico}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-heading whitespace-nowrap">
                          S/{formatNum(r.total)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={cn(
                            "font-semibold tabular-nums",
                            r.adelanto >= r.total ? "text-green-600" : "text-amber-600",
                          )}>
                            S/{formatNum(r.adelanto)}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </BlurFade>
      </div>
    </div>
  )
}
