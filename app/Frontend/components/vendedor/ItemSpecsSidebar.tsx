"use client"

import { X, Package, Tag } from "lucide-react"
import Image from "next/image"
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

function promoDiscountLabel(tipo: string | null, valor: number | null): string {
  if (!tipo || valor === null) return ""
  if (tipo === "porcentaje") return `-${formatNum(Number(valor))}%`
  return `-S/ ${formatNum(Number(valor))}`
}

export function ItemSpecsContent({ item, onClose }: ItemSpecsSidebarProps) {
  const bars = qualityBars(item.calidad)
  const hasPromo =
    item.precio_con_descuento != null &&
    Number(item.precio_con_descuento) < Number(item.precio_venta_actual)

  return (
    <div className="flex flex-row min-h-[280px] max-h-[85dvh]">
      {/* LEFT panel */}
      <div className="relative w-[200px] shrink-0 bg-gray-50 overflow-hidden">
        {item.imagen_url ? (
          <Image
            src={item.imagen_url}
            alt={item.producto}
            fill
            sizes="200px"
            className="object-contain p-4"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-16 w-16 text-gray-300" />
          </div>
        )}
      </div>

      {/* RIGHT panel */}
      <div className="flex-1 bg-white overflow-y-auto p-5 flex flex-col gap-4 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar detalles"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* 1. Header block */}
        <div className="flex flex-col gap-1 pr-6">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">
            Producto
          </span>
          <p className="text-[15px] font-bold text-gray-900 leading-snug">
            {item.producto}
          </p>
          <span className="self-start rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700">
            Producto
          </span>
        </div>

        <hr className="border-gray-100" />

        {/* 3. Data cards grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Precio venta — col-span-2 */}
          <div className="col-span-2 bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500">Precio venta</p>
            {hasPromo ? (
              <>
                <p className="text-[13px] text-gray-400 line-through font-mono">
                  S/ {formatNum(Number(item.precio_venta_actual))}
                </p>
                <p className="text-[18px] font-extrabold text-blue-600 font-mono">
                  S/ {formatNum(Number(item.precio_con_descuento))}
                </p>
              </>
            ) : (
              <p className="text-[18px] font-extrabold text-gray-900 font-mono">
                S/ {formatNum(Number(item.precio_venta_actual))}
              </p>
            )}
          </div>

          {/* Promoción activa */}
          {hasPromo && item.promo_nombre && (
            <div className="col-span-2 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <Tag className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-blue-400 uppercase tracking-wide">Promoción activa</p>
                <p className="truncate text-[12px] font-semibold text-blue-700">{item.promo_nombre}</p>
              </div>
              {promoDiscountLabel(item.promo_tipo, item.promo_valor) && (
                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-600">
                  {promoDiscountLabel(item.promo_tipo, item.promo_valor)}
                </span>
              )}
            </div>
          )}

          {/* Marca */}
          {item.marca && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500">Marca</p>
              <p className="text-[12px] font-semibold text-gray-900">{item.marca}</p>
            </div>
          )}

          {/* Modelo */}
          {item.modelo && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500">Modelo</p>
              <p className="text-[12px] font-semibold text-gray-900">{item.modelo}</p>
            </div>
          )}

          {/* Calidad */}
          {bars > 0 && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500">Calidad</p>
              <div className="flex items-end gap-[3px] my-1">
                {[5, 8, 11].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      height: h,
                      width: 4,
                      borderRadius: 1,
                      background: i < bars ? "#16a34a" : "rgba(0,0,0,0.1)",
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-bold text-green-600">{item.calidad}</p>
            </div>
          )}

          {/* SKU */}
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500">SKU</p>
            <p className="font-mono text-[10px] text-gray-500">{item.sku}</p>
          </div>
        </div>

        {/* 4. Categories block */}
        {item.categoria && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              Categorías
            </span>
            <div className="flex flex-wrap gap-1">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                {item.categoria}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
