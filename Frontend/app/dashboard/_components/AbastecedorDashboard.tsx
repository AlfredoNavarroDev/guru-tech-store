"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { Plus, Layers, Package, Users } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { StockOverview } from "@/components/abastecedor/StockOverview"
import { getCompras, type Compra } from "@/lib/api/compras"
import { getSession } from "@/lib/api/auth"
import { formatNum, cn } from "@/lib/utils"

const MotionLink = motion(Link)
const WHILETAP = { scale: 0.97 }

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function AbastecedorDashboard() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [loadingCompras, setLoadingCompras] = useState(true)
  const [comprasError, setComprasError] = useState(false)
  const [today, setToday] = useState("")
  const [firstName, setFirstName] = useState("")

  useEffect(() => {
    const s = getSession()
    setFirstName(s?.nombre?.split(" ")[0] ?? "")
  }, [])

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("es-PE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    )
  }, [])

  useEffect(() => {
    getCompras({ limit: 5, page: 1 })
      .then((res) => setCompras(res.items))
      .catch(() => setComprasError(true))
      .finally(() => setLoadingCompras(false))
  }, [])

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        {/* Saludo */}
        <BlurFade delay={0} duration={0.35}>
          <div>
            <h2 className="text-3xl font-extrabold text-text-heading">
              Bienvenido{firstName ? `, ${firstName}` : ""}
            </h2>
            <p className="mt-1 text-sm capitalize text-text-muted">{today}</p>
          </div>
        </BlurFade>

        {/* Columnas: stock (izq) + acciones rápidas (der) */}
        <BlurFade delay={0.1} duration={0.35}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="flex-1 min-w-0">
              <StockOverview compact />
            </div>

            <div className="lg:w-60 xl:w-64 shrink-0">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-bold text-text-heading">Acciones rápidas</h3>
                <div className="flex flex-col gap-2">
                  <MotionLink
                    href="/dashboard/compras/nueva"
                    whileTap={WHILETAP}
                    className="flex items-center gap-3 rounded-xl bg-lime px-4 py-3 text-sm font-bold text-[#020617] shadow-[0_0_16px_rgba(172,248,71,0.25)] transition-all hover:bg-[#d4f96a]"
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Nueva compra
                  </MotionLink>
                  <MotionLink
                    href="/dashboard/stock"
                    whileTap={WHILETAP}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Layers className="h-4 w-4 shrink-0 text-gray-900" aria-hidden="true" />
                    Ver stock
                  </MotionLink>
                  <MotionLink
                    href="/dashboard/items"
                    whileTap={WHILETAP}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Package className="h-4 w-4 shrink-0 text-gray-900" aria-hidden="true" />
                    Gestionar ítems
                  </MotionLink>
                  <MotionLink
                    href="/dashboard/proveedores"
                    whileTap={WHILETAP}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Users className="h-4 w-4 shrink-0 text-gray-900" aria-hidden="true" />
                    Proveedores
                  </MotionLink>
                </div>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Compras recientes */}
        <BlurFade delay={0.25} duration={0.35}>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-text-heading">Compras recientes</h3>
                <p className="mt-0.5 text-xs text-text-muted">Últimas 5 órdenes de compra</p>
              </div>
              <Link
                href="/dashboard/compras"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {(["Proveedor", "Total", "Fecha"] as const).map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                          h === "Proveedor" ? "text-left" : "text-right",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingCompras ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Skeleton className="ml-auto h-4 w-24" />
                        </td>
                      </tr>
                    ))
                  ) : comprasError ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-rose-500">
                        Error al cargar compras
                      </td>
                    </tr>
                  ) : compras.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-10 text-center text-sm text-text-muted"
                      >
                        Sin compras registradas
                      </td>
                    </tr>
                  ) : (
                    compras.map((c) => (
                      <tr
                        key={c.id_compra}
                        className="transition-colors hover:bg-gray-50/50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-text-heading">
                          {c.proveedor ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold tabular-nums text-text-heading">
                          S/{formatNum(c.costo_total)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-text-muted">
                          {fmtFecha(c.fecha_compra)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </BlurFade>

      </div>
    </div>
  )
}
