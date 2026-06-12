import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserCog,
  UserPlus,
  UsersRound,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const metrics = [
  {
    label: "Modulos activos",
    value: 3,
    caption: "empleados, claves y sesiones",
    icon: UsersRound,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    label: "Controles de acceso",
    value: 4,
    caption: "reglas de seguridad",
    icon: ShieldCheck,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Flujo sprint",
    value: 1,
    caption: "gestion por sede",
    icon: UserCog,
    tone: "bg-violet-50 text-violet-700",
  },
]

const quickActions = [
  {
    href: "/dashboard/admin/empleados",
    label: "Gestionar empleados",
    description: "Crear, editar, filtrar por rol y cambiar estado de acceso.",
    icon: UsersRound,
    primary: true,
  },
  {
    href: "/dashboard/admin/empleados",
    label: "Nuevo empleado",
    description: "Abre el modulo de empleados para registrar personal de sede.",
    icon: UserPlus,
    primary: false,
  },
  {
    href: "/dashboard/admin/empleados",
    label: "Contraseñas",
    description: "Actualiza claves iniciales o restablece acceso operativo.",
    icon: KeyRound,
    primary: false,
  },
]

const safeguards = [
  "JWT limita la gestion a la sede del administrador.",
  "El administrador no puede desactivar su propia cuenta.",
  "Desactivar empleados revoca refresh tokens activos.",
  "Las operaciones autenticadas registran actor para auditoria.",
]

export default function AdminDashboardPage() {
  return (
    <main className="min-h-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <BlurFade delay={0} duration={0.4}>
          <section className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Rol administrador
                  </div>
                  <h1 className="text-2xl font-semibold text-gray-950 sm:text-3xl">
                    Centro de administracion
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                    Gestiona empleados de sede, contrasenas operativas, estados de acceso y reglas de seguridad desde un punto de control.
                  </p>
                </div>
                <Link
                  href="/dashboard/admin/empleados"
                  className={cn(buttonVariants({ size: "lg" }), "w-full gap-1.5 sm:w-auto")}
                >
                  <UsersRound className="h-4 w-4" />
                  Gestionar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ambito actual</p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-950">Sede activa</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  <LockKeyhole className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-500">
                Las acciones administrativas respetan permisos por rol y alcance de sede.
              </p>
            </div>
          </section>
        </BlurFade>

        <section className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <BlurFade key={metric.label} delay={0.06 + index * 0.06} duration={0.35}>
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-950">
                        <NumberTicker value={metric.value} />
                      </p>
                    </div>
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", metric.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{metric.caption}</p>
                </div>
              </BlurFade>
            )
          })}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <BlurFade delay={0.24} duration={0.35}>
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">Acciones rapidas</h2>
                  <p className="text-sm text-gray-500">Atajos frecuentes para operar empleados.</p>
                </div>
              </div>
              <div className="grid gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={cn(
                        "group flex items-center gap-4 rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                        action.primary
                          ? "border-blue-200 bg-blue-50/70 hover:bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          action.primary ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-950">{action.label}</h3>
                        <p className="mt-1 text-sm leading-5 text-gray-500">{action.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
                    </Link>
                  )
                })}
              </div>
            </section>
          </BlurFade>

          <BlurFade delay={0.3} duration={0.35}>
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">Checklist de seguridad</h2>
                  <p className="text-sm text-gray-500">Controles cubiertos por Sprint 1.</p>
                </div>
              </div>
              <div className="grid gap-3">
                {safeguards.map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm leading-5 text-gray-700">{item}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                        Control {index + 1}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </BlurFade>
        </div>
      </div>
    </main>
  )
}
