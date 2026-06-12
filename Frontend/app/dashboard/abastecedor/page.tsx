import { Boxes, ClipboardList, Truck } from "lucide-react"
import { RoleLandingPage } from "../_components/RoleLandingPage"

export default function AbastecedorDashboardPage() {
  return (
    <RoleLandingPage
      eyebrow="Rol Abastecedor"
      title="Abastecimiento"
      description="Entrada temporal para usuarios abastecedores. Sprint 1 autentica roles; módulos de stock, compras y proveedores pertenecen al flujo posterior del proyecto."
      actions={[
        {
          label: "Stock actual",
          description: "Vista de inventario por sede preparada en base de datos para futuras pantallas operativas.",
          icon: Boxes,
          status: "pendiente",
        },
        {
          label: "Compras refill",
          description: "Flujo de reposición planificado para registrar compras y movimientos de inventario.",
          icon: ClipboardList,
          status: "pendiente",
        },
        {
          label: "Proveedores",
          description: "Base para consulta de proveedores y abastecimiento por sede.",
          icon: Truck,
          status: "pendiente",
        },
      ]}
      checklist={[
        "Login por rol abastecedor ya aterriza en ruta propia.",
        "Vista evita 404 mientras Sprint 2 implementa operaciones.",
        "Sidebar y layout del dashboard se reutilizan sin duplicar navegación.",
        "Sin llamadas backend nuevas fuera del alcance Sprint 1.",
      ]}
    />
  )
}
