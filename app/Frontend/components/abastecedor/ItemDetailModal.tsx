"use client"

import { cn } from "@/lib/utils"
import { ItemImage } from "@/components/ui/item-image"
import {
  DialogBase,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Item } from "@/lib/api/items"

interface ItemDetailModalProps {
  item: Item | null
  open: boolean
  onClose: () => void
}

export function ItemDetailModal({ item, open, onClose }: ItemDetailModalProps) {
  if (!item) return null

  return (
    <DialogBase open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="sm:max-w-lg p-0 overflow-hidden"
        showCloseButton
      >
        <div className="flex flex-col sm:flex-row">
          {/* Left — image */}
          <div className="flex shrink-0 items-center justify-center bg-gray-50 p-6 sm:w-48">
            <ItemImage
              src={item.imagen_url}
              alt={item.nombre}
              size="xl"
            />
          </div>

          {/* Right — details */}
          <div className="flex-1 space-y-4 pl-6 pr-10 pb-6 pt-4">
            {/* Name + SKU + tipo */}
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {item.nombre}
              </DialogTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-gray-500">{item.sku}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    item.tipo === "producto"
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
                  )}
                >
                  {item.tipo}
                </span>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Field grid */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-xs text-gray-500">Precio compra</dt>
                <dd className="font-mono text-sm font-medium text-gray-900">
                  S/ {item.precio_compra_actual.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Precio venta</dt>
                <dd className="font-mono text-sm font-medium text-gray-900">
                  S/ {item.precio_venta_actual.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Marca</dt>
                <dd className="text-sm text-gray-900">{item.marca ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Modelo</dt>
                <dd className="text-sm text-gray-900">{item.modelo ?? "—"}</dd>
              </div>
              {item.calidad && (
                <div>
                  <dt className="text-xs text-gray-500">Calidad</dt>
                  <dd className="text-sm text-gray-900">{item.calidad}</dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="mb-1 text-xs text-gray-500">Categorías</dt>
                <dd>
                  {item.categorias.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.categorias.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Sin categorías</span>
                  )}
                </dd>
              </div>
            </dl>

          </div>
        </div>
      </DialogContent>
    </DialogBase>
  )
}
