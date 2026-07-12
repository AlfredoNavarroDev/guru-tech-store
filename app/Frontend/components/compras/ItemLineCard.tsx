"use client"

import { useRef } from "react"
import { Camera, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { uploadImagenItem } from "@/lib/api/items"
import type { Item } from "@/lib/api/items"
import { ItemCombobox } from "./ItemCombobox"

export interface LineItem {
  id: string
  item: Item | null
  cantidad: number
  costo_unidad: number
  precio_venta_sugerido: number
}

interface ItemLineCardProps {
  line: LineItem
  items: Item[]
  canRemove: boolean
  onUpdate: (patch: Partial<LineItem>) => void
  onRemove: () => void
  onCreateNew: (name: string) => void
  onItemPhotoUpdated: (itemId: number, url: string) => void
}

export function ItemLineCard({
  line,
  items,
  canRemove,
  onUpdate,
  onRemove,
  onCreateNew,
  onItemPhotoUpdated,
}: ItemLineCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const margin =
    line.costo_unidad > 0
      ? ((line.precio_venta_sugerido - line.costo_unidad) / line.costo_unidad) * 100
      : null

  const isValid = line.item !== null && line.costo_unidad > 0

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !line.item) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(",")[1]
      try {
        const { url } = await uploadImagenItem(line.item!.id_item, {
          imagen_base64: base64,
          content_type: file.type as "image/jpeg" | "image/png" | "image/webp",
        })
        onItemPhotoUpdated(line.item!.id_item, url)
        toast.success("Foto actualizada")
      } catch {
        toast.error("Error al subir la foto")
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-lime-dark focus:outline-none focus:ring-2 focus:ring-lime-dark/10"

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
        !isValid ? "border-amber-300 bg-amber-50/30" : "border-gray-200"
      }`}
    >
      {/* Top row: photo + combobox + delete */}
      <div className="mb-3 flex items-start gap-3">
        {/* Photo */}
        <div
          className="group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-100 flex items-center justify-center"
          onClick={() => line.item && fileInputRef.current?.click()}
          title={line.item ? "Cambiar foto" : undefined}
        >
          {line.item?.imagen_url ? (
            <img
              src={line.item.imagen_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl">📦</span>
          )}
          {line.item && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />

        {/* Combobox */}
        <div className="min-w-0 flex-1">
          <ItemCombobox
            items={items}
            value={line.item}
            onChange={(item) =>
              onUpdate({
                item,
                costo_unidad: item.precio_compra_actual,
                precio_venta_sugerido: item.precio_venta_actual,
              })
            }
            onCreateNew={onCreateNew}
          />
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Fields: 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Cant.
          </label>
          <input
            type="number"
            min="1"
            className={`${inputCls} text-center`}
            value={line.cantidad}
            onChange={(e) =>
              onUpdate({ cantidad: parseInt(e.target.value) || 1 })
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Costo unit. (S/.)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`${inputCls} text-right ${
              line.costo_unidad === 0 ? "border-amber-300 bg-amber-50" : ""
            }`}
            value={line.costo_unidad}
            onChange={(e) =>
              onUpdate({ costo_unidad: parseFloat(e.target.value) || 0 })
            }
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            P. Venta (S/.)
            {margin !== null && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  margin > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {margin > 0 ? "+" : ""}
                {margin.toFixed(0)}%
              </span>
            )}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={`${inputCls} text-right`}
            value={line.precio_venta_sugerido}
            onChange={(e) =>
              onUpdate({
                precio_venta_sugerido: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>

        <div className="flex flex-col justify-end">
          <div className="rounded-lg bg-green-50 px-2 py-1.5 text-right text-sm font-semibold text-green-700">
            S/ {(line.cantidad * line.costo_unidad).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Inline errors */}
      {!line.item && (
        <p className="mt-2 text-xs text-amber-700">
          ⚠ Selecciona un ítem para continuar
        </p>
      )}
      {line.item && line.costo_unidad === 0 && (
        <p className="mt-2 text-xs text-amber-700">
          ⚠ El costo no puede ser 0
        </p>
      )}
    </div>
  )
}
