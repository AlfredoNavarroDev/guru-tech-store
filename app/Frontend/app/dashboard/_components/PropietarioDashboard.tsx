"use client"

import { useEffect, useSyncExternalStore, useState } from "react"
import { useSearchParams } from "next/navigation"
import { TrendingUp, Users, ShoppingCart, ArrowUpRight, TrendingDown } from "lucide-react"
import { motion } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { getSession } from "@/lib/api/auth"
import { cn, formatNum } from "@/lib/utils"
import {
  getResumenHoy, getVentasRecientes, getTopProductos, getEmpleadosVsMetaHoy,
  type ResumenHoy, type VentaReciente, type TopProducto, type EmpleadoVsMeta,
} from "@/lib/api/propietario"
import { getEmpleadosRendimiento, type EmpleadoRendimiento } from "@/lib/api/empleados"
import { RendimientoRow } from "./shared/RendimientoRow"

// ── Helpers ────────────────────────────────────────────────────────────────

function noopSubscribe() { return () => undefined }

function formatToday() {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

function pctDelta(hoy: number, ayer: number): { label: string; positive: boolean } {
  if (ayer === 0) return { label: hoy > 0 ? "Nuevo" : "–", positive: hoy > 0 }
  const pct = ((hoy - ayer) / ayer) * 100
  return { label: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`, positive: pct >= 0 }
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
]

// ── PropietarioDashboard ───────────────────────────────────────────────────

export function PropietarioDashboard() {
  const session   = useSyncExternalStore(noopSubscribe, getSession, () => null)
  const today     = useSyncExternalStore(noopSubscribe, formatToday, () => "")
  const firstName = session?.nombre?.split(" ")[0] ?? ""

  const searchParams = useSearchParams()
  const sedeParam = searchParams.get("sede")
  const idSede = sedeParam ? parseInt(sedeParam, 10) : null

  const [resumen,        setResumen]        = useState<ResumenHoy | null>(null)
  const [ventas,         setVentas]         = useState<VentaReciente[]>([])
  const [productos,      setProductos]      = useState<TopProducto[]>([])
  const [equipo,         setEquipo]         = useState<EmpleadoRendimiento[]>([])
  const [empleadosMeta,  setEmpleadosMeta]  = useState<EmpleadoVsMeta[]>([])

  const [loadingKpi,       setLoadingKpi]       = useState(true)
  const [loadingVentas,    setLoadingVentas]     = useState(true)
  const [loadingProductos, setLoadingProductos]  = useState(true)
  const [loadingEquipo,    setLoadingEquipo]     = useState(true)
  const [loadingMeta,      setLoadingMeta]       = useState(true)

  const [errorKpi,       setErrorKpi]       = useState(false)
  const [errorVentas,    setErrorVentas]    = useState(false)
  const [errorProductos, setErrorProductos] = useState(false)
  const [errorEquipo,    setErrorEquipo]    = useState(false)

  useEffect(() => {
    getResumenHoy(idSede)
      .then(setResumen).catch(() => setErrorKpi(true))
      .finally(() => setLoadingKpi(false))
    getVentasRecientes(idSede)
      .then(setVentas).catch(() => setErrorVentas(true))
      .finally(() => setLoadingVentas(false))
    getTopProductos(idSede)
      .then(setProductos).catch(() => setErrorProductos(true))
      .finally(() => setLoadingProductos(false))
    getEmpleadosRendimiento()
      .then(setEquipo).catch(() => setErrorEquipo(true))
      .finally(() => setLoadingEquipo(false))
    getEmpleadosVsMetaHoy(idSede)
      .then(setEmpleadosMeta).catch(() => undefined)
      .finally(() => setLoadingMeta(false))
  }, [idSede])

  const ingresosHoyDelta = resumen ? pctDelta(resumen.ingresos_total_hoy, resumen.ingresos_total_ayer) : null
  const ingresosMesDelta = resumen ? pctDelta(resumen.ingresos_mes, resumen.ingresos_mes_ant) : null

  const maxEquipo = Math.max(...equipo.map((e) => e.ingresos_hoy), 0)

  return (
    <main className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">

        {/* Header */}
        <BlurFade delay={0} duration={0.4}>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h1 className="text-2xl font-semibold text-text-heading sm:text-3xl">
              Bienvenido{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1 text-sm capitalize text-gray-400">{today}</p>
            {session?.sede && (
              <p className="mt-1 text-sm font-medium text-violet-700">{session.sede}</p>
            )}
          </div>
        </BlurFade>

        {/* KPIs */}
        <BlurFade delay={0.08} duration={0.35}>
          <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">

            {/* Ingresos hoy */}
            <div className="rounded-xl border border-white/5 bg-linear-to-br from-[#020617] to-[#131B2E] p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-on-dark">Ingresos hoy</p>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold tabular-nums text-white">
                {loadingKpi
                  ? <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-white/20" />
                  : (errorKpi || !resumen) ? "?" : <>S/ <NumberTicker value={resumen.ingresos_total_hoy} decimalPlaces={2} /></>}
              </p>
              {!loadingKpi && !errorKpi && ingresosHoyDelta && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={cn("flex items-center gap-0.5 text-xs font-semibold", ingresosHoyDelta.positive ? "text-green-400" : "text-red-400")}>
                    {ingresosHoyDelta.positive ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {ingresosHoyDelta.label}
                  </span>
                  <span className="text-xs text-text-on-dark">vs ayer</span>
                </div>
              )}
              {!loadingKpi && !errorKpi && resumen && (
                <p className="mt-1 text-[10px] text-text-on-dark">ventas + reparaciones</p>
              )}
            </div>

            {/* Ingresos mes */}
            <div className="rounded-xl border border-white/5 bg-linear-to-br from-blue-600 to-blue-700 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Ingresos del mes</p>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold tabular-nums text-white">
                {loadingKpi
                  ? <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-white/20" />
                  : (errorKpi || !resumen) ? "?" : <>S/ <NumberTicker value={resumen.ingresos_mes} decimalPlaces={2} /></>}
              </p>
              {!loadingKpi && !errorKpi && ingresosMesDelta && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={cn("flex items-center gap-0.5 text-xs font-semibold", ingresosMesDelta.positive ? "text-blue-300" : "text-red-400")}>
                    {ingresosMesDelta.positive ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {ingresosMesDelta.label}
                  </span>
                  <span className="text-xs text-blue-200">vs mes ant.</span>
                </div>
              )}
            </div>

            {/* Ticket promedio */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ticket promedio</p>
              <p className="mt-3 text-3xl font-extrabold tabular-nums text-text-heading">
                {loadingKpi
                  ? <span className="inline-block h-8 w-20 animate-pulse rounded-md bg-gray-200" />
                  : (errorKpi || !resumen) ? "?" : <>S/ <NumberTicker value={resumen.ticket_promedio} decimalPlaces={2} /></>}
              </p>
              <p className="mt-1 text-xs text-gray-400">por venta</p>
            </div>

            {/* Transacciones hoy */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Transacciones hoy</p>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <Users className="h-4 w-4 text-gray-900" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold tabular-nums text-text-heading">
                {loadingKpi
                  ? <span className="inline-block h-8 w-10 animate-pulse rounded-md bg-gray-200" />
                  : (errorKpi || !resumen) ? "?" : <NumberTicker value={resumen.transacciones_hoy} />}
              </p>
              {!loadingKpi && !errorKpi && resumen && (
                <p className="mt-1 text-xs text-gray-400">
                  {resumen.ventas_hoy} venta{resumen.ventas_hoy !== 1 ? "s" : ""} · {resumen.transacciones_hoy - resumen.ventas_hoy} reparac.
                </p>
              )}
            </div>
          </section>
        </BlurFade>

        {/* Desglose + Equipo */}
        <BlurFade delay={0.16} duration={0.35}>
          <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">

            {/* Desglose fuente de ingresos */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Fuente de ingresos · hoy</h2>
              {loadingKpi ? (
                <div className="space-y-4 animate-pulse">
                  {[0, 1].map((i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-2">
                        <div className="h-3 w-24 rounded bg-gray-100" />
                        <div className="h-3 w-16 rounded bg-gray-100" />
                      </div>
                      <div className="h-2 rounded-full bg-gray-100" />
                      <div className="h-2.5 w-40 rounded bg-gray-100 mt-1.5" />
                    </div>
                  ))}
                </div>
              ) : errorKpi ? (
                <p className="text-sm text-red-400">Error al cargar datos.</p>
              ) : resumen && resumen.ingresos_total_hoy > 0 ? (
                <div className="space-y-5">
                  {[
                    { label: "🛒 Ventas", valor: resumen.ingresos_ventas_hoy, color: "bg-blue-500", bg: "bg-blue-50", pct: Math.round(resumen.ingresos_ventas_hoy / resumen.ingresos_total_hoy * 100), count: `${resumen.ventas_hoy} transacciones` },
                    { label: "🔧 Reparaciones", valor: resumen.ingresos_reparaciones_hoy, color: "bg-violet-500", bg: "bg-violet-50", pct: Math.round(resumen.ingresos_reparaciones_hoy / resumen.ingresos_total_hoy * 100), count: `${resumen.transacciones_hoy - resumen.ventas_hoy} reparaciones` },
                  ].map((src) => (
                    <div key={src.label}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-700">{src.label}</span>
                        <span className="text-sm font-extrabold tabular-nums text-gray-900">S/ {formatNum(src.valor)}</span>
                      </div>
                      <div className={cn("h-2 rounded-full overflow-hidden", src.bg)}>
                        <motion.div
                          className={cn("h-full rounded-full", src.color)}
                          initial={{ width: 0 }}
                          animate={{ width: `${src.pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{src.pct}% del total · {src.count}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin ingresos hoy.</p>
              )}
            </div>

            {/* Rendimiento del equipo */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-bold text-gray-900">Rendimiento del equipo · hoy</h2>
                <span className="ml-auto text-[10px] font-semibold uppercase text-gray-400">Ingresos · Mejor día</span>
              </div>
              {loadingEquipo ? (
                <div>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-gray-100" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-28 rounded bg-gray-100" />
                          <div className="h-2.5 w-36 rounded bg-gray-100" />
                        </div>
                        <div className="h-4 w-16 rounded bg-gray-100" />
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : errorEquipo ? (
                <p className="p-4 text-sm text-red-400">Error al cargar el equipo.</p>
              ) : equipo.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No hay datos del equipo para hoy.</p>
              ) : (
                <div>
                  {equipo.map((emp, i) => (
                    <RendimientoRow
                      key={emp.id_empleado}
                      emp={emp}
                      index={i}
                      maxHoy={maxEquipo}
                      isTop={i === 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </BlurFade>

        {/* Ventas recientes + Top productos */}
        <BlurFade delay={0.24} duration={0.35}>
          <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">

            {/* Ventas recientes */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-bold text-gray-900">Ventas recientes</h2>
                <p className="mt-0.5 text-xs text-gray-400">Últimas transacciones de la sede</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["Hora", "Cliente", "Vendedor", "Total S/"].map((h) => (
                        <th key={h} className={cn("px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400", h === "Total S/" ? "text-right" : "text-left")}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingVentas ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-5 py-4"><div className="h-3 w-10 rounded bg-gray-100" /></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 shrink-0 rounded-full bg-gray-100" />
                              <div className="h-3 w-28 rounded bg-gray-100" />
                            </div>
                          </td>
                          <td className="px-5 py-4"><div className="h-3 w-20 rounded bg-gray-100" /></td>
                          <td className="px-5 py-4"><div className="h-3 w-14 rounded bg-gray-100 ml-auto" /></td>
                        </tr>
                      ))
                    ) : errorVentas ? (
                      <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-red-400">Error al cargar ventas.</td></tr>
                    ) : ventas.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">Sin ventas hoy.</td></tr>
                    ) : (
                      ventas.map((v, i) => (
                        <motion.tr
                          key={v.id_venta}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.2 }}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-sm tabular-nums text-gray-400">{v.hora}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                {v.cliente ? initials(v.cliente) : "AN"}
                              </div>
                              <span className="text-sm font-medium text-gray-900">{v.cliente ?? "Anónimo"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-400">{v.vendedor}</td>
                          <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums text-gray-900">
                            S/{formatNum(v.total)}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top productos */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-bold text-gray-900">Top productos · mes</h2>
                <p className="mt-0.5 text-xs text-gray-400">Por unidades vendidas</p>
              </div>
              <div>
                {loadingProductos ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 animate-pulse">
                      <div className="h-4 w-4 rounded bg-gray-100 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 rounded bg-gray-100" />
                        <div className="h-1.5 rounded-full bg-gray-100" />
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <div className="h-3 w-12 rounded bg-gray-100" />
                        <div className="h-2.5 w-10 rounded bg-gray-100" />
                      </div>
                    </div>
                  ))
                ) : errorProductos ? (
                  <p className="p-5 text-sm text-red-400">Error al cargar productos.</p>
                ) : productos.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400">Sin ventas este mes.</p>
                ) : (
                  productos.map((p, i) => (
                    <motion.div
                      key={p.id_item}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                      className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-sm font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-blue-50 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${p.pct}%` }}
                            transition={{ delay: i * 0.05 + 0.2, duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-gray-900">{p.unidades} uds</p>
                        <p className="text-xs text-gray-400">S/{formatNum(p.ingresos)}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

          </section>
        </BlurFade>

        {/* Rendimiento vs Meta */}
        {!loadingMeta && empleadosMeta.length > 0 && (
          <BlurFade delay={0.32} duration={0.35}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Rendimiento vs Meta Hoy
              </h3>
              <div className="divide-y divide-gray-100">
                {empleadosMeta.map((emp) => {
                  const pct = Math.min(Math.round((Number(emp.total_hoy) / Number(emp.meta_ventas_diaria)) * 100), 100)
                  const hora = new Date().getHours()
                  const bajaMeta = Number(emp.total_hoy) < Number(emp.meta_ventas_diaria) && hora >= 18
                  return (
                    <div
                      key={emp.id_empleado}
                      className={cn(
                        "flex items-center justify-between py-2.5",
                        bajaMeta ? "bg-red-50 dark:bg-red-900/10 -mx-5 px-5" : "",
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{emp.nombre_completo}</p>
                        <p className="text-xs text-gray-400 capitalize">{emp.nombre_rol}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          S/ {Number(emp.total_hoy).toFixed(0)}
                          <span className="font-normal text-gray-400"> / {Number(emp.meta_ventas_diaria).toFixed(0)}</span>
                        </p>
                        <p className={cn("text-xs", bajaMeta ? "text-red-500" : "text-gray-400")}>
                          {pct}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </BlurFade>
        )}

      </div>
    </main>
  )
}
