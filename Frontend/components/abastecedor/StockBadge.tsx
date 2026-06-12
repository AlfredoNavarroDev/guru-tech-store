interface StockBadgeProps {
  cantidad_actual: number
  stock_minimo: number
}

export function StockBadge({ cantidad_actual, stock_minimo }: StockBadgeProps) {
  if (cantidad_actual <= stock_minimo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
        🔴 Crítico
      </span>
    )
  }
  if (cantidad_actual <= stock_minimo * 1.2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
        🟡 Bajo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
      🟢 OK
    </span>
  )
}
