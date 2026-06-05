import { Skeleton } from "@/components/ui/skeleton"

export default function VentasLoading() {
  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-32 mb-1.5" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 h-16 animate-pulse" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
