"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react"
import { getProveedores, type Proveedor } from "@/lib/api/proveedores"
import { getItems, type Item } from "@/lib/api/items"
import { createCompra, addItemToCompra } from "@/lib/api/compras"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

interface LineItem {
  id: string
  item: Item | null
  cantidad: number
  costo_unidad: number
  precio_venta_sugerido: number
}

function newLine(): LineItem {
  return { id: crypto.randomUUID(), item: null, cantidad: 1, costo_unidad: 0, precio_venta_sugerido: 0 }
}

export default function NuevaCompraPage() {
  const router = useRouter()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [idProveedor, setIdProveedor] = useState<number | "">("")
  const [lines, setLines] = useState<LineItem[]>([newLine()])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getProveedores().then(setProveedores).catch(() => {})
    getItems({ limit: 200 }).then((r) => setItems(r.data)).catch(() => {})
  }, [])

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((ls) => ls.map((l) => l.id === id ? { ...l, ...patch } : l))
  }

  function removeLine(id: string) {
    if (lines.length === 1) return
    setLines((ls) => ls.filter((l) => l.id !== id))
  }

  const total = lines.reduce((acc, l) => acc + l.cantidad * l.costo_unidad, 0)

  async function handleSubmit() {
    if (!idProveedor) {
      toast.error("Selecciona un proveedor")
      return
    }
    const validLines = lines.filter((l) => l.item && l.cantidad > 0 && l.costo_unidad > 0)
    if (validLines.length === 0) {
      toast.error("Agrega al menos un ítem con cantidad y costo válidos")
      return
    }
    setSubmitting(true)
    try {
      const compra = await createCompra(Number(idProveedor))
      for (const line of validLines) {
        await addItemToCompra(compra.id_compra, {
          id_item: line.item!.id_item,
          cantidad_comprada: line.cantidad,
          costo_unidad: line.costo_unidad,
          precio_venta_sugerido: line.precio_venta_sugerido || line.item!.precio_venta_actual,
        })
      }
      toast.success("Compra registrada exitosamente")
      router.push("/dashboard/abastecedor/compras")
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 409) {
        toast.error(e.message ?? "Conflicto al registrar la compra")
        return
      }
      toast.error(e instanceof ApiError ? e.message : "Error al registrar la compra")
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 hover:bg-white/10 text-white/50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-white">Nueva Compra</h1>
          <p className="text-sm text-white/40 mt-0.5">Registrar orden de reposición</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">Proveedor *</label>
          <select
            className={inputCls}
            value={idProveedor}
            onChange={(e) => setIdProveedor(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map((p) => (
              <option key={p.id_proveedor} value={p.id_proveedor}>{p.razon_social}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white/70">Ítems de la compra</label>
            <button
              onClick={() => setLines((ls) => [...ls, newLine()])}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar ítem
            </button>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-3 py-2.5 text-left font-medium text-white/50">Ítem</th>
                  <th className="px-3 py-2.5 text-right font-medium text-white/50 w-20">Cant.</th>
                  <th className="px-3 py-2.5 text-right font-medium text-white/50 w-28">Costo unit.</th>
                  <th className="px-3 py-2.5 text-right font-medium text-white/50 w-28">P. Venta</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-white/5">
                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                        value={line.item?.id_item ?? ""}
                        onChange={(e) => {
                          const found = items.find((i) => i.id_item === Number(e.target.value)) ?? null
                          updateLine(line.id, {
                            item: found,
                            costo_unidad: found?.precio_compra_actual ?? 0,
                            precio_venta_sugerido: found?.precio_venta_actual ?? 0,
                          })
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {items.map((i) => (
                          <option key={i.id_item} value={i.id_item}>{i.nombre} ({i.sku})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-blue-500/50"
                        value={line.cantidad}
                        onChange={(e) => updateLine(line.id, { cantidad: parseInt(e.target.value) || 1 })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-blue-500/50"
                        value={line.costo_unidad}
                        onChange={(e) => updateLine(line.id, { costo_unidad: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-blue-500/50"
                        value={line.precio_venta_sugerido}
                        onChange={(e) => updateLine(line.id, { precio_venta_sugerido: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                        className="rounded p-1 hover:bg-red-500/20 text-white/30 hover:text-red-400 disabled:opacity-20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-right text-sm font-medium text-white">
            Total estimado: <span className="text-blue-400">S/. {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? "Registrando..." : "Registrar compra"}
          </button>
        </div>
      </div>
    </div>
  )
}
