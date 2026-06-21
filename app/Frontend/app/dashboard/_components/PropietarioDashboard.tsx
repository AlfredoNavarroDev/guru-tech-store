"use client"

import { useSyncExternalStore } from "react"
import {
  TrendingUp,
  ShoppingCart,
  Users,
  ArrowUpRight,
  TrendingDown,
  AlertTriangle,
  Receipt,
  BarChart3,
} from "lucide-react"
import { motion } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { getSession } from "@/lib/api/auth"
import { cn, formatNum } from "@/lib/utils"

// ── Mock data ──────────────────────────────────────────────────────────────
const STATS = {
  ventas_hoy:      23,
  ventas_ayer:     19,
  ingresos_hoy:    3450.00,
  ingresos_ayer:   2890.00,
  ingresos_mes:    45280.00,
  ingresos_mes_ant: 38600.00,
  clientes_hoy:    18,
  clientes_ayer:   14,
  ticket_promedio: 150.00,
}

const VENTAS_RECIENTES = [
  { id: 1041, hora: "11:42", cliente: "Carlos Mendoza",  vendedor: "Ana Torres",   total: 380.00 },
  { id: 1040, hora: "11:15", cliente: "María García",    vendedor: "Luis Pérez",   total: 125.00 },
  { id: 1039, hora: "10:58", cliente: "Anónimo",         vendedor: "Ana Torres",   total: 65.00  },
  { id: 1038, hora: "10:30", cliente: "Pedro Ríos",      vendedor: "José Vargas",  total: 890.00 },
  { id: 1037, hora: "09:55", cliente: "Roberto Vargas",  vendedor: "Luis Pérez",   total: 240.00 },
]

const TOP_PRODUCTOS = [
  { nombre: "Cable USB-C 2m",        sku: "ACC-001", vendidos: 47, ingreso: 940.00,  max: 47 },
  { nombre: "Auriculares JBL T110",  sku: "AUD-012", vendidos: 31, ingreso: 2170.00, max: 47 },
  { nombre: "Cargador 65W GaN",      sku: "ACC-008", vendidos: 28, ingreso: 3360.00, max: 47 },
  { nombre: "Funda iPhone 15 Pro",   sku: "ACC-034", vendidos: 22, ingreso: 1320.00, max: 47 },
  { nombre: "Mouse Logitech M170",   sku: "PER-003", vendidos: 19, ingreso: 2470.00, max: 47 },
]

const EMPLEADOS = [
  { nombre: "Ana Torres",   rol: "Vendedor",   ventas: 9,  ingresos: 1580.00, activo: true  },
  { nombre: "Luis Pérez",   rol: "Vendedor",   ventas: 7,  ingresos: 1120.00, activo: true  },
  { nombre: "José Vargas",  rol: "Vendedor",   ventas: 5,  ingresos: 640.00,  activo: true  },
  { nombre: "Rosa Quispe",  rol: "Vendedor",   ventas: 2,  ingresos: 110.00,  activo: false },
]

