"use client"

import React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ShoppingCart, Plus, Minus } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { RippleButton } from "@/components/ui/ripple-button"
import { ItemImage } from "@/components/ui/item-image"
import { cn } from "@/lib/utils"
import { formatNum } from "@/lib/utils"
import type { CatalogoItem } from "@/lib/api/catalogo"

const fmt = (n: number) => formatNum(n)

export interface ProductCardProps {
  item: CatalogoItem
  delay: number
  onAdd: (item: CatalogoItem) => void
  onDecrement: (id: number) => void
  onViewSpecs: (item: CatalogoItem) => void
  inCart: boolean
  cartQty: number
}

function discountLabel(item: CatalogoItem): string {
  if (item.promo_tipo === "porcentaje" && item.promo_valor !== null)
    return `-${fmt(Number(item.promo_valor))}%`
  if (item.promo_tipo === "monto_fijo" && item.promo_valor !== null)
    return `-S/ ${fmt(item.promo_valor)}`
  if (item.precio_con_descuento !== null) {
    const diff = Number(item.precio_venta_actual) - Number(item.precio_con_descuento)
    return `-S/ ${fmt(diff)}`
  }
  return ""
}

export function ProductCard({ item, delay, onAdd, onDecrement, onViewSpecs, inCart, cartQty }: ProductCardProps) {
  const hasPromo = item.precio_con_descuento != null &&
    item.precio_con_descuento !== 0 &&
    Number(item.precio_con_descuento) < Number(item.precio_venta_actual)

  const label = hasPromo ? discountLabel(item) : ""

  return (
    <BlurFade delay={delay} duration={0.4} className="h-full">
      <div
        role="button"
        tabIndex={0}
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full flex flex-col transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl hover:border-gray-300 cursor-pointer"
        onClick={() => onViewSpecs(item)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onViewSpecs(item) } }}
      >
        <ItemImage
          src={item.imagen_url}
          alt={item.producto}
          size="lg"
        />
        <div className="flex flex-col flex-1 p-4 gap-3">
          <p className="text-sm font-bold text-gray-900 leading-snug">{item.producto}</p>

          <div className="flex flex-col gap-0.5">
            {hasPromo && (
              <span className="text-sm text-gray-400 line-through tabular-nums">
                S/{fmt(Number(item.precio_venta_actual))}
              </span>
            )}
            <span className="text-2xl font-bold tabular-nums text-blue-600">
              S/ {fmt(Number(hasPromo ? item.precio_con_descuento : item.precio_venta_actual))}
            </span>
          </div>

          {hasPromo && label && (
            <div className="w-full rounded-xl bg-blue-50 py-1.5 text-center text-sm font-medium text-blue-600">
              {label}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {inCart ? (
              <motion.div
                key="stepper"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="mt-auto flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDecrement(item.id_item) }}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  aria-label="Reducir cantidad"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <motion.span
                  key={cartQty}
                  initial={{ scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.14, type: "spring", stiffness: 600, damping: 28 }}
                  className="text-base font-bold tabular-nums text-gray-900 select-none inline-block"
                >
                  {cartQty}
                </motion.span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAdd(item) }}
                  disabled={cartQty >= item.stock_disponible}
                  className="text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-30"
                  aria-label="Incrementar cantidad"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="add-btn"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="mt-auto w-full"
              >
                <RippleButton
                  type="button"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onAdd(item) }}
                  disabled={item.stock_disponible === 0}
                  rippleColor="rgba(172,248,71,0.45)"
                  duration="550ms"
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 bg-[#020617] text-lime hover:bg-[#0d1b38]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Agregar
                </RippleButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </BlurFade>
  )
}
