"use client"

import { use, useEffect, useState, memo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Receipt,
  User,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  Store,
  Calendar,
  FileText,
  Ban,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { cn, formatNum } from "@/lib/utils"
import { Th, Td } from "@/components/ui/data-table"
import { MetodoPagoBadge } from "@/components/ui/status-badge"
import { toast } from "sonner"
import { getVenta, getPagos, getBoleta, emitirBoleta, type VentaVista, type Pago, type Boleta } from "@/lib/api/ventas"

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatSoles = (n: number | string | null | undefined) => `S/ ${formatNum(n)}`

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonSection({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 w-full rounded-xl bg-gray-200" />
      ))}
    </div>
  )
}

// ─── section card ─────────────────────────────────────────────────────────────

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
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </BlurFade>
  )
})

// ─── page ─────────────────────────────────────────────────────────────────────

export default function VentaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const ventaId = Number(id)
  // Derivado en render — evita setState sincrónico dentro de useEffect
  const idError = isNaN(ventaId) ? "ID de venta inválido." : null
  const router = useRouter()

  const [rows, setRows] = useState<VentaVista[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [boleta, setBoleta] = useState<Boleta | null>(null)
  const [boletaLoading, setBoletaLoading] = useState(!idError)
  const [emitting, setEmitting] = useState(false)
  // Razonamiento: si ID es inválido, loading arranca en false (se muestra error derivado directo).
  const [loading, setLoading] = useState(!idError)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const [ventaRows, pagosData, boletaData] = await Promise.all([
          getVenta(ventaId),
          getPagos(ventaId),
          getBoleta(ventaId),
        ])
        if (!cancelled) {
          setRows(ventaRows)
          setPagos(pagosData)
          setBoleta(boletaData)
        }
      } catch {
        if (!cancelled) setError("No se pudo cargar el detalle de la venta.")
      } finally {
        if (!cancelled) {
          setLoading(false)
          setBoletaLoading(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [ventaId])

  async function handleEmitir() {
    setEmitting(true)
    try {
      const result = await emitirBoleta(ventaId)
      setBoleta(result)
      toast.success(`Nota de Venta ${result.numero} emitida correctamente`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      toast.error(`No se pudo emitir la nota de venta: ${msg}`)
      console.error("emitirBoleta error:", err)
    } finally {
      setEmitting(false)
    }
  }

  // ─── derived ───────────────────────────────────────────────────────────────

  const first = rows[0] ?? null
  const subtotal = rows.reduce((s, r) => s + Number(r.importe), 0)
  const descuento = Number(first?.monto_descuento ?? 0)
  const totalVenta = Number(first?.total_venta_cabecera ?? 0)

  // ─── error / loading states ────────────────────────────────────────────────

  // Combina error de fetch con error de ID inválido (derivado en render)
  const displayError = error ?? idError
  const isRetryable = error !== null // solo reintentar si fue error de fetch

  if (displayError) {
    return (
      <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a ventas
        </button>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-20 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
          <p className="mb-1 text-sm font-medium text-gray-900">Error al cargar</p>
          <p className="mb-5 max-w-xs text-xs text-gray-500">{displayError}</p>
          {isRetryable && (
            <button
              onClick={() => { setError(null); setLoading(true); router.refresh() }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
      {/* Back */}
      <BlurFade delay={0} duration={0.4}>
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
          aria-label="Volver a ventas"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a ventas
        </button>
      </BlurFade>

      {/* Page header */}
      <BlurFade delay={0.05} duration={0.45}>
        <div className="mb-8">
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-7 w-48 rounded-xl bg-gray-200" />
              <div className="h-4 w-72 rounded bg-gray-200" />
            </div>
          ) : first ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                  <Receipt className="h-5 w-5 text-gray-900" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Venta #{ventaId}</h1>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(first.fecha_emision)}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {first.vendedor}
                </span>
                <span className="flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" />
                  {first.sede}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Venta no encontrada.</p>
          )}
        </div>
      </BlurFade>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

        {/* Left column: products + client + boleta */}
        <div className="flex flex-col gap-5 xl:col-span-2">

          {/* Products table */}
          <SectionCard icon={ShoppingBag} title="Productos" accent="#3b82f6" delay={0.1}>
            {loading ? (
              <SkeletonSection rows={4} />
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-500">Sin productos.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[480px] border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gray-50">
                      <Th>Producto</Th>
                      <Th right>Cant.</Th>
                      <Th right>P. Unit.</Th>
                      <Th right>Importe</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={`${row.id_venta}-${row.sku}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <Td>
                          <span className="font-medium text-gray-900">{row.producto}</span>
                        </Td>
                        <Td right mono>{row.cantidad}</Td>
                        <Td right mono>
                          {row.precio_normal_momento != null ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-gray-400 line-through">{formatSoles(row.precio_normal_momento)}</span>
                              <span className="text-emerald-600 font-semibold">{formatSoles(row.precio_unitario_momento)}</span>
                            </div>
                          ) : (
                            formatSoles(row.precio_unitario_momento)
                          )}
                        </Td>
                        <Td right mono>{formatSoles(row.importe)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Client */}
          <SectionCard icon={User} title="Cliente" accent="#8b5cf6" delay={0.15}>
            {loading ? (
              <SkeletonSection rows={1} />
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-4.5 w-4.5 text-gray-900" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {first?.cliente ?? "Venta anónima"}
                  </p>
                  {!first?.cliente && (
                    <p className="text-xs text-gray-500">Sin cliente registrado</p>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Boleta */}
          <SectionCard icon={FileText} title="Nota de Venta" accent="#10b981" delay={0.2}>
            {boletaLoading ? (
              <SkeletonSection rows={1} />
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
                {boleta.url_pdf ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(boleta.url_pdf!, "_blank")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver PDF
                    </button>
                    <a
                      href={boleta.url_pdf}
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
                  onClick={handleEmitir}
                  disabled={emitting || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </SectionCard>
        </div>

        {/* Right column: summary + pagos */}
        <div className="flex flex-col gap-5">

          {/* Summary */}
          <SectionCard icon={Receipt} title="Resumen" accent="#f59e0b" delay={0.1}>
            {loading ? (
              <SkeletonSection rows={3} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-mono tabular-nums text-gray-900">{formatSoles(subtotal)}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Descuento</span>
                    <span className="font-mono tabular-nums text-red-600">- {formatSoles(descuento)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-3 py-3 text-sm">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-mono text-lg font-bold tabular-nums text-amber-700">
                    {formatSoles(totalVenta)}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Pagos */}
          <SectionCard icon={CreditCard} title="Pagos" accent="#06b6d4" delay={0.15}>
            {loading ? (
              <SkeletonSection rows={2} />
            ) : pagos.length === 0 ? (
              <div className="flex items-center gap-3 text-gray-500">
                <Ban className="h-4 w-4" />
                <p className="text-sm">Sin pagos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pagos.map((pago) => (
                  <div
                    key={pago.id_pago}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <MetodoPagoBadge metodo={pago.metodo_pago} />
                        {pago.referencia_transaccion && (
                          <p className="mt-1 truncate text-xs text-gray-500">
                            Ref: {pago.referencia_transaccion}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(pago.fecha_pago).toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-blue-500">
                        {formatSoles(pago.monto)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

        </div>
      </div>
    </div>
  )
}
