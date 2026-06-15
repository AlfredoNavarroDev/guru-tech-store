interface StockBadgeProps {
  cantidad_actual: number
  stock_minimo: number
}

export function StockBadge({ cantidad_actual, stock_minimo }: StockBadgeProps) {
  if (cantidad_actual <= stock_minimo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
        Crítico
      </span>
    )
  }
  if (cantidad_actual <= stock_minimo * 1.2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
        Bajo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
      OK
    </span>
  )
}
