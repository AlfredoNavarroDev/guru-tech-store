export function DashboardSkeleton() {
  return (
    <main className="min-h-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">

        {/* Header */}
        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6 animate-pulse">
            <div className="h-7 w-52 rounded-lg bg-gray-200 sm:h-9" />
            <div className="mt-2 h-3.5 w-36 rounded bg-gray-100" />
            <div className="mt-4 space-y-1.5">
              <div className="h-3 w-full max-w-xl rounded bg-gray-100" />
              <div className="h-3 w-64 rounded bg-gray-100" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-3.5 w-20 rounded bg-gray-100" />
            <div className="mt-2 h-6 w-36 rounded-lg bg-violet-100" />
            <div className="mt-3 h-3 w-44 rounded bg-gray-100" />
          </div>
        </section>

        {/* KPIs */}
        <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            "border-gray-200 bg-white",
            "border-emerald-200 bg-emerald-50",
            "border-red-200 bg-red-50",
            "border-gray-200 bg-white",
          ].map((cls, i) => (
            <div key={i} className={`rounded-xl border p-4 shadow-sm animate-pulse ${cls}`}>
              <div className="h-2.5 w-24 rounded bg-gray-200 opacity-60" />
              <div className="mt-3 h-8 w-12 rounded-md bg-gray-200 opacity-50" />
              <div className="mt-2 h-3 w-28 rounded bg-gray-100 opacity-60" />
            </div>
          ))}
        </section>

        {/* Nómina */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-40 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "bg-blue-50 border-blue-200",
              "bg-violet-50 border-violet-200",
              "bg-emerald-50 border-emerald-200",
            ].map((cls, i) => (
              <div key={i} className={`rounded-xl border p-4 flex items-center justify-between gap-3 animate-pulse ${cls}`}>
                <div className="space-y-2">
                  <div className="h-2.5 w-14 rounded bg-current opacity-20" />
                  <div className="h-6 w-20 rounded bg-current opacity-10" />
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="h-3 w-20 rounded bg-current opacity-20 ml-auto" />
                  <div className="h-2.5 w-14 rounded bg-current opacity-10 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rendimiento */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-36 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1].map((ci) => (
              <div key={ci} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm animate-pulse">
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-gray-200" />
                  <div className="h-3 w-20 rounded bg-gray-200" />
                  <div className="ml-auto h-2.5 w-28 rounded bg-gray-100" />
                </div>
                {[0, 1, 2].map((ri) => (
                  <div key={ri} className="px-4 py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 rounded bg-gray-100" />
                        <div className="h-2.5 w-36 rounded bg-gray-100" />
                      </div>
                      <div className="shrink-0 space-y-1.5">
                        <div className="h-4 w-14 rounded bg-gray-100 ml-auto" />
                        <div className="h-2.5 w-10 rounded bg-gray-100 ml-auto" />
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
