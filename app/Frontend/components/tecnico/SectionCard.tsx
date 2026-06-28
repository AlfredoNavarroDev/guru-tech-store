import { BlurFade } from "@/components/ui/blur-fade"

export function SectionCard({
  title,
  icon: Icon,
  children,
  delay = 0,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  delay?: number
}) {
  return (
    <BlurFade delay={delay} duration={0.4}>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <Icon className="h-3.5 w-3.5 text-gray-700" />
          </div>
          <h2 className="text-sm font-semibold text-text-heading">{title}</h2>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </BlurFade>
  )
}
