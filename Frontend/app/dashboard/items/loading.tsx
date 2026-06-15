import { Skeleton } from "@/components/ui/skeleton"

export default function ItemsLoading() {
  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 min-w-[240px] flex-1 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[48px_1fr_1fr_1fr_1fr_1fr_120px] gap-4 px-4 py-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-20 justify-self-end" />
                <Skeleton className="h-4 w-20 justify-self-end" />
                <Skeleton className="h-8 w-20 justify-self-end rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
