import { History, PackageSearch, Wrench } from "lucide-react"
import { RoleLandingPage } from "../_components/RoleLandingPage"

export default function TecnicoDashboardPage() {
  return (
    <RoleLandingPage
      eyebrow="Rol Técnico"
      title="Servicio técnico"
      description="Entrada temporal para técnicos autenticados. Sprint 1 habilita acceso por rol; reparaciones, repuestos y garantías quedan organizados para sprints posteriores."
      actions={[
        {
          label: "Reparaciones activas",
          description: "Espacio reservado para seguimiento de equipos, diagnóstico y estados de reparación.",
          icon: Wrench,
          status: "pendiente",
        },
        {
          label: "Repuestos disponibles",
          description: "Inventario de repuestos por sede preparado para futuras operaciones técnicas.",
          icon: PackageSearch,
          status: "pendiente",
        },
        {
          label: "Historial técnico",
          description: "Consulta futura de reparaciones terminadas y trazabilidad por cliente.",
          icon: History,
          status: "pendiente",
        },
      ]}
      checklist={[
        "Login por rol técnico ya aterriza en ruta propia.",
        "Vista evita 404 en control de acceso por rol.",
        "No expone módulos de vendedor fuera del alcance del técnico.",
        "Sin llamadas backend nuevas fuera del alcance Sprint 1.",
      ]}
    />
  )
}
