import { Skeleton } from "@/components/ui/skeleton"

export default function ProveedoresLoading() {
  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-44" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
