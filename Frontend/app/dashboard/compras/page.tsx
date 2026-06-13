"use client"

import { useCallback, useEffect, useState, Fragment } from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronDown, ChevronUp } from "lucide-react"
import { getCompras, getCompra, type Compra } from "@/lib/api/compras"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

const PAGE_SIZE = 20

export default function ComprasPage() {
  const router = useRouter()
  const [compras, setCompras] = useState<Compra[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCompras({ page, limit: PAGE_SIZE })
      setCompras(res.data)
      setTotal(res.total)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error cargando compras")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  async function toggleExpand(compra: Compra) {
    if (expanded === compra.id_compra) {
      setExpanded(null)
      return
    }
    if (compra.detalles) {
      setExpanded(compra.id_compra)
      return
    }
    setDetalleLoading(true)
    try {
      const full = await getCompra(compra.id_compra)
      setCompras((cs) => cs.map((c) => c.id_compra === full.id_compra ? full : c))
      setExpanded(compra.id_compra)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error cargando detalle")
    } finally {
      setDetalleLoading(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Compras</h1>
          <p className="text-sm text-white/40 mt-0.5">{total} órdenes registradas</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/compras/nueva")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva compra
        </button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" />
          </div>
        ) : compras.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/30">Sin compras registradas</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left font-medium text-white/50">#Orden</th>
                <th className="px-4 py-3 text-left font-medium text-white/50">Proveedor</th>
                <th className="px-4 py-3 text-left font-medium text-white/50">Fecha</th>
                <th className="px-4 py-3 text-right font-medium text-white/50">Total</th>
                <th className="px-4 py-3 text-right font-medium text-white/50">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => (
                <Fragment key={c.id_compra}>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs text-white/60">COM-{String(c.id_compra).padStart(3, "0")}</td>
                    <td className="px-4 py-3 text-white">{c.proveedor ?? "—"}</td>
                    <td className="px-4 py-3 text-white/60">
                      {new Date(c.fecha_compra).toLocaleDateString("es-PE")}
                    </td>
                    <td className="px-4 py-3 text-right text-white">S/. {Number(c.costo_total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleExpand(c)}
                        className="rounded p-1.5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        disabled={detalleLoading}
                      >
                        {expanded === c.id_compra ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                  {expanded === c.id_compra && c.detalles && (
                    <tr className="bg-white/3">
                      <td colSpan={5} className="px-6 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-white/40">
                              <th className="text-left py-1">Ítem</th>
                              <th className="text-right py-1">Cant.</th>
                              <th className="text-right py-1">Costo unit.</th>
                              <th className="text-right py-1">P. Venta sug.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.detalles.map((d) => (
                              <tr key={d.id_detalle_compra} className="border-t border-white/5">
                                <td className="py-1 text-white/70">{d.item_nombre}</td>
                                <td className="py-1 text-right text-white/60">{d.cantidad_comprada}</td>
                                <td className="py-1 text-right text-white/60">S/. {Number(d.costo_unidad).toFixed(2)}</td>
                                <td className="py-1 text-right text-white/60">S/. {Number(d.precio_venta_sugerido).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-white/50">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30 hover:bg-white/10">Anterior</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-30 hover:bg-white/10">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
