"use client"

import { use, useEffect, useState, memo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  Package,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { cn } from "@/lib/utils"
import { getCompra, type Compra } from "@/lib/api/compras"

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
]
function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

function SkeletonSection({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 w-full rounded-xl bg-gray-200" />
      ))}
    </div>
  )
}

const SectionCard = memo(function SectionCard({
  icon: Icon,
  title,
  accent = "#3b82f6",
  children,
  delay,
}: {
  icon: React.ElementType
  title: string
  accent?: string
  children: React.ReactNode
  delay: number
}) {
  return (
    <BlurFade delay={delay} duration={0.45}>
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accent}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </BlurFade>
  )
})

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "py-2 text-xs font-medium uppercase tracking-wider text-gray-500",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  )
}

function Td({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td
      className={cn(
        "py-3 text-sm text-gray-700",
        right ? "text-right" : "text-left",
        mono && "font-mono tabular-nums",
      )}
    >
      {children}
    </td>
  )
}

export default function CompraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const compraId = Number(id)
  const idError = isNaN(compraId) ? "ID de compra inválido." : null
  const router = useRouter()

  const [compra, setCompra] = useState<Compra | null>(null)
  const [loading, setLoading] = useState(!idError)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (idError) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await getCompra(compraId)
        if (!cancelled) setCompra(data)
      } catch {
        if (!cancelled) setError("No se pudo cargar el detalle de la compra.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [compraId, idError])

  const displayError = error ?? idError

  if (displayError) {
    return (
      <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a compras
        </button>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-20 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
          <p className="mb-1 text-sm font-medium text-gray-900">Error al cargar</p>
          <p className="mb-5 max-w-xs text-xs text-gray-500">{displayError}</p>
          {error && (
            <button
              onClick={() => { setError(null); setLoading(true) }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    )
  }

  const total = compra ? Number(compra.costo_total) : 0

  return (
    <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
      <BlurFade delay={0} duration={0.4}>
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
          aria-label="Volver a compras"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a compras
        </button>
      </BlurFade>

      <BlurFade delay={0.05} duration={0.45}>
        <div className="mb-8">
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-7 w-48 rounded-xl bg-gray-200" />
              <div className="h-4 w-72 rounded bg-gray-200" />
            </div>
          ) : compra ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                  <ShoppingBag className="h-5 w-5 text-gray-900" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  COM-{String(compra.id_compra).padStart(3, "0")}
                </h1>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {fmtDate(compra.fecha_compra)}
                </span>
                {compra.empleado && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {compra.empleado}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Compra no encontrada.</p>
          )}
        </div>
      </BlurFade>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">

          <SectionCard icon={Package} title="Productos" accent="#3b82f6" delay={0.1}>
            {loading ? (
              <SkeletonSection rows={4} />
            ) : !compra?.detalles || compra.detalles.length === 0 ? (
              <p className="text-sm text-gray-500">Sin productos.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[480px] border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gray-50">
                      <Th>Producto</Th>
                      <Th right>Cant.</Th>
                      <Th right>Costo unit.</Th>
                      <Th right>Subtotal</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {compra.detalles.map((d) => (
                      <tr
                        key={d.id_detalle_compra}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <Td>
                          <span className="font-medium text-gray-900">
                            {d.item_nombre ?? d.sku ?? `Item ${d.id_item}`}
                          </span>
                          {d.sku && d.item_nombre && (
                            <p className="text-xs text-gray-400">{d.sku}</p>
                          )}
                        </Td>
                        <Td right mono>{d.cantidad_comprada}</Td>
                        <Td right mono>S/ {Number(d.costo_unidad).toFixed(2)}</Td>
                        <Td right mono>
                          S/ {(d.cantidad_comprada * Number(d.costo_unidad)).toFixed(2)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard icon={Truck} title="Proveedor" accent="#8b5cf6" delay={0.15}>
            {loading ? (
              <SkeletonSection rows={1} />
            ) : (
              <div className="flex items-center gap-3">
                {compra?.proveedor ? (
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      avatarColor(compra.id_compra),
                    )}
                  >
                    {initials(compra.proveedor)}
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <Truck className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {compra?.proveedor ?? (
                      <span className="italic text-gray-400">Sin proveedor</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5">
          <SectionCard icon={ShoppingBag} title="Resumen" accent="#f59e0b" delay={0.1}>
            {loading ? (
              <SkeletonSection rows={2} />
            ) : (
              <div className="space-y-3">
                {compra?.detalles && compra.detalles.length > 0 && (
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm">
                    <span className="text-gray-600">
                      {compra.detalles.length} {compra.detalles.length === 1 ? "ítem" : "ítems"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {compra.detalles.reduce((s, d) => s + d.cantidad_comprada, 0)} unidades
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-100 px-3 py-3 text-sm">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-mono text-lg font-bold tabular-nums text-blue-700">
                    S/ {total.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
