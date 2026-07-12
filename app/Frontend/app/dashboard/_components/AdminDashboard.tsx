"use client"

import { useEffect, useSyncExternalStore, useState } from "react"
import { TrendingUp, Users } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { getSession } from "@/lib/api/auth"
import { cn } from "@/lib/utils"
import {
  getEmpleados,
  getEmpleadosRendimiento,
  type Empleado,
  type EmpleadoRendimiento,
} from "@/lib/api/empleados"
import { RendimientoCol } from "./shared/RendimientoRow"

// ── Helpers ────────────────────────────────────────────────────────────────

function noopSubscribe() { return () => undefined }

function formatToday() {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────


function NominaCard({
  label,
  total,
  count,
  cadencia,
  color,
}: {
  label: string
  total: number
  count: number
  cadencia: string
  color: "blue" | "purple" | "green"
}) {
  const styles = {
    blue:   { bg: "bg-blue-50",   border: "border-blue-200",   label: "text-blue-600",  value: "text-blue-900"  },
    purple: { bg: "bg-violet-50", border: "border-violet-200", label: "text-violet-600", value: "text-violet-900" },
    green:  { bg: "bg-emerald-50",border: "border-emerald-200",label: "text-emerald-600",value: "text-emerald-900"},
  }[color]

  return (
    <div className={cn("rounded-xl border p-4 flex items-center justify-between gap-3", styles.bg, styles.border)}>
      <div>
        <p className={cn("text-[10px] font-bold uppercase tracking-wider", styles.label)}>{label}</p>
        <p className={cn("mt-1 text-xl font-extrabold tabular-nums", styles.value)}>
          S/ <NumberTicker value={total} decimalPlaces={2} />
        </p>
      </div>
      <div className="text-right text-xs">
        <p className={cn("font-semibold", styles.label)}>{count} empleados</p>
        <p className="text-gray-400">{cadencia}</p>
      </div>
    </div>
  )
}

// ── AdminDashboard ─────────────────────────────────────────────────────────

export function AdminDashboard() {
  const session   = useSyncExternalStore(noopSubscribe, getSession, () => null)
  const today     = useSyncExternalStore(noopSubscribe, formatToday, () => "")
  const firstName = session?.nombre?.split(" ")[0] ?? ""

  const [empleados, setEmpleados]       = useState<Empleado[]>([])
  const [rendimiento, setRendimiento]   = useState<EmpleadoRendimiento[]>([])
  const [loadingEmp, setLoadingEmp]     = useState(true)
  const [loadingRend, setLoadingRend]   = useState(true)
  const [errorEmp, setErrorEmp]         = useState(false)
  const [errorRend, setErrorRend]       = useState(false)

  useEffect(() => {
    getEmpleados({ limit: 500 })
      .then((r) => setEmpleados(r.items))
      .catch(() => setErrorEmp(true))
      .finally(() => setLoadingEmp(false))

    getEmpleadosRendimiento()
      .then(setRendimiento)
      .catch(() => setErrorRend(true))
      .finally(() => setLoadingRend(false))
  }, [])

  // ── KPIs from empleados ─────────────────────────────────────────────────
  const total     = empleados.length
  const activos   = empleados.filter((e) => e.estado === "activo").length
  const inactivos = total - activos

  const activosConSueldoVal = empleados.filter((e) => e.estado === "activo" && e.sueldo_soles !== null)
  const sueldoPromedio = activosConSueldoVal.length > 0
    ? activosConSueldoVal.reduce((acc, e) => acc + Number(e.sueldo_soles ?? 0), 0) / activosConSueldoVal.length
    : 0

  // ── Nomina por ciclo ────────────────────────────────────────────────────
  const sinSueldo = empleados.filter((e) => e.estado === "activo" && e.sueldo_soles === null).length

  function nominaPorFrecuencia(freq: string) {
    return activosConSueldoVal
      .filter((e) => e.frecuencia_pago === freq)
      .reduce((acc, e) => acc + Number(e.sueldo_soles ?? 0), 0)
  }

  const nomina = {
    semanal:   { total: nominaPorFrecuencia("semanal"),   count: activosConSueldoVal.filter((e) => e.frecuencia_pago === "semanal").length },
    quincenal: { total: nominaPorFrecuencia("quincenal"), count: activosConSueldoVal.filter((e) => e.frecuencia_pago === "quincenal").length },
    mensual:   { total: nominaPorFrecuencia("mensual"),   count: activosConSueldoVal.filter((e) => e.frecuencia_pago === "mensual").length },
  }

  // ── Rendimiento ─────────────────────────────────────────────────────────
  const vendedores = rendimiento.filter((e) => e.rol_nombre === "vendedor")
  const tecnicos   = rendimiento.filter((e) => e.rol_nombre === "tecnico")

  return (
    <main className="min-h-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">

        {/* Header */}
        <BlurFade delay={0} duration={0.4}>
          <section className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h1 className="text-2xl font-semibold text-gray-950 sm:text-3xl">
                Bienvenido{firstName ? `, ${firstName}` : ""}
              </h1>
              <p className="mt-1 text-sm capitalize text-gray-400">{today}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
                Gestiona empleados de sede, contraseñas y estados de acceso desde un punto de control.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Sede activa</p>
              <h2 className="mt-1 text-xl font-bold text-violet-700">{session?.sede ?? "—"}</h2>
              <p className="mt-2 text-sm text-gray-400">Las acciones están limitadas a esta sede.</p>
            </div>
          </section>
        </BlurFade>

        {/* KPIs + tasa */}
        <BlurFade delay={0.08} duration={0.35}>
          <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {/* Total */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total empleados</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-gray-950">
                {loadingEmp
                  ? <span className="inline-block h-8 w-12 animate-pulse rounded-md bg-gray-200" />
                  : errorEmp ? "?" : <NumberTicker value={total} />}
              </p>
              <p className="mt-1 text-xs text-gray-400">en esta sede</p>
            </div>
            {/* Activos */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Activos</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-emerald-800">
                {loadingEmp
                  ? <span className="inline-block h-8 w-10 animate-pulse rounded-md bg-emerald-200" />
                  : errorEmp ? "?" : <NumberTicker value={activos} />}
              </p>
              <p className="mt-1 text-xs text-emerald-500">con acceso vigente</p>
            </div>
            {/* Inactivos */}
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Inactivos</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-red-800">
                {loadingEmp
                  ? <span className="inline-block h-8 w-10 animate-pulse rounded-md bg-red-200" />
                  : errorEmp ? "?" : <NumberTicker value={inactivos} />}
              </p>
              <p className="mt-1 text-xs text-red-400">acceso revocado</p>
            </div>
            {/* Sueldo promedio */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sueldo promedio</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums text-gray-950">
                {loadingEmp
                  ? <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-gray-200" />
                  : errorEmp ? "?" : <>S/ <NumberTicker value={sueldoPromedio} decimalPlaces={2} /></>}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {loadingEmp
                  ? <span className="inline-block h-3 w-36 animate-pulse rounded bg-gray-200" />
                  : errorEmp ? ""
                  : `sobre ${activosConSueldoVal.length} activos con sueldo`}
              </p>
            </div>
          </section>
        </BlurFade>

        {/* Nomina */}
        <BlurFade delay={0.16} duration={0.35}>
          <section>
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-700">Nómina por ciclo de pago</h2>
              {sinSueldo > 0 && (
                <span className="ml-auto rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  ⚠ {sinSueldo} sin sueldo registrado
                </span>
              )}
            </div>
            {loadingEmp ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { bg: "bg-blue-50",    border: "border-blue-200",    bar: "bg-blue-200",    sub: "bg-blue-100"    },
                  { bg: "bg-violet-50",  border: "border-violet-200",  bar: "bg-violet-200",  sub: "bg-violet-100"  },
                  { bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-200", sub: "bg-emerald-100" },
                ].map((s, i) => (
                  <div key={i} className={cn("rounded-xl border p-4 flex items-center justify-between gap-3 animate-pulse", s.bg, s.border)}>
                    <div className="space-y-2">
                      <div className={cn("h-2.5 w-14 rounded", s.bar)} />
                      <div className={cn("h-6 w-20 rounded", s.sub)} />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className={cn("h-3 w-20 rounded ml-auto", s.bar)} />
                      <div className={cn("h-2.5 w-14 rounded ml-auto", s.sub)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <NominaCard label="Semanal"   total={nomina.semanal.total}   count={nomina.semanal.count}   cadencia="cada semana"  color="blue"   />
                <NominaCard label="Quincenal" total={nomina.quincenal.total} count={nomina.quincenal.count} cadencia="cada 15 días" color="purple" />
                <NominaCard label="Mensual"   total={nomina.mensual.total}   count={nomina.mensual.count}   cadencia="fin de mes"   color="green"  />
              </div>
            )}
          </section>
        </BlurFade>

        {/* Rendimiento */}
        <BlurFade delay={0.24} duration={0.35}>
          <section>
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-700">Rendimiento del equipo</h2>
            </div>
            {loadingRend ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {[0, 1].map((ci) => (
                  <div key={ci} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                      <div className="h-2 w-2 rounded-full bg-gray-200 animate-pulse" />
                      <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
                      <div className="ml-auto h-2.5 w-28 rounded bg-gray-100 animate-pulse" />
                    </div>
                    {[0, 1, 2].map((ri) => (
                      <div key={ri} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 rounded-full bg-gray-100 animate-pulse" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
                            <div className="h-2.5 w-36 rounded bg-gray-100 animate-pulse" />
                          </div>
                          <div className="shrink-0 space-y-1.5">
                            <div className="h-4 w-14 rounded bg-gray-100 animate-pulse ml-auto" />
                            <div className="h-2.5 w-10 rounded bg-gray-100 animate-pulse ml-auto" />
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-gray-100 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : errorRend ? (
              <p className="text-sm text-red-400">Error al cargar el rendimiento del equipo.</p>
            ) : (vendedores.length === 0 && tecnicos.length === 0) ? (
              <p className="text-sm text-gray-400">No hay vendedores ni técnicos activos en esta sede.</p>
            ) : (
              <div className={cn("grid gap-5", vendedores.length > 0 && tecnicos.length > 0 ? "lg:grid-cols-2" : "")}>
                <RendimientoCol title="Vendedores" color="blue"   empleados={vendedores} />
                <RendimientoCol title="Técnicos"   color="purple" empleados={tecnicos}   />
              </div>
            )}
          </section>
        </BlurFade>

      </div>
    </main>
  )
}
