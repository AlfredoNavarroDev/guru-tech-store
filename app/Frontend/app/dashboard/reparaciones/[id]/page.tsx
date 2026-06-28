"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Wrench, AlertCircle,
  CreditCard, FolderOpen, PackageCheck, FileText, Loader2,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn, repId, formatNum } from "@/lib/utils"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"
import {
  getReparacion,
  getBoletaReparacion,
  updateEstadoReparacion,
  type ReparacionResponse,
  type BoletaReparacion,
} from "@/lib/api/reparaciones"
import { getGarantias, type GarantiaResponse } from "@/lib/api/garantias"
import { EstadoBadge } from "@/components/tecnico/EstadoBadge"
import { TabServicio } from "./_tabs/TabServicio"
import { TabPagos } from "./_tabs/TabPagos"
import { TabDocs } from "./_tabs/TabDocs"

type TabId = "servicio" | "pagos" | "docs"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "servicio", label: "Servicio",  icon: Wrench },
  { id: "pagos",    label: "Pagos",     icon: CreditCard },
  { id: "docs",     label: "Archivos",  icon: FolderOpen },
]

function fmtFechaLarga(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(String(iso).slice(0, 10) + "T00:00:00").toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return String(iso).slice(0, 10)
  }
}

export default function ReparacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }  = use(params)
  const repId_n = Number(id)
  const router  = useRouter()

  const [rep, setRep]                     = useState<ReparacionResponse | null>(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [boleta, setBoleta]               = useState<BoletaReparacion | null>(null)
  const [garantia, setGarantia]           = useState<GarantiaResponse | null>(null)
  const [activeTab, setActiveTab]         = useState<TabId>("servicio")
  const [showSticky, setShowSticky]       = useState(false)
  const [savingEntrega, setSavingEntrega] = useState(false)
  const headerCardRef                     = useRef<HTMLDivElement>(null)

  const loadDetail = useCallback(async () => {
    if (isNaN(repId_n)) { setError("ID inválido"); setLoading(false); return }
    try {
      const [detail, boletaData] = await Promise.all([
        getReparacion(repId_n),
        getBoletaReparacion(repId_n),
      ])
      setRep(detail)
      setBoleta(boletaData)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Error cargando reparación")
      setLoading(false)
      return
    }
    try {
      const garantiasData = await getGarantias({ id_reparacion: repId_n, limit: 1 })
      setGarantia(garantiasData.items[0] ?? null)
    } catch {
      // garantía is optional
    } finally {
      setLoading(false)
    }
  }, [repId_n])

  useEffect(() => { void loadDetail() }, [loadDetail])

  useEffect(() => {
    const el = headerCardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loading])

  const handleMarkEntregadoFast = useCallback(async () => {
    if (!rep) return
    setSavingEntrega(true)
    try {
      const updated = await updateEstadoReparacion(rep.id_reparacion, { id_estado: 6 })
      setRep(updated)
      toast.success("Equipo marcado como entregado")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al marcar entregado")
    } finally {
      setSavingEntrega(false)
    }
  }, [rep])

  const estadoEsFinal = rep?.estado === "entregado"

  if (loading) {
    return (
      <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-5 w-16 rounded-md" />
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                  <Skeleton className="h-6 w-28 rounded-md" />
                </div>
                <Skeleton className="ml-10 h-4 w-36 rounded-md" />
                <Skeleton className="ml-10 h-3 w-48 rounded-md" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm gap-1">
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-4 w-40 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !rep) {
    return (
      <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600">{error ?? "Reparación no encontrada"}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-bg-main">
      {/* Sticky mini-header */}
      <div
        className={cn(
          "sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-all duration-200",
          showSticky ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="mx-auto max-w-3xl flex items-center justify-between h-12 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-500 hover:text-gray-800 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div className="h-4 w-px bg-gray-200 shrink-0" />
            <span className="text-sm font-bold text-text-heading shrink-0">
              {repId(rep.id_reparacion)}
            </span>
            <span className="text-sm text-gray-500 truncate hidden sm:block">{rep.cliente}</span>
          </div>
          <EstadoBadge estado={rep.estado} size="sm" />
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <BlurFade delay={0} duration={0.4}>
            <button
              onClick={() => router.back()}
              className="mb-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            {/* Header card */}
            <div
              ref={headerCardRef}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100">
                      <Wrench className="h-4 w-4 text-gray-700" />
                    </div>
                    <h1 className="text-xl font-bold text-text-heading">
                      {repId(rep.id_reparacion)}
                    </h1>
                  </div>
                  <div className="ml-10.5 space-y-0.5">
                    <p className="text-sm font-medium text-text-heading">
                      {rep.cliente ?? "Sin cliente"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {[rep.marca, rep.modelo].filter(Boolean).join(" ") ||
                        "Equipo sin especificar"}
                      {rep.imei && (
                        <span className="ml-2 font-mono text-xs text-gray-400">
                          IMEI: {rep.imei}
                        </span>
                      )}
                    </p>
                    {rep.esta_encendido !== null && (
                      <p className="text-xs text-gray-500">
                        Al ingreso: {rep.esta_encendido ? "enciende" : "no enciende"}
                      </p>
                    )}
                    {/* Financial snapshot */}
                    {(rep.monto_cotizado != null || rep.total_pagado != null) && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {rep.monto_cotizado != null && (
                          <span className="text-xs text-gray-500">
                            <span className="font-medium text-gray-700">
                              S/{formatNum(rep.monto_cotizado)}
                            </span>{" "}
                            cotizado
                          </span>
                        )}
                        {rep.total_pagado != null && rep.total_pagado > 0 && (
                          <span className="text-xs text-green-600">
                            <span className="font-medium">
                              S/{formatNum(rep.total_pagado)}
                            </span>{" "}
                            pagado
                          </span>
                        )}
                        {rep.saldo_pendiente != null && rep.saldo_pendiente > 0 && (
                          <span className="text-xs text-amber-600">
                            <span className="font-medium">
                              S/{formatNum(rep.saldo_pendiente)}
                            </span>{" "}
                            pendiente
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <EstadoBadge estado={rep.estado} size="md" />
                  <p className="text-xs text-gray-400">
                    Ingresó {fmtFechaLarga(rep.fecha_ingreso)}
                  </p>
                  {rep.fecha_estimada && (
                    <p className="text-xs text-gray-400">
                      Entrega est. {fmtFechaLarga(rep.fecha_estimada)}
                    </p>
                  )}
                </div>
              </div>

              {/* Contextual quick actions */}
              {(rep.estado === "listo" || !boleta) && !estadoEsFinal && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                  {rep.estado === "listo" && (
                    <Button
                      onClick={handleMarkEntregadoFast}
                      disabled={savingEntrega}
                      size="sm"
                      className="h-8 rounded-xl bg-green-700 text-xs text-white hover:bg-green-800"
                    >
                      {savingEntrega ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <PackageCheck className="h-3.5 w-3.5" />
                          Marcar entregado
                        </span>
                      )}
                    </Button>
                  )}
                  {!boleta && (
                    <button
                      onClick={() => setActiveTab("docs")}
                      className="flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Emitir boleta
                    </button>
                  )}
                </div>
              )}

              {rep.checklist_estado && Object.keys(rep.checklist_estado).length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Estado físico al ingreso
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(rep.checklist_estado).map(([k, v]) => (
                      <span
                        key={k}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
                          v === "ok"
                            ? "bg-green-50 text-green-700"
                            : v === "dañado"
                              ? "bg-red-50 text-red-600"
                              : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tab bar */}
            <div
              role="tablist"
              className="flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                    activeTab === tab.id
                      ? "bg-[#020617] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800",
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.id === "docs" && !boleta && (
                    <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-amber-400">
                      <span className="sr-only">Boleta pendiente</span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Active tab panel */}
            {activeTab === "servicio" && (
              <div role="tabpanel" id="panel-servicio" aria-labelledby="tab-servicio">
                <TabServicio
                  rep={rep}
                  estadoEsFinal={estadoEsFinal}
                  onRepUpdated={setRep}
                />
              </div>
            )}
            {activeTab === "pagos" && (
              <div role="tabpanel" id="panel-pagos" aria-labelledby="tab-pagos">
                <TabPagos rep={rep} onRepUpdated={setRep} />
              </div>
            )}
            {activeTab === "docs" && (
              <div role="tabpanel" id="panel-docs" aria-labelledby="tab-docs">
                <TabDocs
                  rep={rep}
                  boleta={boleta}
                  garantia={garantia}
                  onBoletaEmitida={setBoleta}
                  onRepUpdated={setRep}
                />
              </div>
            )}
          </BlurFade>
        </div>
      </div>
    </div>
  )
}
