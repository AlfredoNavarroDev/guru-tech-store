"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import {
  TrendingUp,
  Users,
  ShoppingCart,
  ArrowUpRight,
  TrendingDown,
  Zap,
  Grid3X3,
  UserRound,
  Receipt,
} from "lucide-react"
import { NumberTicker } from "@/components/ui/number-ticker"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatNum } from "@/lib/utils"
import { getEstadisticas, type EstadisticasHoy } from "@/lib/api/ventas"
import { getSession } from "@/lib/api/auth"

const MotionLink = motion(Link)
const WHILETAP = { scale: 0.97 }

const AVATAR_PALETTES = [
  "bg-gray-100 text-gray-900",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
]

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
}

function pctChange(hoy: number, ayer: number): { label: string; positive: boolean } {
  if (ayer === 0) return { label: hoy > 0 ? "Nuevo" : "–", positive: hoy > 0 }
  const diff = ((hoy - ayer) / ayer) * 100
  if (diff === 0) return { label: "= Igual", positive: true }
  const sign = diff >= 0 ? "+" : ""
  return { label: `${sign}${diff.toFixed(1)}%`, positive: diff >= 0 }
}

function moneyChange(hoy: number, ayer: number): { label: string; positive: boolean } {
  if (ayer === 0) return { label: hoy > 0 ? "Nuevo" : "–", positive: hoy > 0 }
  const diff = hoy - ayer
  if (diff === 0) return { label: "= Igual", positive: true }
  const sign = diff >= 0 ? "+" : ""
  return { label: `${sign}S/${formatNum(Math.abs(diff))}`, positive: diff >= 0 }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<EstadisticasHoy | null>(null)
  const [error, setError] = useState(false)
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [today, setToday] = useState("")

  useEffect(() => {
    setSession(getSession())
    setToday(new Date().toLocaleDateString("es-PE", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }))
    getEstadisticas()
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  const loading = !stats && !error

  const sortedRecientes = useMemo(
    () => [...(stats?.recientes ?? [])].sort((a, b) => new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime()),
    [stats]
  )

  const STATS_DATA = useMemo(() => {
    if (!stats) return null
    const ventasDelta   = pctChange(stats.ventas_hoy,   stats.ventas_ayer)
    const ingresosDelta = moneyChange(stats.ingresos_hoy, stats.ingresos_ayer)
    const clientesDelta = pctChange(stats.clientes_hoy, stats.clientes_ayer)
    return [
      {
        label: "Ventas hoy",
        value: stats.ventas_hoy,
        prefix: "",
        icon: ShoppingCart,
        change: ventasDelta.label,
        positive: ventasDelta.positive,
      },
      {
        label: "Ingresos",
        value: stats.ingresos_hoy,
        prefix: "S/",
        decimalPlaces: 2,
        icon: TrendingUp,
        change: ingresosDelta.label,
        positive: ingresosDelta.positive,
      },
      {
        label: "Clientes atendidos",
        value: stats.clientes_hoy,
        prefix: "",
        icon: Users,
        change: clientesDelta.label,
        positive: clientesDelta.positive,
      },
    ]
  }, [stats])

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-full">
      {/* Greeting */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-text-heading">
            Bienvenido{session ? `, ${session.nombre.split(" ")[0]}` : ""}
          </h2>
          <p className="mt-1 text-sm capitalize text-text-muted">{today}</p>
        </div>
      </BlurFade>

      {/* ── Metrics grid ── */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl p-5 animate-pulse",
                  i < 2
                    ? "border border-white/5 bg-gradient-to-br from-black to-[#131B2E]"
                    : "border border-gray-200 bg-white",
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("h-3 w-20 rounded-md", i < 2 ? "bg-white/15" : "bg-muted")} />
                  <div className={cn("h-8 w-8 rounded-xl", i < 2 ? "bg-white/15" : "bg-muted")} />
                </div>
                <div className={cn("h-10 w-24 rounded-md mb-2", i < 2 ? "bg-white/15" : "bg-muted")} />
                <div className={cn("h-3 w-16 rounded-md", i < 2 ? "bg-white/15" : "bg-muted")} />
              </div>
            ))
          : (STATS_DATA ?? []).map((s, i) => (
              <BlurFade key={s.label} delay={i * 0.07} duration={0.4}>
                <div
                  className={cn(
                    "rounded-2xl p-5 shadow-sm",
                    i < 2
                      ? "border border-white/5 bg-gradient-to-br from-black to-[#131B2E]"
                      : "border border-gray-200 bg-white",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <p className={cn("text-xs font-semibold uppercase tracking-wider", i < 2 ? "text-[#94A3B8]" : "text-text-muted")}>
                      {s.label}
                    </p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                      <s.icon className="h-4 w-4 text-gray-900" />
                    </div>
                  </div>

                  <p className={cn("mt-3 text-4xl font-extrabold tabular-nums", i < 2 ? "text-white" : "text-text-heading")}>
                    {s.prefix}
                    <NumberTicker value={s.value} decimalPlaces={s.decimalPlaces ?? 0} />
                  </p>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={cn("flex items-center gap-0.5 text-xs font-semibold", s.positive ? "text-green-600" : "text-red-500")}>
                      {s.positive ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {s.change}
                    </span>
                    <span className={cn("text-xs", i < 2 ? "text-[#94A3B8]" : "text-text-muted")}>
                      vs ayer
                    </span>
                  </div>
                </div>
              </BlurFade>
            ))}
      </div>

      {/* ── Bottom section ── */}
      <BlurFade delay={0.32} duration={0.4}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Ventas recientes */}
          <div className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-text-heading">Ventas recientes</h2>
                <p className="mt-0.5 text-xs text-text-muted">Últimas transacciones del día</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["Hora", "Cliente", "Total"].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                          h === "Total" ? "text-right" : "text-left",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-10" /></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                        </tr>
                      ))
                    : stats?.recientes.length === 0
                      ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-10 text-center text-sm text-text-muted">
                              Sin ventas hoy
                            </td>
                          </tr>
                        )
                      : sortedRecientes.map((v, i) => (
                          <motion.tr
                            key={v.id_venta}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.25, ease: "easeOut" }}
                            className="transition-colors hover:bg-gray-50/50"
                          >
                            <td className="px-6 py-4 text-sm text-text-muted">{fmtHora(v.fecha_emision)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", AVATAR_PALETTES[i % AVATAR_PALETTES.length])}>
                                  {v.cliente ? initials(v.cliente) : "AN"}
                                </div>
                                <span className="text-sm font-medium text-text-heading">
                                  {v.cliente ?? "Anónimo"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-semibold tabular-nums text-text-heading">
                              S/{formatNum(v.total_venta_cabecera)}
                            </td>
                          </motion.tr>
                        ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick actions */}
          <div className="lg:w-60 xl:w-64 shrink-0 flex flex-col gap-3">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <h3 className="text-base font-bold text-text-heading mb-4">Acciones rápidas</h3>
              <div className="flex flex-col gap-2">
                <MotionLink
                  href="/dashboard/catalogo"
                  whileTap={WHILETAP}
                  className="flex items-center gap-3 rounded-xl bg-[#ACF847] px-4 py-3 font-bold text-[#020617] text-sm transition-all hover:bg-[#d4f96a] shadow-[0_0_16px_rgba(172,248,71,0.25)]"
                >
                  <Zap className="h-4 w-4 shrink-0" />
                  Nueva venta
                </MotionLink>
                <MotionLink
                  href="/dashboard/catalogo"
                  whileTap={WHILETAP}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Grid3X3 className="h-4 w-4 shrink-0 text-gray-900" />
                  Ver catálogo
                </MotionLink>
                <MotionLink
                  href="/dashboard/clientes"
                  whileTap={WHILETAP}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <UserRound className="h-4 w-4 shrink-0 text-gray-900" />
                  Clientes
                </MotionLink>
                <MotionLink
                  href="/dashboard/ventas"
                  whileTap={WHILETAP}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Receipt className="h-4 w-4 shrink-0 text-gray-900" />
                  Historial ventas
                </MotionLink>
              </div>
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  )
}
