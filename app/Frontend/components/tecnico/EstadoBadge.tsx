import { cn } from "@/lib/utils"

export const ESTADO_LABEL: Record<string, string> = {
  pendiente:             "Pendiente",
  diagnostico:           "En diagnóstico",
  reparacion:            "En reparación",
  "esperando repuestos": "Esperando repuestos",
  listo:                 "Listo para entrega",
  entregado:             "Entregado",
}

export const ESTADO_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  pendiente:             { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  diagnostico:           { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  reparacion:            { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  "esperando repuestos": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  listo:                 { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  entregado:             { bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-400" },
}

export function EstadoBadge({
  estado,
  size = "sm",
}: {
  estado: string | null
  size?: "sm" | "md"
}) {
  const key = estado ?? "pendiente"
  const s   = ESTADO_STYLE[key] ?? ESTADO_STYLE.pendiente
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "sm"
          ? "px-2.5 py-1 text-[11px] whitespace-nowrap"
          : "px-3 py-1.5 text-xs",
        s.bg,
        s.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
      {ESTADO_LABEL[key] ?? key}
    </span>
  )
}
