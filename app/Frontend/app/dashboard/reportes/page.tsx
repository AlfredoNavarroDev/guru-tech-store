// app/Frontend/app/dashboard/reportes/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { BarChart2, Download, TrendingUp, Wrench, ShoppingBag, Users, Package } from "lucide-react"
import { motion } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { DatePicker } from "@/components/ui/date-picker"
import { cn, formatNum } from "@/lib/utils"
import {
  getReportes,
  getReportePdf,
  type ReporteData,
  type ReporteDia,
  type ReporteEmpleado,
  type ReportePdfTipo,
} from "@/lib/api/propietario"

// ── Helpers ──────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function firstDayOfMonth(): string {
  const d = new Date()
  return localDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
}

function today(): string {
  return localDateStr(new Date())
}

const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]

function formatDateEs(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1]} ${y}`
}

function shortDateEs(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${parseInt(d)} ${MONTHS_ES[parseInt(m) - 1]}`
}

function exportCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Bar chart ────────────────────────────────────────────────────────────────

const CHART_H = 160

function BarSpark({ dias }: { dias: ReporteDia[] }) {
  if (dias.length === 0) return <p className="text-xs text-gray-400 mt-3">Sin datos</p>

  const max = Math.max(...dias.map((d) => d.ingresos), 1)
  const mid = max / 2
  const showEvery = dias.length > 20 ? 4 : dias.length > 10 ? 2 : 1

  return (
    <div className="mt-4 flex gap-2">
      {/* Y-axis */}
      <div className="flex flex-col justify-between items-end shrink-0 pb-6 text-[10px] text-gray-400 tabular-nums" style={{ height: CHART_H + 24 }}>
        <span>S/{formatNum(max)}</span>
        <span>S/{formatNum(mid)}</span>
        <span>0</span>
      </div>

      {/* Bars + X-axis */}
      <div className="flex-1 flex flex-col">
        {/* Grid + bars */}
        <div className="relative flex items-end gap-px" style={{ height: CHART_H }}>
          {/* Grid lines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-full border-t border-gray-100" />
            ))}
          </div>

          {dias.map((d, i) => {
            const pct = Math.max((d.ingresos / max) * 100, d.ingresos > 0 ? 1 : 0)
            return (
              <div
                key={d.fecha}
                className="group relative flex-1 h-full"
              >
                {/* Bar */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 rounded-t bg-[#06B6D4] group-hover:bg-cyan-400 transition-colors"
                  style={{ height: `${pct}%`, minHeight: d.ingresos > 0 ? 2 : 0 }}
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ duration: 0.4, delay: i * 0.01, ease: "easeOut" }}
                />

                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex z-20 flex-col items-center">
                  <div className="rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] text-white whitespace-nowrap shadow-xl">
                    <p className="font-semibold">{shortDateEs(d.fecha)}</p>
                    <p className="text-cyan-400">S/ {formatNum(d.ingresos)}</p>
                    {d.total_ventas > 0 && <p className="text-gray-400">{d.total_ventas} venta{d.total_ventas !== 1 ? "s" : ""}</p>}
                  </div>
                  <div className="w-2 h-2 rotate-45 bg-gray-900 -mt-1" />
                </div>
              </div>
            )
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex gap-px mt-1.5">
          {dias.map((d, i) => (
            <div key={d.fecha} className="flex-1 flex justify-center overflow-hidden">
              {i % showEvery === 0 && (
                <span className="text-[9px] text-gray-400 leading-none">{shortDateEs(d.fecha)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", color)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  )
}

// ── Tab ──────────────────────────────────────────────────────────────────────

type Tab = "ventas" | "reparaciones" | "compras" | "empleados" | "inventario"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "ventas",       label: "Ventas",       icon: TrendingUp   },
  { id: "reparaciones", label: "Reparaciones", icon: Wrench       },
  { id: "compras",      label: "Compras",      icon: ShoppingBag  },
  { id: "empleados",    label: "Empleados",    icon: Users        },
  { id: "inventario",   label: "Inventario",   icon: Package      },
]

// ── Section components ────────────────────────────────────────────────────────

function VentasSection({ data }: { data: ReporteData }) {
  const totalIngresos = data.ventas.reduce((s, d) => s + d.ingresos, 0)
  const totalVentas   = data.ventas.reduce((s, d) => s + d.total_ventas, 0)

  function handleExport() {
    exportCsv("ventas.csv", [
      ["Fecha", "Ventas", "Ingresos (S/)"],
      ...data.ventas.map((d) => [d.fecha, String(d.total_ventas), d.ingresos.toFixed(2)]),
    ])
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Ventas · {formatDateEs(data.desde)} — {formatDateEs(data.hasta)}</h3>
        <button onClick={handleExport} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          <Download className="h-3 w-3" />
          CSV
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label="Total ventas"    value={String(totalVentas)}            icon={TrendingUp} color="bg-gradient-to-br from-[#020617] to-[#131B2E] border-white/5" />
        <KpiCard label="Ingresos"        value={`S/ ${formatNum(totalIngresos)}`} icon={TrendingUp} color="bg-gradient-to-br from-[#020617] to-[#131B2E] border-white/5" />
        <KpiCard label="Ticket promedio" value={totalVentas > 0 ? `S/ ${formatNum(totalIngresos / totalVentas)}` : "–"} icon={TrendingUp} color="bg-gradient-to-br from-[#020617] to-[#0f172a] border-white/5" />
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ingresos por día</p>
        <BarSpark dias={data.ventas} />
      </div>
    </div>
  )
}

function ReparacionesSection({ data }: { data: ReporteData }) {
  const totalReps     = data.reparaciones.reduce((s, r) => s + r.total, 0)
  const totalIngresos = data.reparaciones.reduce((s, r) => s + r.ingresos, 0)

  function handleExport() {
    exportCsv("reparaciones.csv", [
      ["Estado", "Total", "Ingresos (S/)"],
      ...data.reparaciones.map((r) => [r.estado, String(r.total), r.ingresos.toFixed(2)]),
    ])
  }

  const ESTADO_COLOR: Record<string, string> = {
    "en_revision":  "bg-yellow-500",
    "aprobado":     "bg-blue-500",
    "en_progreso":  "bg-violet-500",
    "terminado":    "bg-emerald-500",
    "entregado":    "bg-green-500",
    "cancelado":    "bg-red-400",
  }

  const maxTotal = Math.max(...data.reparaciones.map((r) => r.total), 1)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Reparaciones · {formatDateEs(data.desde)} — {formatDateEs(data.hasta)}</h3>
        <button onClick={handleExport} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          <Download className="h-3 w-3" />
          CSV
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total reparaciones" value={String(totalReps)}              icon={Wrench} color="bg-gradient-to-br from-[#020617] to-[#131B2E] border-white/5" />
        <KpiCard label="Ingresos"           value={`S/ ${formatNum(totalIngresos)}`} icon={Wrench} color="bg-gradient-to-br from-[#020617] to-[#131B2E] border-white/5" />
      </div>
      {data.reparaciones.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Por estado</p>
          {data.reparaciones.map((r) => {
            const pct = Math.round((r.total / maxTotal) * 100)
            const color = ESTADO_COLOR[r.estado] ?? "bg-gray-400"
            return (
              <div key={r.estado}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium capitalize text-gray-700">{r.estado.replace(/_/g, " ")}</span>
                  <span className="text-sm font-bold tabular-nums text-gray-900">{r.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ComprasSection({ data }: { data: ReporteData }) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-gray-900">Compras · {formatDateEs(data.desde)} — {formatDateEs(data.hasta)}</h3>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total órdenes" value={String(data.compras.total_compras)}          icon={ShoppingBag} color="bg-gradient-to-br from-[#020617] to-[#131B2E] border-white/5" />
        <KpiCard label="Monto total"   value={`S/ ${formatNum(data.compras.monto_total)}`} icon={ShoppingBag} color="bg-gradient-to-br from-[#020617] to-[#131B2E] border-white/5" />
      </div>
    </div>
  )
}

function EmpleadosSection({ data }: { data: ReporteData }) {
  function handleExport() {
    exportCsv("empleados.csv", [
      ["Empleado", "Rol", "Ventas (S/)", "Reparaciones (S/)"],
      ...data.empleados.map((e) => [e.nombre_completo, e.nombre_rol, e.total_ventas.toFixed(2), e.total_reparaciones.toFixed(2)]),
    ])
  }

  const AVATAR_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ]

  function initials(name: string) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
  }

  const maxTotal = Math.max(...data.empleados.map((e) => e.total_ventas + e.total_reparaciones), 1)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Rendimiento · {formatDateEs(data.desde)} — {formatDateEs(data.hasta)}</h3>
        <button onClick={handleExport} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          <Download className="h-3 w-3" />
          CSV
        </button>
      </div>
      {data.empleados.length === 0 ? (
        <p className="text-sm text-gray-400">Sin actividad en el período.</p>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-50">
          {data.empleados.map((emp, i) => {
            const total = emp.total_ventas + emp.total_reparaciones
            const pct = Math.round((total / maxTotal) * 100)
            return (
              <div key={emp.nombre_completo + i} className="flex items-center gap-3 px-5 py-3.5">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                  {initials(emp.nombre_completo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{emp.nombre_completo}</p>
                    <p className="text-sm font-bold tabular-nums text-gray-900 shrink-0 ml-2">S/{formatNum(total)}</p>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#06B6D4]"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.04, duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 capitalize">{emp.nombre_rol}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InventarioSection({ data }: { data: ReporteData }) {
  const pctBajo = data.inventario.total_items > 0
    ? Math.round((data.inventario.items_bajo_stock / data.inventario.total_items) * 100)
    : 0

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-gray-900">Inventario (estado actual)</h3>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total ítems"    value={String(data.inventario.total_items)}      icon={Package} color="bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-700/20" />
        <KpiCard label="Bajo stock"     value={String(data.inventario.items_bajo_stock)}  icon={Package} color={cn("border", data.inventario.items_bajo_stock > 0 ? "bg-gradient-to-br from-red-600 to-red-700 border-red-700/20" : "bg-gradient-to-br from-[#020617] to-[#131B2E] border-white/5")} />
      </div>
      {data.inventario.total_items > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Stock saludable</p>
          <div className="h-3 rounded-full bg-red-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${100 - pctBajo}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">{100 - pctBajo}% ítems con stock normal</p>
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const searchParams = useSearchParams()
  const sedeParam = searchParams.get("sede")
  const idSede = sedeParam ? parseInt(sedeParam, 10) : null

  const [tab,       setTab]       = useState<Tab>("ventas")
  const [desde,     setDesde]     = useState(firstDayOfMonth())
  const [hasta,     setHasta]     = useState(today())
  const [applied,   setApplied]   = useState({ desde: firstDayOfMonth(), hasta: today() })
  const [data,      setData]      = useState<ReporteData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [loadingPdf,     setLoadingPdf]     = useState(false)
  const [loadingResumen, setLoadingResumen] = useState(false)

  const handleExportPdf = useCallback(async (tipo: ReportePdfTipo) => {
    const isResumen = tipo === 'ventas-reparaciones'
    if (isResumen) setLoadingResumen(true)
    else setLoadingPdf(true)
    try {
      const url = await getReportePdf(tipo, {
        fecha_desde: applied.desde,
        fecha_hasta: applied.hasta,
        id_sede: idSede,
      })
      window.open(url, '_blank')
    } catch {
      setError('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      if (isResumen) setLoadingResumen(false)
      else setLoadingPdf(false)
    }
  }, [applied, idSede])

  const fetchData = useCallback(async (fd: string, fh: string, sede: number | null) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getReportes({ id_sede: sede, fecha_desde: fd, fecha_hasta: fh })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reportes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData(applied.desde, applied.hasta, idSede)
  }, [applied, idSede, fetchData])

  useEffect(() => {
    if (desde && hasta && hasta < desde) setHasta(desde)
  }, [desde])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    setApplied({ desde, hasta })
  }

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8 print:p-4">
      {/* Header */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#020617]">
              <BarChart2 className="h-4 w-4 text-lime" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-heading">Reportes</h1>
              <p className="text-sm text-gray-500">Análisis por período y sede</p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {(tab === 'ventas' || tab === 'reparaciones' || tab === 'compras') && (
              <button
                onClick={() => void handleExportPdf(tab as ReportePdfTipo)}
                disabled={loadingPdf}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPdf ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exportar PDF
              </button>
            )}
            <button
              onClick={() => void handleExportPdf('ventas-reparaciones')}
              disabled={loadingResumen}
              className="flex items-center gap-2 rounded-xl bg-[#020617] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f172a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingResumen ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <BarChart2 className="h-4 w-4" />
              )}
              Resumen ejecutivo
            </button>
          </div>
        </div>
      </BlurFade>

      {/* Filters */}
      <BlurFade delay={0.06} duration={0.4}>
        <form onSubmit={handleFilter} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Desde</label>
            <DatePicker value={desde || undefined} onChange={(v) => setDesde(v ?? "")} placeholder="Fecha inicio" maxDate={today()} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Hasta</label>
            <DatePicker value={hasta || undefined} onChange={(v) => setHasta(v ?? "")} placeholder="Fecha fin" align="right" minDate={desde || undefined} maxDate={today()} />
          </div>
          <button
            type="submit"
            className="flex h-9 items-center gap-2 rounded-xl bg-[#020617] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
          >
            Aplicar
          </button>
        </form>
      </BlurFade>

      {/* Tabs */}
      <BlurFade delay={0.1} duration={0.4}>
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm print:hidden">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors",
                tab === id
                  ? "bg-[#020617] text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </BlurFade>

      {/* Content */}
      <BlurFade delay={0.16} duration={0.4}>
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-gray-200" />)}
            </div>
            <div className="h-48 rounded-2xl bg-gray-100" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              onClick={() => fetchData(applied.desde, applied.hasta, idSede)}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {tab === "ventas"       && <VentasSection       data={data} />}
            {tab === "reparaciones" && <ReparacionesSection data={data} />}
            {tab === "compras"      && <ComprasSection      data={data} />}
            {tab === "empleados"    && <EmpleadosSection    data={data} />}
            {tab === "inventario"   && <InventarioSection   data={data} />}
          </>
        )}
      </BlurFade>
    </div>
  )
}
