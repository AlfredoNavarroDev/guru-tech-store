"use client"

import { useState } from "react"
import { ArrowLeftRight, Plus, ArrowRight } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { CambioDrawer } from "@/components/vendedor/CambioDrawer"

// ─── Static mock data ────────────────────────────────────────────────────────

interface CambioMock {
  id_cambio: number
  fecha_cambio: string
  id_venta_origen: number
  item_devuelto: string
  item_entregado: string
  diferencia_cobrada: number
  motivo: string
}

const MOCK_CAMBIOS: CambioMock[] = [
  {
    id_cambio: 3,
    fecha_cambio: "2026-06-22T10:15:00Z",
    id_venta_origen: 1042,
    item_devuelto: "Laptop ASUS VivoBook 15",
    item_entregado: "Laptop ASUS VivoBook 16",
    diferencia_cobrada: 150,
    motivo: "Defecto de fábrica",
  },
  {
    id_cambio: 2,
    fecha_cambio: "2026-06-18T16:40:00Z",
    id_venta_origen: 1038,
    item_devuelto: "Mouse Logitech MX3",
    item_entregado: "Mouse Logitech G502",
    diferencia_cobrada: 0,
    motivo: "Preferencia del cliente",
  },
  {
    id_cambio: 1,
    fecha_cambio: "2026-06-15T11:05:00Z",
    id_venta_origen: 1025,
    item_devuelto: "Teclado Redragon K552",
    item_entregado: "Teclado Redragon K556",
    diferencia_cobrada: 30,
    motivo: "Error en la venta",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CambiosPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.4}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <ArrowLeftRight className="h-4 w-4 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold text-text-heading">Cambios de producto</h1>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">Registro de devoluciones e intercambios</p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-[#020617] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
          >
            <Plus className="h-4 w-4" />
            Nuevo cambio
          </button>
        </div>
      </BlurFade>

      {/* List */}
      <BlurFade delay={0.08} duration={0.4}>
        <div className="space-y-2">
          {MOCK_CAMBIOS.map((cambio, i) => (
            <BlurFade key={cambio.id_cambio} delay={Math.min(i * 0.04, 0.2)} duration={0.3}>
              <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm">
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                </div>

                {/* Exchange info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-medium text-gray-900 truncate max-w-[140px] sm:max-w-none">{cambio.item_devuelto}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="font-medium text-gray-900 truncate max-w-[140px] sm:max-w-none">{cambio.item_entregado}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span>Venta <span className="font-mono font-medium text-gray-700">#{cambio.id_venta_origen}</span></span>
                    <span>{fmtDate(cambio.fecha_cambio)}</span>
                    <span className="truncate">{cambio.motivo}</span>
                  </div>
                </div>

                {/* Diferencia badge */}
                <div className="shrink-0 text-right">
                  {cambio.diferencia_cobrada > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                      +S/ {cambio.diferencia_cobrada.toFixed(2)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                      Sin diferencia
                    </span>
                  )}
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </BlurFade>

      <CambioDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
