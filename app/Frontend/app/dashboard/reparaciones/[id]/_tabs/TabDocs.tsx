"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2, FileText, Download, Camera,
  ImageIcon, Plus, ShieldCheck,
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
import { ESTADO_LABEL } from "@/components/tecnico/EstadoBadge"
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
  const router = useRouter()
  const [emittingBoleta, setEmittingBoleta] = useState(false)
  const [uploadingFoto, setUploadingFoto]   = useState(false)

  const estadoEsFinal = rep.estado === "entregado" || rep.estado === "listo"

  const handleEmitirBoleta = async () => {
    setEmittingBoleta(true)
    try {
      const b = await emitirBoletaReparacion(rep.id_reparacion)
      onBoletaEmitida(b)
      toast.success(`Boleta ${b.numero} emitida`)
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
          <h2 className="text-sm font-semibold text-text-heading">Boleta</h2>
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
              <p className="text-sm text-gray-400">Sin boleta emitida</p>
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
                    Emitir boleta
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
          {(rep.fotos ?? []).length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(rep.fotos ?? []).map((foto, i) => (
                <a
                  key={i}
                  href={foto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-xl border border-gray-200 bg-gray-50 aspect-square"
                >
                  <img
                    src={foto.url}
                    alt={foto.etapa}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                    <p className="text-[10px] font-semibold capitalize text-white leading-tight">
                      {foto.etapa}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <ImageIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-400">Sin fotos registradas</p>
            </div>
          )}
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
                  {garantia.referencia_label}
                </p>
                <p className="text-xs text-gray-500">
                  {fmtFechaLarga(garantia.fecha_inicio)} → {fmtFechaLarga(garantia.fecha_fin)}
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
              <p className="text-sm text-gray-400">Sin garantía registrada</p>
              <button
                onClick={() => router.push("/dashboard/garantias/nueva")}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear garantía
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
