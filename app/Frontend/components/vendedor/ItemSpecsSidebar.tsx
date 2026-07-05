"use client"

import { X } from "lucide-react"
import { motion } from "motion/react"
import { ItemImage } from "@/components/ui/item-image"
import type { CatalogoItem } from "@/lib/api/catalogo"
import { formatNum } from "@/lib/utils"

interface ItemSpecsSidebarProps {
  item: CatalogoItem
  onClose: () => void
}

function qualityBars(calidad: string | null): number {
  if (!calidad) return 0
  const val = calidad.toLowerCase()
  if (val === "original") return 3
  if (val === "genérico" || val === "generico") return 2
  return 0
}

export function ItemSpecsContent({ item, onClose }: ItemSpecsSidebarProps) {
  const bars = qualityBars(item.calidad)

  return (
    <div className="flex flex-col h-full">
      {/* Dark gradient header */}
      <div
        className="shrink-0 relative p-4"
        style={{ background: "linear-gradient(135deg, #020617, #1e3a5f)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-white transition-colors"
          aria-label="Cerrar detalles"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="mb-3 flex items-center justify-center">
          <ItemImage src={item.imagen_url} alt={item.producto} size="xl" />
        </div>

        <p className="text-sm font-bold text-white leading-snug mb-1">
          {item.producto}
        </p>
        <p className="font-mono text-xs text-[#acf847] mb-2">
          {item.sku} · S/ {formatNum(Number(item.precio_venta_actual))}
        </p>

        {bars > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Calidad:</span>
            <div className="flex items-end gap-[3px]">
              {[5, 8, 11].map((h, i) => (
                <div
                  key={i}
                  style={{
                    height: h,
                    width: 4,
                    borderRadius: 1,
                    background: i < bars ? "#acf847" : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-[#acf847]">
              {item.calidad}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Ficha meta */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Ficha
          </p>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {item.marca && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500">Marca</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">
                    {item.marca}
                  </td>
                </tr>
              )}
              {item.modelo && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500">Modelo</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">
                    {item.modelo}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-1.5 text-gray-500">SKU</td>
                <td className="py-1.5 text-right font-mono text-[10px] text-gray-400">
                  {item.sku}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

export function ItemSpecsSidebar({ item, onClose }: ItemSpecsSidebarProps) {
  return (
    <motion.div
      key="specs-sidebar"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-[calc(100vh-5rem)] border-l-2 border-blue-500 bg-white overflow-hidden"
    >
      <ItemSpecsContent item={item} onClose={onClose} />
    </motion.div>
  )
}
