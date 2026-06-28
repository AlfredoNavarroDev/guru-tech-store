"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Search, X, UserPlus, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getClientes, createCliente, type ClienteVista } from "@/lib/api/clientes"
import { toast } from "sonner"

const TIPOS_DOC = ["DNI", "CE", "pasaporte"] as const

export function ClientePicker({ onSelect }: { onSelect: (c: ClienteVista | null) => void }) {
  const [allClientes, setAllClientes]   = useState<ClienteVista[]>([])
  const [search, setSearch]             = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected]         = useState<ClienteVista | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // create form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTipoDoc, setNewTipoDoc]         = useState<"DNI" | "CE" | "pasaporte">("DNI")
  const [newNroDoc, setNewNroDoc]           = useState("")
  const [newNombre, setNewNombre]           = useState("")
  const [newTelefono, setNewTelefono]       = useState("")
  const [newDireccion, setNewDireccion]     = useState("")
  const [creating, setCreating]             = useState(false)

  useEffect(() => {
    getClientes().then(setAllClientes).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick, { passive: true })
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = search.trim()
    ? allClientes.filter(
        (c) =>
          c.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
          c.nro_documento.includes(search)
      )
    : allClientes

  const pick = (c: ClienteVista) => {
    setSelected(c)
    setSearch("")
    setShowDropdown(false)
    onSelect(c)
  }

  const clear = () => {
    setSelected(null)
    setSearch("")
    onSelect(null)
  }

  async function handleCreate() {
    if (!newNroDoc.trim() || !newNombre.trim()) {
      toast.error("Nro. documento y nombre son requeridos")
      return
    }
    setCreating(true)
    try {
      const cliente = await createCliente({
        tipo_documento: newTipoDoc,
        nro_documento: newNroDoc.trim(),
        nombre_completo: newNombre.trim(),
        telefono: newTelefono.trim() || undefined,
        direccion_completa: newDireccion.trim() || undefined,
      })
      setAllClientes((prev) => [cliente, ...prev])
      setShowCreateForm(false)
      setNewNroDoc(""); setNewNombre(""); setNewTelefono(""); setNewDireccion("")
      setNewTipoDoc("DNI")
      pick(cliente)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear cliente")
    } finally {
      setCreating(false)
    }
  }

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 uppercase">
          {selected.nombre_completo.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-blue-700">{selected.nombre_completo}</p>
          <p className="text-xs text-gray-500">
            {selected.tipo_documento} {selected.nro_documento}
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 transition-colors"
          aria-label="Quitar cliente"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o documento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            className="h-9 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {showDropdown && filtered.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {filtered.map((c) => (
              <button
                key={c.id_cliente}
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 uppercase">
                  {c.nombre_completo.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{c.nombre_completo}</p>
                  <p className="text-xs text-gray-400">{c.tipo_documento} {c.nro_documento}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowCreateForm((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
      >
        <UserPlus className="h-4 w-4" />
        Crear cliente nuevo
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform duration-200",
            showCreateForm && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex gap-2">
                <div className="relative w-28 shrink-0">
                  <select
                    value={newTipoDoc}
                    onChange={(e) => setNewTipoDoc(e.target.value as typeof newTipoDoc)}
                    className="h-9 w-full appearance-none rounded-xl border border-gray-300 bg-white px-3 pr-7 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Nro. documento *"
                  value={newNroDoc}
                  onChange={(e) => setNewNroDoc(e.target.value)}
                  className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="text"
                placeholder="Nombre completo *"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Dirección"
                  value={newDireccion}
                  onChange={(e) => setNewDireccion(e.target.value)}
                  className="h-9 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating || !newNroDoc.trim() || !newNombre.trim()}
                size="sm"
                className="h-9 w-full gap-2 bg-[#020617] text-white hover:bg-[#0d1b38] disabled:opacity-40"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                Crear cliente
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
