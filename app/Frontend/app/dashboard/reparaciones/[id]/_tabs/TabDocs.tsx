"use client"

import { useState } from "react"
import {
  Loader2, FileText, Download, Camera,
  ImageIcon, ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import {
  emitirBoletaReparacion,
  uploadFotoReparacion,
  getReparacion,
  type ReparacionResponse,
  type BoletaReparacion,
} from "@/lib/api/reparaciones"
import { ESTADO_LABEL, ESTADO_STYLE } from "@/components/tecnico/EstadoBadge"
import { type GarantiaResponse } from "@/lib/api/garantias"

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

function fmtDatetime(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(iso)
  }
}

interface TabDocsProps {
  rep: ReparacionResponse
  boleta: BoletaReparacion | null
  garantia: GarantiaResponse | null
  onBoletaEmitida: (boleta: BoletaReparacion) => void
  onRepUpdated: (rep: ReparacionResponse) => void
}

export function TabDocs({
  rep,
  boleta,
  garantia,
  onBoletaEmitida,
  onRepUpdated,
}: TabDocsProps) {
  const [emittingBoleta, setEmittingBoleta] = useState(false)
  const [uploadingFoto, setUploadingFoto]   = useState(false)

  const estadoEsFinal = rep.estado === "entregado" || rep.estado === "listo"

  const handleEmitirBoleta = async () => {
    setEmittingBoleta(true)
    try {
      const b = await emitirBoletaReparacion(rep.id_reparacion)
      onBoletaEmitida(b)
      toast.success(`Comprobante ${b.numero} generado`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error emitiendo boleta")
    } finally {
      setEmittingBoleta(false)
    }
  }

  const handleUploadFoto = async (file: File) => {
    setUploadingFoto(true)
    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload  = () => resolve((reader.result as string).split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await uploadFotoReparacion(rep.id_reparacion, {
        imagen_base64: base64,
        content_type: file.type || "image/jpeg",
        estado: rep.estado ?? "pendiente",
      })
      const updated = await getReparacion(rep.id_reparacion)
      onRepUpdated(updated)
      toast.success("Foto registrada correctamente")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error subiendo foto")
    } finally {
      setUploadingFoto(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Boleta */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <FileText className="h-3.5 w-3.5 text-gray-700" />
          </div>
          <h2 className="text-sm font-semibold text-text-heading">Comprobante</h2>
        </div>
        <div className="p-5">
          {boleta ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-heading">{boleta.numero}</p>
                <p className="text-xs text-gray-500">{fmtDatetime(boleta.fecha_emision)}</p>
              </div>
              <div className="flex items-center gap-2">
                {boleta.url_pdf && (
                  <a
                    href={boleta.url_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </a>
                )}
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  Emitida
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-gray-400">Aún no se ha generado el comprobante</p>
              <Button
                onClick={handleEmitirBoleta}
                disabled={emittingBoleta}
                className="rounded-xl bg-[#020617] hover:bg-[#0f172a] text-white"
              >
                {emittingBoleta ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Generar comprobante
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Fotos del servicio */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <Camera className="h-3.5 w-3.5 text-gray-700" />
          </div>
          <h2 className="text-sm font-semibold text-text-heading">Fotos del servicio</h2>
        </div>
        <div className="p-5">
          {(() => {
            const fotos = rep.fotos ?? []
            if (fotos.length === 0) {
              return (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <ImageIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">No hay fotos todavía</p>
                </div>
              )
            }
            const ETAPA_ORDER = ["pendiente", "reparacion", "listo", "entregado"]
            const grouped = new Map<string, typeof fotos>()
            for (const f of fotos) {
              const arr = grouped.get(f.etapa) ?? []
              arr.push(f)
              grouped.set(f.etapa, arr)
            }
            const sortedKeys = [...grouped.keys()].sort(
              (a, b) => (ETAPA_ORDER.indexOf(a) === -1 ? 99 : ETAPA_ORDER.indexOf(a)) - (ETAPA_ORDER.indexOf(b) === -1 ? 99 : ETAPA_ORDER.indexOf(b)),
            )
            return (
              <div className="space-y-5">
                {sortedKeys.map((etapa) => {
                  const etapaFotos = grouped.get(etapa)!
                  const style = ESTADO_STYLE[etapa] ?? ESTADO_STYLE.pendiente
                  return (
                    <div key={etapa}>
                      <div className="mb-2.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                            style.bg,
                            style.text,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
                          {ESTADO_LABEL[etapa] ?? etapa}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {etapaFotos.length} foto{etapaFotos.length !== 1 && "s"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {etapaFotos.map((foto, i) => (
                          <a
                            key={i}
                            href={foto.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "group relative block overflow-hidden rounded-xl border-2 bg-gray-50 aspect-square",
                              style.bg.replace("bg-", "border-").replace("-50", "-200"),
                            )}
                          >
                            <img
                              src={foto.url}
                              alt={`${ESTADO_LABEL[etapa] ?? etapa} - foto ${i + 1}`}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
          <div
            className={cn(
              "border-t border-gray-100 pt-4 mt-4",
              (rep.fotos ?? []).length === 0 && "border-t-0 pt-0 mt-0",
            )}
          >
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors",
                uploadingFoto
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50",
              )}
            >
              {uploadingFoto ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo foto...</>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Foto de etapa &quot;{ESTADO_LABEL[rep.estado ?? ""] ?? rep.estado}&quot;
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={uploadingFoto}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleUploadFoto(file)
                  e.target.value = ""
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Garantía */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <ShieldCheck className="h-3.5 w-3.5 text-gray-700" />
          </div>
          <h2 className="text-sm font-semibold text-text-heading">Garantía</h2>
        </div>
        <div className="p-5">
          {garantia ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-heading">
                  Garantía de 30 días
                </p>
                <p className="text-xs text-gray-500">
                  Desde {fmtFechaLarga(garantia.fecha_inicio)} hasta {fmtFechaLarga(garantia.fecha_fin)}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                  garantia.estado === "activa"
                    ? "bg-green-100 text-green-700"
                    : garantia.estado === "vencida"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-600",
                )}
              >
                {garantia.estado}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm text-gray-400">
                La garantía se genera automáticamente al entregar el equipo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
