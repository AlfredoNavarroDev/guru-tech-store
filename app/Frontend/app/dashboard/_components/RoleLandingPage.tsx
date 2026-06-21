import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react"

interface RoleAction {
  href?: string
  label: string
  description: string
  icon: LucideIcon
  status: "disponible" | "pendiente"
}

interface RoleLandingPageProps {
  eyebrow: string
  title: string
  description: string
  actions: RoleAction[]
  checklist: string[]
}

export function RoleLandingPage({
  eyebrow,
  title,
  description,
  actions,
  checklist,
}: RoleLandingPageProps) {
  return (
    <div className="min-h-full bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="border-b border-gray-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-text-heading">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
            {description}
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon
            const content = (
              <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-900">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    {action.status === "disponible" ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <Clock3 className="h-3 w-3 text-amber-600" />
                    )}
                    {action.status}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-text-heading">
                  {action.label}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-text-muted">
                  {action.description}
                </p>
                {action.href && (
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                    Abrir
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            )

            return action.href ? (
              <Link key={action.label} href={action.href}>
                {content}
              </Link>
            ) : (
              <div key={action.label}>{content}</div>
            )
          })}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-text-heading">
            Alcance Sprint 1
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span className="text-sm leading-6 text-text-muted">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
