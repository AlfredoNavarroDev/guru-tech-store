"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, X, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatNum } from "@/lib/utils"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import {
  updateEstadoReparacion,
  addRepuesto,
  removeRepuesto,
  getReparacion,
  type ReparacionResponse,
} from "@/lib/api/reparaciones"
import { getItems, type Item } from "@/lib/api/items"

const ESTADO_FLOW: { id: number; key: string; label: string; short: string }[] = [
  { id: 1, key: "pendiente",           label: "Pendiente",      short: "Pendiente"   },
  { id: 2, key: "diagnostico",         label: "En diagnóstico", short: "Diagnóstico" },
  { id: 3, key: "reparacion",          label: "En reparación",  short: "Reparación"  },
  { id: 4, key: "esperando repuestos", label: "Esp. repuestos", short: "Repuestos"   },
  { id: 5, key: "listo",              label: "Listo",           short: "Listo"       },
  { id: 6, key: "entregado",           label: "Entregado",      short: "Entregado"   },
]

function ItemSearch({
  onAdd,
  saving,
}: {
  onAdd: (item: Item, cantidad: number, precio: number) => void
  saving: boolean
}) {
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<Item[]>([])
  const [selected, setSelected] = useState<Item | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [precio, setPrecio]     = useState("")
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (selected || !query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        setResults((await getItems({ tipo: "repuesto", nombre: query, limit: 8 })).items)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, selected])

  const pick = (item: Item) => {
    setSelected(item)
    setQuery(item.nombre)
    setPrecio(String(item.precio_venta_actual))
    setResults([])
  }

  const clear = () => {
    setSelected(null)
    setQuery("")
    setPrecio("")
    setCantidad(1)
    setResults([])
  }

  const handleAdd = () => {
    if (!selected) return
    onAdd(selected, cantidad, parseFloat(precio) || selected.precio_venta_actual)
    clear()
  }

  return (
    <div className="space-y-2 mt-4 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Agregar repuesto
      </p>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => { setSelected(null); setQuery(e.target.value) }}
          placeholder="Buscar repuesto por nombre..."
          className="rounded-xl"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
        )}
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {results.map((item) => (
              <button
                key={item.id_item}
                type="button"
                onClick={() => pick(item)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900 truncate">
                  {item.nombre}
                </span>
                <span className="ml-2 shrink-0 text-xs text-gray-400">
                  S/{formatNum(item.precio_venta_actual)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-gray-500">Cant.</label>
            <Input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 rounded-xl"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-gray-500">Precio cobrado (S/)</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={saving}
            className="rounded-xl bg-[#020617] text-white hover:bg-[#0f172a]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar"}
          </Button>
          <button
            type="button"
            onClick={clear}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

interface TabServicioProps {
  rep: ReparacionResponse
  estadoEsFinal: boolean
  onRepUpdated: (rep: ReparacionResponse) => void
}

export function TabServicio({ rep, estadoEsFinal, onRepUpdated }: TabServicioProps) {
  const [diagUpdate, setDiagUpdate]   = useState(rep.diagnostico_tecnico ?? "")
  const [cotizUpdate, setCotizUpdate] = useState(
    rep.monto_cotizado ? String(rep.monto_cotizado) : "",
  )
  const [fechaUpdate, setFechaUpdate]             = useState(rep.fecha_estimada ?? "")
  const [savingEstado, setSavingEstado]           = useState(false)
  const [savingEstadoKey, setSavingEstadoKey]     = useState<string | null>(null)
  const [estadoError, setEstadoError]             = useState<string | null>(null)
  const [savingRepuesto, setSavingRepuesto]       = useState(false)
  const [removingRepuesto, setRemovingRepuesto]   = useState<number | null>(null)
  const [repuestoError, setRepuestoError]         = useState<string | null>(null)

  const currentEstadoIdx = ESTADO_FLOW.findIndex(e => e.key === rep.estado)

  const totalRepuestos = (rep.repuestos ?? []).reduce(
    (s, r) => s + r.precio_cobrado * r.cantidad,
    0,
  )

  const handleStepClick = async (step: (typeof ESTADO_FLOW)[number]) => {
    if (step.key === rep.estado || estadoEsFinal || savingEstadoKey) return
    setSavingEstadoKey(step.key)
    setEstadoError(null)
    try {
      const updated = await updateEstadoReparacion(rep.id_reparacion, { id_estado: step.id })
      onRepUpdated(updated)
      toast.success(`Estado: ${step.label}`)
    } catch (e) {
      setEstadoError(e instanceof ApiError ? e.message : "Error actualizando estado")
    } finally {
      setSavingEstadoKey(null)
    }
  }

  const handleUpdateDiagnostico = async () => {
    setSavingEstado(true)
    setEstadoError(null)
    const currentId = ESTADO_FLOW.find(e => e.key === rep.estado)?.id ?? 1
    try {
      const updated = await updateEstadoReparacion(rep.id_reparacion, {
        id_estado: currentId,
        diagnostico_tecnico: diagUpdate.trim() || undefined,
        monto_cotizado: parseFloat(cotizUpdate) > 0 ? parseFloat(cotizUpdate) : undefined,
        fecha_estimada: fechaUpdate || undefined,
      })
      onRepUpdated(updated)
      toast.success("Guardado")
    } catch (e) {
      setEstadoError(e instanceof ApiError ? e.message : "Error guardando")
    } finally {
      setSavingEstado(false)
    }
  }

  const handleAddRepuesto = async (item: Item, cantidad: number, precio: number) => {
    setSavingRepuesto(true)
    setRepuestoError(null)
    try {
      await addRepuesto(rep.id_reparacion, {
        id_item: item.id_item,
        cantidad,
        precio_cobrado: precio,
        costo_unitario_momento: item.precio_compra_actual,
      })
      const updated = await getReparacion(rep.id_reparacion)
      onRepUpdated(updated)
      toast.success("Repuesto registrado")
    } catch (e) {
      setRepuestoError(e instanceof ApiError ? e.message : "Error registrando repuesto")
    } finally {
      setSavingRepuesto(false)
    }
  }

  const handleRemoveRepuesto = async (idRepuestoU: number) => {
    setRemovingRepuesto(idRepuestoU)
    setRepuestoError(null)
    try {
      await removeRepuesto(rep.id_reparacion, idRepuestoU)
      const updated = await getReparacion(rep.id_reparacion)
      onRepUpdated(updated)
      toast.success("Repuesto eliminado")
    } catch (e) {
      setRepuestoError(e instanceof ApiError ? e.message : "Error eliminando repuesto")
    } finally {
      setRemovingRepuesto(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Estado y diagnóstico */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <Wrench className="h-3.5 w-3.5 text-gray-700" />
          </div>
          <h2 className="text-sm font-semibold text-text-heading">Estado y diagnóstico</h2>
        </div>
        <div className="space-y-4 p-5">
          {/* Estado stepper */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Estado del servicio
            </label>
            <div className="relative py-1">
              {/* Track background */}
              <div
                className="pointer-events-none absolute top-[18px] h-0.5 bg-gray-200"
                style={{
                  left: `${50 / ESTADO_FLOW.length}%`,
                  right: `${50 / ESTADO_FLOW.length}%`,
                }}
              />
              {/* Progress */}
              <div
                className="pointer-events-none absolute top-[18px] h-0.5 bg-gray-500 transition-[width] duration-300"
                style={{
                  left: `${50 / ESTADO_FLOW.length}%`,
                  width: `${(currentEstadoIdx * 100) / ESTADO_FLOW.length}%`,
                }}
              />
              {/* Steps */}
              <div className="flex">
                {ESTADO_FLOW.map((step, idx) => {
                  const isPast    = idx < currentEstadoIdx
                  const isCurrent = idx === currentEstadoIdx
                  const isSaving  = savingEstadoKey === step.key
                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => handleStepClick(step)}
                      disabled={estadoEsFinal || !!savingEstadoKey}
                      title={step.label}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 focus:outline-none",
                        !estadoEsFinal && !savingEstadoKey && "cursor-pointer",
                        (estadoEsFinal || !!savingEstadoKey) && "cursor-not-allowed",
                      )}
                    >
                      <div
                        className={cn(
                          "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all",
                          isCurrent  && "scale-110 border-[#020617] bg-[#020617] text-white ring-2 ring-[#020617]/15",
                          isPast     && "border-gray-500 bg-gray-500 text-white",
                          !isCurrent && !isPast && "border-gray-300 bg-white text-gray-400",
                          !estadoEsFinal && !savingEstadoKey && !isCurrent && "hover:scale-105",
                          (estadoEsFinal || !!savingEstadoKey) && "opacity-60",
                        )}
                      >
                        {isSaving
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : idx + 1
                        }
                      </div>
                      <span
                        className={cn(
                          "max-w-[48px] text-center text-[9px] leading-tight",
                          isCurrent ? "font-semibold text-gray-900" : "text-gray-400",
                        )}
                      >
                        {step.short}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Diagnóstico */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Diagnóstico técnico
            </label>
            <textarea
              value={diagUpdate}
              onChange={(e) => setDiagUpdate(e.target.value)}
              placeholder="Describe el diagnóstico o avance del servicio..."
              rows={3}
              disabled={estadoEsFinal}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-heading placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Cotización (S/)
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={cotizUpdate}
                onChange={(e) => setCotizUpdate(e.target.value)}
                placeholder="0.00"
                disabled={estadoEsFinal}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Fecha estimada
              </label>
              <Input
                type="date"
                value={fechaUpdate}
                onChange={(e) => setFechaUpdate(e.target.value)}
                disabled={estadoEsFinal}
                className="rounded-xl"
              />
            </div>
          </div>

          {estadoError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{estadoError}</p>
          )}

          <Button
            onClick={handleUpdateDiagnostico}
            disabled={savingEstado || estadoEsFinal}
            className="w-full rounded-xl bg-[#020617] hover:bg-[#0f172a] text-white"
          >
            {savingEstado ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {/* Repuestos */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <Plus className="h-3.5 w-3.5 text-gray-700" />
          </div>
          <h2 className="text-sm font-semibold text-text-heading">Repuestos utilizados</h2>
        </div>
        <div className="p-5">
          {(rep.repuestos ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">Sin repuestos registrados</p>
          ) : (
            <div className="space-y-2">
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                {(rep.repuestos ?? []).map((r) => (
                  <div
                    key={r.id_repuesto_u}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-heading truncate">
                        {r.item_nombre ?? `Item #${r.id_item}`}
                      </p>
                      <p className="text-xs text-text-muted">
                        Cant: {r.cantidad} · S/{formatNum(r.precio_cobrado)} c/u
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-text-heading tabular-nums">
                      S/{formatNum(r.precio_cobrado * r.cantidad)}
                    </span>
                    {!estadoEsFinal && (
                      <button
                        onClick={() => handleRemoveRepuesto(r.id_repuesto_u)}
                        disabled={removingRepuesto === r.id_repuesto_u}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        {removingRepuesto === r.id_repuesto_u
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {totalRepuestos > 0 && (
                <div className="flex justify-between rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold">
                  <span className="text-text-heading">Total repuestos</span>
                  <span className="tabular-nums text-text-heading">
                    S/{formatNum(totalRepuestos)}
                  </span>
                </div>
              )}
              {/* Repuestos vs cotización */}
              {rep.monto_cotizado != null && rep.monto_cotizado > 0 && (
                <div className="pt-2">
                  <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                    <span>Repuestos vs cotización</span>
                    <span>S/{formatNum(totalRepuestos)} / S/{formatNum(rep.monto_cotizado)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-400 transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, (totalRepuestos / rep.monto_cotizado) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {repuestoError && (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              {repuestoError}
            </p>
          )}

          {!estadoEsFinal && (
            <ItemSearch onAdd={handleAddRepuesto} saving={savingRepuesto} />
          )}
        </div>
      </div>
    </div>
  )
}
