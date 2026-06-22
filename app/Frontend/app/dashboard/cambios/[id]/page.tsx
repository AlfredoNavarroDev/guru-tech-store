"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ArrowLeftRight, ArrowRight,
  AlertCircle, Calendar, FileText, CreditCard,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getCambio, type CambioResponse } from "@/lib/api/cambios"
import { ApiError } from "@/lib/api/client"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | Date) {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(iso)
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CambioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const cambioId = Number(id)
  const router = useRouter()

  const [cambio, setCambio] = useState<CambioResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNaN(cambioId)) {
      setError("ID de cambio inválido.")
      setLoading(false)
      return
    }
    let cancelled = false
    getCambio(cambioId)
      .then((data) => { if (!cancelled) setCambio(data) })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : "Error cargando el cambio")
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cambioId])

  const diferencia = cambio?.diferencia_cobrada ?? 0

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <BlurFade delay={0} duration={0.4}>
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/cambios")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Cambios de producto
            </button>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
              <ArrowLeftRight className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-heading">
                {loading ? "Cambio #..." : cambio ? `Cambio #${cambio.id_cambio}` : "Cambio"}
              </h1>
              {cambio && (
                <p className="text-sm text-gray-500">{fmtDate(cambio.fecha_cambio)}</p>
              )}
            </div>
          </div>
        </BlurFade>

        {/* Loading */}
        {loading && (
          <BlurFade delay={0.05} duration={0.4}>
            <DetailSkeleton />
          </BlurFade>
        )}

        {/* Error */}
        {!loading && error && (
          <BlurFade delay={0.05} duration={0.4}>
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button
                onClick={() => router.push("/dashboard/cambios")}
                className="mt-1 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
              >
                ← Volver a cambios
              </button>
            </div>
          </BlurFade>
        )}

        {/* Content */}
        {!loading && !error && cambio && (
          <div className="space-y-4">
            {/* Card: intercambio */}
            <BlurFade delay={0.08} duration={0.4}>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">Intercambio</h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Item devuelto */}
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-xs font-medium text-gray-400">Devuelve</p>
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {cambio.nombre_item_devuelto}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        x{cambio.cantidad} · S/ {cambio.precio_devuelto.toFixed(2)} c/u
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />

                    {/* Item entregado */}
                    <div className="min-w-0 flex-1 text-right">
                      <p className="mb-1 text-xs font-medium text-gray-400">Recibe</p>
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {cambio.nombre_item_entregado}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        x{cambio.cantidad} · S/ {cambio.precio_entregado.toFixed(2)} c/u
                      </p>
                    </div>
                  </div>

                  {/* Badge diferencia */}
                  <div
                    className={cn(
                      "mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold",
                      diferencia > 0
                        ? "text-[var(--color-lime)]"
                        : "bg-gray-100 text-gray-600",
                    )}
                    style={diferencia > 0 ? { background: "var(--color-bg-dark)" } : undefined}
                  >
                    <span>{diferencia > 0 ? "Diferencia cobrada" : "Sin diferencia"}</span>
                    {diferencia > 0 && <span>+S/ {diferencia.toFixed(2)}</span>}
                  </div>
                </div>
              </div>
            </BlurFade>

            {/* Card: info */}
            <BlurFade delay={0.14} duration={0.4}>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">Información</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  <InfoRow
                    icon={FileText}
                    label="Venta origen"
                    value={
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/dashboard/ventas/${cambio.id_venta_origen}`)
                        }
                        className="flex items-center gap-1 font-mono text-sm font-medium text-blue-600 hover:underline"
                      >
                        #{cambio.id_venta_origen}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    }
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Fecha"
                    value={<span className="text-sm text-gray-700">{fmtDate(cambio.fecha_cambio)}</span>}
                  />
                  <InfoRow
                    icon={FileText}
                    label="Motivo"
                    value={<span className="text-sm text-gray-700">{cambio.motivo}</span>}
                  />
                  {cambio.metodo_pago_dif && (
                    <InfoRow
                      icon={CreditCard}
                      label="Método de pago"
                      value={
                        <span className="text-sm capitalize text-gray-700">
                          {cambio.metodo_pago_dif}
                        </span>
                      }
                    />
                  )}
                  {cambio.detalle && (
                    <InfoRow
                      icon={FileText}
                      label="Detalle"
                      value={<span className="text-sm text-gray-700">{cambio.detalle}</span>}
                    />
                  )}
                </div>
              </div>
            </BlurFade>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── InfoRow ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <span className="w-28 shrink-0 text-xs font-medium text-gray-400">{label}</span>
      <div className="min-w-0 flex-1">{value}</div>
    </div>
  )
}