const STOCK_ALERTAS = [
  { item: "Cable USB-C 2m",       cantidad: 3,  minimo: 10 },
  { item: "Batería AA Duracell",   cantidad: 5,  minimo: 20 },
  { item: "Cargador 65W GaN",     cantidad: 1,  minimo: 8  },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function noopSubscribe() { return () => undefined }

function formatToday() {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
}

function delta(hoy: number, ayer: number): { label: string; positive: boolean } {
  if (ayer === 0) return { label: hoy > 0 ? "Nuevo" : "–", positive: hoy > 0 }
  const pct = ((hoy - ayer) / ayer) * 100
  return {
    label:    `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`,
    positive: pct >= 0,
  }
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
]

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

// ── PropietarioDashboard ───────────────────────────────────────────────────
export function PropietarioDashboard() {
  const session   = useSyncExternalStore(noopSubscribe, getSession, () => null)
  const today     = useSyncExternalStore(noopSubscribe, formatToday, () => "")
  const firstName = session?.nombre?.split(" ")[0] ?? ""

  const ventasDelta    = delta(STATS.ventas_hoy,    STATS.ventas_ayer)
  const ingresosDelta  = delta(STATS.ingresos_hoy,  STATS.ingresos_ayer)
  const mesDelta       = delta(STATS.ingresos_mes,   STATS.ingresos_mes_ant)
  const clientesDelta  = delta(STATS.clientes_hoy,  STATS.clientes_ayer)

  const KPI_CARDS = [
    {
      label:  "Ventas hoy",
      value:  STATS.ventas_hoy,
      prefix: "",
      dec:    0,
      icon:   ShoppingCart,
      delta:  ventasDelta,
      dark:   true,
    },
    {
      label:  "Ingresos hoy",
      value:  STATS.ingresos_hoy,
      prefix: "S/",
      dec:    2,
      icon:   TrendingUp,
      delta:  ingresosDelta,
      dark:   true,
    },
    {
      label:  "Ingresos del mes",
      value:  STATS.ingresos_mes,
      prefix: "S/",
      dec:    2,
      icon:   BarChart3,
      delta:  mesDelta,
      dark:   false,
    },
    {
      label:  "Clientes atendidos",
      value:  STATS.clientes_hoy,
      prefix: "",
      dec:    0,
      icon:   Users,
      delta:  clientesDelta,
      dark:   false,
    },
  ]

  return (
    <div className="min-h-full bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        {/* Greeting */}
        <BlurFade delay={0} duration={0.35}>
          <div>
            <h2 className="text-3xl font-extrabold text-text-heading">
              Bienvenido{firstName ? `, ${firstName}` : ""}
            </h2>
            <p className="mt-1 text-sm capitalize text-text-muted">{today}</p>
          </div>
        </BlurFade>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KPI_CARDS.map((s, i) => (
            <BlurFade key={s.label} delay={0.06 + i * 0.06} duration={0.35}>
              <div
                className={cn(
                  "rounded-2xl p-5 shadow-sm",
                  s.dark
                    ? "border border-white/5 bg-linear-to-br from-black to-[#131B2E]"
                    : "border border-gray-200 bg-white",
                )}
              >
                <div className="flex items-start justify-between">
                  <p className={cn("text-xs font-semibold uppercase tracking-wider leading-tight pr-2", s.dark ? "text-text-on-dark" : "text-text-muted")}>
                    {s.label}
                  </p>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <s.icon className="h-4 w-4 text-gray-900" />
                  </div>
                </div>
                <p className={cn("mt-3 text-4xl font-extrabold tabular-nums", s.dark ? "text-white" : "text-text-heading")}>
                  {s.prefix}
                  <NumberTicker value={s.value} decimalPlaces={s.dec} />
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={cn("flex items-center gap-0.5 text-xs font-semibold", s.delta.positive ? "text-green-500" : "text-red-400")}>
                    {s.delta.positive
                      ? <ArrowUpRight className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    {s.delta.label}
                  </span>
                  <span className={cn("text-xs", s.dark ? "text-text-on-dark" : "text-text-muted")}>
                    vs ayer
                  </span>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

        {/* Ticket promedio banner */}
        <BlurFade delay={0.32} duration={0.3}>
          <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Ticket promedio hoy</p>
                <p className="text-2xl font-extrabold tabular-nums text-blue-900">
                  S/<NumberTicker value={STATS.ticket_promedio} decimalPlaces={2} />
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-text-muted">Mes anterior</p>
              <p className="text-sm font-bold text-text-heading">S/{formatNum(STATS.ingresos_mes_ant)}</p>
            </div>
          </div>
        </BlurFade>

        {/* Stock alert */}
        {STOCK_ALERTAS.length > 0 && (
          <BlurFade delay={0.36} duration={0.3}>
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                {STOCK_ALERTAS.length} ítem(s) con stock bajo:{" "}
                {STOCK_ALERTAS.map((a) => a.item).join(", ")}.
              </span>
            </div>
          </BlurFade>
        )}

        {/* Main two-column */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Ventas recientes — 2/3 */}
          <BlurFade delay={0.38} duration={0.35} className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm h-full">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-bold text-text-heading">Ventas recientes</h3>
                <p className="mt-0.5 text-xs text-text-muted">Últimas transacciones del día</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["Hora", "Cliente", "Vendedor", "Total S/"].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            "px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                            h === "Total S/" ? "text-right" : "text-left",
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {VENTAS_RECIENTES.map((v, i) => (
                      <motion.tr
                        key={v.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.2 }}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-sm text-text-muted tabular-nums">{v.hora}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                              {v.cliente === "Anónimo" ? "AN" : initials(v.cliente)}
                            </div>
                            <span className="text-sm font-medium text-text-heading">{v.cliente}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-text-muted">{v.vendedor}</td>
                        <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums text-text-heading">
                          S/{formatNum(v.total)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </BlurFade>

          {/* Rendimiento empleados — 1/3 */}
          <BlurFade delay={0.42} duration={0.35}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm h-full">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-bold text-text-heading">Equipo de venta</h3>
                <p className="mt-0.5 text-xs text-text-muted">Ventas del día por empleado</p>
              </div>
              <div className="divide-y divide-gray-50">
                {EMPLEADOS.map((e, i) => (
                  <motion.div
                    key={e.nombre}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.42 + i * 0.06, duration: 0.2 }}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                      {initials(e.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-heading truncate">{e.nombre}</p>
                      <p className="text-xs text-text-muted">
                        {e.ventas} venta{e.ventas !== 1 ? "s" : ""} · S/{formatNum(e.ingresos)}
                      </p>
                    </div>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      e.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400",
                    )}>
                      {e.activo ? "activo" : "inactivo"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>

        {/* Top productos */}
        <BlurFade delay={0.46} duration={0.35}>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-bold text-text-heading">Productos más vendidos</h3>
              <p className="mt-0.5 text-xs text-text-muted">Mes en curso</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["#", "Producto", "SKU", "Unidades", "Participación", "Ingresos S/"].map((h, idx) => (
                      <th
                        key={h}
                        className={cn(
                          "px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                          idx === 0 || idx === 1 || idx === 2 ? "text-left" : "text-right",
                          idx === 4 ? "text-left" : "",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {TOP_PRODUCTOS.map((p, i) => {
                    const pct = Math.round((p.vendidos / p.max) * 100)
                    return (
                      <motion.tr
                        key={p.sku}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.46 + i * 0.05, duration: 0.2 }}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-sm font-bold text-text-muted w-8">{i + 1}</td>
                        <td className="px-5 py-3.5 font-medium text-text-heading max-w-[200px] truncate">{p.nombre}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-text-muted">{p.sku}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-text-heading">{p.vendidos}</td>
                        <td className="px-5 py-3.5 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.5 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                                className="h-full rounded-full bg-blue-500"
                              />
                            </div>
                            <span className="text-xs tabular-nums text-text-muted w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-text-heading">
                          S/{formatNum(p.ingreso)}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </BlurFade>

        {/* Stock crítico */}
        <BlurFade delay={0.5} duration={0.35}>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-bold text-text-heading">Alertas de inventario</h3>
              <p className="mt-0.5 text-xs text-text-muted">Ítems bajo stock mínimo</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {["Ítem", "Stock actual", "Stock mínimo", "Déficit"].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                        i === 0 ? "text-left" : "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {STOCK_ALERTAS.map((a, i) => (
                  <motion.tr
                    key={a.item}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05, duration: 0.2 }}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-text-heading">{a.item}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-rose-600">{a.cantidad}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-text-muted">{a.minimo}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-bold text-rose-700">
                      -{a.minimo - a.cantidad}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlurFade>

      </div>
    </div>
  )
}
