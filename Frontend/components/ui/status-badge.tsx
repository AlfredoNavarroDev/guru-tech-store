import { cn } from "@/lib/utils"

const METODO_PAGO_MAP: Record<string, { label: string; cls: string }> = {
  efectivo:      { label: "Efectivo",      cls: "bg-green-100 text-green-700" },
  tarjeta:       { label: "Tarjeta",       cls: "bg-blue-50 text-blue-500" },
  transferencia: { label: "Transferencia", cls: "bg-violet-100 text-violet-700" },
  yape:          { label: "Yape",          cls: "bg-purple-100 text-purple-700" },
  plin:          { label: "Plin",          cls: "bg-teal-100 text-teal-700" },
  otro:          { label: "Otro",          cls: "bg-gray-100 text-gray-600" },
}

const TIPO_DOCUMENTO_MAP: Record<string, string> = {
  DNI:       "bg-blue-100 text-blue-700",
  CE:        "bg-amber-100 text-amber-700",
  pasaporte: "bg-violet-100 text-violet-700",
}

function StatusBadge({
  label,
  colorClass,
  className,
}: {
  label: string
  colorClass: string
  className?: string
}) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", colorClass, className)}>
      {label}
    </span>
  )
}

function MetodoPagoBadge({ metodo, className }: { metodo: string; className?: string }) {
  const found = METODO_PAGO_MAP[metodo.toLowerCase()] ?? { label: metodo, cls: "bg-gray-100 text-gray-600" }
  return <StatusBadge label={found.label} colorClass={found.cls} className={className} />
}

function TipoDocumentoBadge({ tipo, className }: { tipo: string; className?: string }) {
  return (
    <StatusBadge
      label={tipo}
      colorClass={TIPO_DOCUMENTO_MAP[tipo] ?? "bg-gray-100 text-gray-600"}
      className={className}
    />
  )
}

export { StatusBadge, MetodoPagoBadge, TipoDocumentoBadge }
