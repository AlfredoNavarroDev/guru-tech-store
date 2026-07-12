"use client"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import type { EmpleadoRendimiento } from "@/lib/api/empleados"

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
]

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

function formatMes(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" })
}

export function RendimientoRow({
  emp,
  index,
  maxHoy,
  isTop,
}: {
  emp: EmpleadoRendimiento
  index: number
  maxHoy: number
  isTop: boolean
}) {
  const pct = maxHoy > 0 ? (emp.ingresos_hoy / maxHoy) * 100 : 0
  const inactive = emp.ingresos_hoy === 0
  const barColor = emp.rol_nombre === "vendedor" ? "bg-blue-500" : "bg-violet-500"

  return (
    <motion.div
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.2 }}
      className="px-4 py-3 border-b border-gray-50 last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold",
            inactive ? "bg-gray-100 text-gray-400" : AVATAR_COLORS[index % AVATAR_COLORS.length],
          )}>
            {initials(emp.nombre_completo)}
          </div>
          {isTop && !inactive && (
            <span className="absolute -bottom-1 -right-1 text-[11px]">🥇</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold truncate", inactive ? "text-gray-400" : "text-gray-900")}>
            {emp.nombre_completo}
          </p>
          {emp.fecha_mejor_dia_mes ? (
            <p className="text-[11px] text-gray-400">
              Mejor día del mes:{" "}
              <span className="font-semibold text-gray-600">S/ {emp.ingresos_mejor_dia_mes.toFixed(2)}</span>
              {" · "}{formatMes(emp.fecha_mejor_dia_mes)}
            </p>
          ) : (
            <p className="text-[11px] text-gray-300">Sin actividad este mes</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {inactive ? (
            <p className="text-sm font-semibold text-gray-300">S/ 0</p>
          ) : (
            <p className={cn("text-base font-extrabold tabular-nums", emp.rol_nombre === "vendedor" ? "text-blue-700" : "text-violet-700")}>
              S/ {emp.ingresos_hoy.toFixed(2)}
            </p>
          )}
          <p className={cn("text-[10px] font-semibold", inactive ? "text-gray-300" : "text-emerald-500")}>
            {inactive ? "sin actividad" : "↑ hoy"}
          </p>
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", inactive ? "bg-gray-200" : barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: index * 0.06 + 0.2, duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  )
}

export function RendimientoCol({
  title,
  color,
  empleados,
}: {
  title: string
  color: "blue" | "purple"
  empleados: EmpleadoRendimiento[]
}) {
  const dot = color === "blue" ? "bg-blue-500" : "bg-violet-500"
  const maxHoy = Math.max(...empleados.map((e) => e.ingresos_hoy), 0)

  if (empleados.length === 0) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <span className="ml-auto text-[10px] font-semibold uppercase text-gray-400">Hoy · Mejor día del mes</span>
      </div>
      <div>
        {empleados.map((emp, i) => (
          <RendimientoRow
            key={emp.id_empleado}
            emp={emp}
            index={i}
            maxHoy={maxHoy}
            isTop={i === 0}
          />
        ))}
      </div>
    </div>
  )
}
