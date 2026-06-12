"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Search, Truck, X, Loader2 } from "lucide-react"
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  type Proveedor,
  type CreateProveedorPayload,
} from "@/lib/api/proveedores"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

const EMPTY: CreateProveedorPayload = { ruc: "", razon_social: "", contacto_nombre: "", telefono: "" }

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Proveedor | null>(null)
  const [form, setForm] = useState<CreateProveedorPayload>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getProveedores()
      setProveedores(data)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error cargando proveedores")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  function openEdit(p: Proveedor) {
    setEditTarget(p)
    setForm({
      ruc: p.ruc,
      razon_social: p.razon_social,
      contacto_nombre: p.contacto_nombre ?? "",
      telefono: p.telefono ?? "",
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.ruc || !form.razon_social) {
      toast.error("RUC y razón social son obligatorios")
      return
    }
    setSaving(true)
    try {
      if (editTarget) {
        await updateProveedor(editTarget.id_proveedor, form)
        toast.success("Proveedor actualizado")
      } else {
        await createProveedor(form)
        toast.success("Proveedor creado")
      }
      load()
      setModalOpen(false)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const filtered = proveedores.filter(
    (p) =>
      p.razon_social.toLowerCase().includes(search.toLowerCase()) ||
      p.ruc.includes(search),
  )

  const inputCls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Proveedores</h1>
          <p className="text-sm text-white/40 mt-0.5">{proveedores.length} proveedores registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo proveedor
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
          placeholder="Buscar por nombre o RUC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-white/30">
          <Truck className="mx-auto mb-2 h-8 w-8 opacity-30" />
          Sin resultados
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id_proveedor}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/20">
                    <Truck className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white leading-tight">{p.razon_social}</p>
                    <p className="text-xs text-white/40 font-mono">{p.ruc}</p>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(p)}
                  className="rounded-lg p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              {p.contacto_nombre && (
                <p className="text-xs text-white/50">
                  <span className="text-white/30">Contacto:</span> {p.contacto_nombre}
                </p>
              )}
              {p.telefono && (
                <p className="text-xs text-white/50">
                  <span className="text-white/30">Tel:</span> {p.telefono}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0f] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">
                {editTarget ? "Editar proveedor" : "Nuevo proveedor"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10 text-white/50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">RUC *</label>
                <input className={inputCls} value={form.ruc} onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))} placeholder="20100070970" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Razón Social *</label>
                <input className={inputCls} value={form.razon_social} onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))} placeholder="Distribuidora Tech SAC" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Contacto</label>
                <input className={inputCls} value={form.contacto_nombre ?? ""} onChange={(e) => setForm((f) => ({ ...f, contacto_nombre: e.target.value }))} placeholder="Juan López" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Teléfono</label>
                <input className={inputCls} value={form.telefono ?? ""} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="999888777" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
