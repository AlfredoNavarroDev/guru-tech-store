import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-full">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        {/* Greeting */}
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* 2 stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/5 bg-linear-to-br from-black to-[#131B2E] p-5 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <div className="h-3 w-24 rounded-md bg-white/15" />
              <div className="h-8 w-8 rounded-xl bg-white/15" />
            </div>
            <div className="h-10 w-20 rounded-md bg-white/15 mb-2" />
            <div className="h-3 w-28 rounded-md bg-white/15" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-20 mb-2" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        {/* Ítems críticos table */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <Skeleton className="h-5 w-36" />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {[140, 56, 56, 56, 72].map((w, i) => (
                  <th key={i} className="px-4 py-3">
                    <Skeleton className={`h-3 w-${w === 140 ? "20" : "10"} ${i !== 0 ? "ml-auto" : ""}`} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
                  <td className="px-4 py-2.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Compras recientes table */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-6 py-3"><Skeleton className="h-3 w-20" /></th>
                <th className="px-6 py-3"><Skeleton className="h-3 w-12 ml-auto" /></th>
                <th className="px-6 py-3"><Skeleton className="h-3 w-14 ml-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
