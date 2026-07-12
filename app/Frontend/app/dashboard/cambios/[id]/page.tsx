"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ArrowLeftRight, ArrowRight,
  AlertCircle, Calendar, FileText, CreditCard,
  Ban, Download, ExternalLink, Loader2,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getCambio, getBoletaCambio, emitirBoletaCambio, type CambioResponse, type BoletaCambio } from "@/lib/api/cambios"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

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

function safePdfUrl(url: string | undefined | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' ? url : null
  } catch {
    return null
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
  const [boleta, setBoleta] = useState<BoletaCambio | null>(null)
  const [boletaLoading, setBoletaLoading] = useState(true)
  const [emitting, setEmitting] = useState(false)

  useEffect(() => {
    if (isNaN(cambioId)) {
      setError("ID de cambio inválido.")
      setLoading(false)
      setBoletaLoading(false)
      return
    }
    let cancelled = false
    Promise.all([getCambio(cambioId), getBoletaCambio(cambioId)])
      .then(([data, boletaData]) => {
        if (!cancelled) {
          setCambio(data)
          setBoleta(boletaData)
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof ApiError ? e.message : "Error cargando el cambio")
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setBoletaLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [cambioId])

  const diferencia = cambio?.diferencia_cobrada ?? 0

  async function handleEmitirBoleta() {
    setEmitting(true)
    try {
      const result = await emitirBoletaCambio(cambioId)
      setBoleta(result)
      toast.success(`Nota de Venta ${result.numero} emitida correctamente`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      toast.error(`No se pudo emitir la nota de venta: ${msg}`)
    } finally {
      setEmitting(false)
    }
  }

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
                        ? "bg-bg-dark text-lime"
                        : "bg-gray-100 text-gray-600",
                    )}
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
                        className="flex items-center gap-1 font-mono text-sm font-medium text-lime-dark hover:underline"
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

            {/* Card: boleta */}
            <BlurFade delay={0.20} duration={0.4}>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">Nota de Venta</h2>
                </div>
                <div className="p-5">
                  {boletaLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-10 w-full rounded-xl bg-gray-200" />
                    </div>
                  ) : boleta ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                          <FileText className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Número de nota de venta</p>
                          <p className="font-mono text-sm font-semibold text-gray-900">{boleta.numero}</p>
                        </div>
                      </div>
                      {safePdfUrl(boleta.url_pdf) ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(safePdfUrl(boleta.url_pdf)!, "_blank")}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ver PDF
                          </button>
                          <a
                            href={safePdfUrl(boleta.url_pdf)!}
                            download={`boleta-${boleta.numero}.pdf`}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Descargar
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-red-500">PDF no disponible — error al generar</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-500">
                        <Ban className="h-4 w-4" />
                        <p className="text-sm">Sin nota de venta registrada</p>
                      </div>
                      <button
                        onClick={handleEmitirBoleta}
                        disabled={emitting || loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-dark px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-lime-dark/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {emitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            Emitir Nota de Venta
                          </>
                        )}
                      </button>
                    </div>
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
