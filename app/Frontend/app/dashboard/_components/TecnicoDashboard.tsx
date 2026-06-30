"use client"

import { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  Wrench,
  Plus,
  CheckCircle2,
  Timer,
  CheckCheck,
  Search,
  AlertCircle,
  ChevronRight,
} from "lucide-react"
import { motion } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSession } from "@/lib/api/auth"
import { cn, fmtFecha, repId } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { getReparaciones, type ReparacionResponse } from "@/lib/api/reparaciones"
import { EstadoBadge, ESTADO_LABEL } from "@/components/tecnico/EstadoBadge"

// ── Constants ──────────────────────────────────────────────────────────────

const FILTROS = [
  { label: "Todos",              db: null },
  { label: "Pendiente",          db: "pendiente" },
  { label: "En reparación",      db: "reparacion" },
  { label: "Listo para entrega", db: "listo" },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function noopSubscribe() { return () => undefined }

function formatToday() {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
}

// ── TecnicoDashboard ───────────────────────────────────────────────────────

export function TecnicoDashboard() {
  const router = useRouter()

  const [reparaciones, setReparaciones] = useState<ReparacionResponse[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [filtroDb, setFiltroDb]         = useState<string | null>(null)
  const [search, setSearch]             = useState("")

  const session   = useSyncExternalStore(noopSubscribe, getSession, () => null)
  const today     = useSyncExternalStore(noopSubscribe, formatToday, () => "")
  const firstName = session?.nombre?.split(" ")[0] ?? ""

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getReparaciones({ limit: 100 })
      setReparaciones(res.items)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando reparaciones")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const activas    = reparaciones.filter((r) => r.estado !== "entregado").length
  const reparando  = reparaciones.filter((r) => r.estado === "reparacion").length
  const listos     = reparaciones.filter((r) => r.estado === "listo").length
  const entregados = reparaciones.filter((r) => r.estado === "entregado").length

  const STAT_CARDS = [
    { label: "Reparaciones activas", value: activas,    icon: Wrench,       sub: "en proceso",            dark: true  },
    { label: "En reparación",        value: reparando,  icon: Timer,        sub: "trabajando",            dark: false },
    { label: "Listos para entrega",  value: listos,     icon: CheckCheck,   sub: "aguardando al cliente", dark: false },
    { label: "Entregados",           value: entregados, icon: CheckCircle2, sub: "completados",           dark: false },
  ]

  const filtered = useMemo(() => {
    let list = reparaciones
    if (filtroDb) list = list.filter((r) => r.estado === filtroDb)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          String(r.id_reparacion).includes(q) ||
          (r.cliente ?? "").toLowerCase().includes(q) ||
          (r.marca ?? "").toLowerCase().includes(q) ||
          (r.modelo ?? "").toLowerCase().includes(q),
      )
    }
    return list
  }, [reparaciones, filtroDb, search])

  return (
    <div className="min-h-full bg-bg-main p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        {/* Greeting + CTA */}
        <BlurFade delay={0} duration={0.35}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-text-heading">
                Bienvenido{firstName ? `, ${firstName}` : ""}
              </h2>
              <p className="mt-1 text-sm capitalize text-text-muted">{today}</p>
            </div>
            <button
              onClick={() => router.push("/dashboard/reparaciones/nueva")}
              className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-[#020617] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
            >
              <Plus className="h-4 w-4" />
              Registrar equipo
            </button>
          </div>
        </BlurFade>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl p-5 shadow-sm",
                    i === 0
                      ? "border border-white/5 bg-linear-to-br from-black to-[#131B2E]"
                      : "border border-gray-200 bg-white",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <Skeleton className={cn("h-3 w-28 rounded-md", i === 0 ? "bg-white/15" : "")} />
                    <Skeleton className={cn("h-8 w-8 rounded-xl shrink-0", i === 0 ? "bg-white/15" : "")} />
                  </div>
                  <Skeleton className={cn("mt-4 h-10 w-16 rounded-md", i === 0 ? "bg-white/15" : "")} />
                  <Skeleton className={cn("mt-2 h-3 w-24 rounded-md", i === 0 ? "bg-white/15" : "")} />
                </div>
              ))
            : STAT_CARDS.map((s, i) => (
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
                      <NumberTicker value={s.value} decimalPlaces={0} />
                    </p>
                    <p className={cn("mt-2 text-xs", s.dark ? "text-text-on-dark" : "text-text-muted")}>
                      {s.sub}
                    </p>
                  </div>
                </BlurFade>
              ))}
        </div>

        {/* Alert listos */}
        {!loading && listos > 0 && (
          <BlurFade delay={0.3} duration={0.3}>
            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              <span>
                {listos} equipo{listos > 1 ? "s" : ""} listo{listos > 1 ? "s" : ""} para entrega.
              </span>
            </div>
          </BlurFade>
        )}

        {/* Table */}
        <BlurFade delay={0.32} duration={0.35}>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text-heading">Reparaciones</h3>
                  <p className="mt-0.5 text-xs text-text-muted">{filtered.length} resultado(s)</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cliente, marca..."
                    className="rounded-xl pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {FILTROS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setFiltroDb(f.db)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                      filtroDb === f.db
                        ? "bg-[#020617] text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {!loading && error && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => void load()}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 hover:bg-red-50"
                >
                  Reintentar
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {!loading && !error && (
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["ID", "Cliente", "Equipo", "Estado", "Ingreso", "Total S/", ""].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted text-left",
                            h === "Total S/" && "text-right",
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-6 w-28 rounded-full" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-14 ml-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-7 w-7 rounded-lg ml-auto" /></td>
                      </tr>
                    ))
                  ) : !error && filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-text-muted">
                        Sin resultados
                      </td>
                    </tr>
                  ) : !error ? (
                    filtered.map((r, i) => (
                      <motion.tr
                        key={r.id_reparacion}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.2 }}
                        onClick={() => router.push(`/dashboard/reparaciones/${r.id_reparacion}`)}
                        className="cursor-pointer hover:bg-blue-50/60 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">
                          {repId(r.id_reparacion)}
                        </td>
                        <td className="px-4 py-3 min-w-[130px]">
                          <div className="font-semibold text-text-heading">{r.cliente ?? "—"}</div>
                          {r.tecnico && (
                            <div className="text-xs text-text-muted">Téc: {r.tecnico}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="font-medium text-text-heading">
                            {[r.marca, r.modelo].filter(Boolean).join(" ") || "—"}
                          </div>
                          {r.imei && (
                            <div className="font-mono text-[10px] text-gray-400">{r.imei}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <EstadoBadge estado={r.estado} />
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                          {fmtFecha(r.fecha_ingreso)}
                          {r.fecha_estimada && (
                            <div className="text-[10px] text-gray-400">
                              Est: {fmtFecha(r.fecha_estimada)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-heading whitespace-nowrap">
                          {r.monto_cotizado != null ? `S/${r.monto_cotizado.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="h-4 w-4 text-gray-300 ml-auto" />
                        </td>
                      </motion.tr>
                    ))
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </BlurFade>

      </div>
    </div>
  )
}
