import { StockOverview } from "@/components/abastecedor/StockOverview"

export default function AbastecedorDashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Resumen de Inventario</h1>
        <p className="text-sm text-white/40 mt-0.5">Vista general del stock por sede</p>
      </div>
      <StockOverview />
    </div>
  )
}
