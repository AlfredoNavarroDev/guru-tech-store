"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ArrowLeft, Loader2, ShoppingBag, PackagePlus } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { ItemDrawer } from "@/components/abastecedor/ItemDrawer"
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
  return {
    id: crypto.randomUUID(),
    item: null,
    cantidad: 1,
    costo_unidad: 0,
    precio_venta_sugerido: 0,
  }
}

export default function NuevaCompraPage() {
  const router = useRouter()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [idProveedor, setIdProveedor] = useState<number | "">("")
  const [lines, setLines] = useState<LineItem[]>(() => [newLine()])
  const [submitting, setSubmitting] = useState(false)
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false)
  const [drawerForLineId, setDrawerForLineId] = useState<string | null>(null)

  useEffect(() => {
    getProveedores().then(setProveedores).catch(() => {})
    getItems({ limit: 200 }).then((r) => setItems(r.items)).catch(() => {})
  }, [])

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeLine(id: string) {
    if (lines.length === 1) return
    setLines((ls) => ls.filter((l) => l.id !== id))
  }

  function openItemDrawerForLine(lineId: string) {
    setDrawerForLineId(lineId)
    setItemDrawerOpen(true)
  }

  function handleItemCreated(created?: Item) {
    if (!created || !drawerForLineId) return
    setItems((prev) => [...prev, created])
    updateLine(drawerForLineId, {
      item: created,
      costo_unidad: created.precio_compra_actual,
      precio_venta_sugerido: created.precio_venta_actual,
    })
    setDrawerForLineId(null)
  }

  const total = lines.reduce((acc, l) => acc + l.cantidad * l.costo_unidad, 0)

  async function handleSubmit() {
    if (!idProveedor) {
      toast.error("Selecciona un proveedor")
      return
    }
    const validLines = lines.filter((l) => l.item && l.cantidad > 0 && l.costo_unidad > 0)
    if (validLines.length === 0) {
      toast.error("Agrega al menos un item con cantidad y costo validos")
      return
    }
    setSubmitting(true)
    try {
      const compra = await createCompra(Number(idProveedor))
      // sort por id_item ASC para prevenir deadlocks en inserts concurrentes
      const sorted = [...validLines].sort((a, b) => a.item!.id_item - b.item!.id_item)
      for (const line of sorted) {
        await addItemToCompra(compra.id_compra, {
          id_item: line.item!.id_item,
          cantidad_comprada: line.cantidad,
          costo_unidad: line.costo_unidad,
          precio_venta_sugerido: line.precio_venta_sugerido || line.item!.precio_venta_actual,
        })
      }
      toast.success("Compra registrada exitosamente")
      router.push("/dashboard/compras")
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 409) {
        if (e.errorCode === "DEADLOCK_DETECTADO") {
          toast.warning("Conflicto de concurrencia. Intente de nuevo en unos segundos.")
          return
        }
        toast.error(e.message ?? "Conflicto al registrar la compra")
        return
      }
      toast.error(e instanceof ApiError ? e.message : "Error al registrar la compra")
    } finally {
      setSubmitting(false)
    }
  }

  const selectCls =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"

  return (
    <div className="min-h-full bg-bg-main p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <BlurFade delay={0} duration={0.4}>
          <div className="mb-8 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                  <ShoppingBag className="h-4 w-4 text-gray-900" />
                </div>
                <h1 className="text-2xl font-bold text-text-heading">Nueva compra</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">Registrar orden de reposicion</p>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.06} duration={0.4}>
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <select
                className={selectCls}
                value={idProveedor}
                onChange={(e) => setIdProveedor(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>
                    {p.razon_social}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Items de la compra</label>
                <button
                  onClick={() => setLines((ls) => [...ls, newLine()])}
                  className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar item
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Item</th>
                      <th className="w-20 px-3 py-2.5 text-right text-xs font-medium text-gray-500">Cant.</th>
                      <th className="w-28 px-3 py-2.5 text-right text-xs font-medium text-gray-500">Costo unit.</th>
                      <th className="w-28 px-3 py-2.5 text-right text-xs font-medium text-gray-500">P. Venta</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((line) => (
                      <tr key={line.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <select
                              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              value={line.item?.id_item ?? ""}
                              onChange={(e) => {
                                const found =
                                  items.find((i) => i.id_item === Number(e.target.value)) ?? null
                                updateLine(line.id, {
                                  item: found,
                                  costo_unidad: found?.precio_compra_actual ?? 0,
                                  precio_venta_sugerido: found?.precio_venta_actual ?? 0,
                                })
                              }}
                            >
                              <option value="">Seleccionar...</option>
                              {items.map((i) => (
                                <option key={i.id_item} value={i.id_item}>
                                  {i.nombre} ({i.sku})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              title="Crear nuevo ítem"
                              onClick={() => openItemDrawerForLine(line.id)}
                              className="shrink-0 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-sm text-gray-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={line.cantidad}
                            onChange={(e) =>
                              updateLine(line.id, { cantidad: parseInt(e.target.value) || 1 })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-sm text-gray-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={line.costo_unidad}
                            onChange={(e) =>
                              updateLine(line.id, {
                                costo_unidad: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-sm text-gray-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={line.precio_venta_sugerido}
                            onChange={(e) =>
                              updateLine(line.id, {
                                precio_venta_sugerido: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-xl bg-blue-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
                  Total estimado
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-blue-700">
                  S/ {total.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => router.back()}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-[#020617] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a] disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Registrando..." : "Registrar compra"}
              </button>
            </div>
          </div>
        </BlurFade>
      </div>
      <ItemDrawer
        open={itemDrawerOpen}
        onClose={() => { setItemDrawerOpen(false); setDrawerForLineId(null) }}
        item={null}
        onSaved={handleItemCreated}
      />
    </div>
  )
}
