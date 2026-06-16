"use client"

import { useState, useMemo, useSyncExternalStore } from "react"
import {
  Wrench,
  Plus,
  CheckCircle2,
  Timer,
  CheckCheck,
  X,
  Search,
  Phone,
  User,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSession } from "@/lib/api/auth"
import { cn, formatNum } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────
type EstadoReparacion =
  | "Pendiente"
  | "En diagnóstico"
  | "En reparación"
  | "Esperando repuestos"
  | "Listo para entrega"
  | "Entregado"

interface Reparacion {
  id: string
  cliente: string
  telefono: string
  equipo: string
  marca: string
  modelo: string
  problema: string
  estado: EstadoReparacion
  fecha_ingreso: string
  fecha_estimada: string
  tecnico: string | null
  adelanto: number
  total_estimado: number
}

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_REPARACIONES: Reparacion[] = [
  {
    id: "REP-001",
    cliente: "Carlos Mendoza",
    telefono: "987 654 321",
    equipo: "Laptop",
    marca: "HP",
    modelo: "Pavilion 15",
    problema: "Pantalla con líneas horizontales, no enciende correctamente",
    estado: "En diagnóstico",
    fecha_ingreso: "2026-06-13",
    fecha_estimada: "2026-06-17",
    tecnico: "Juan Pérez",
    adelanto: 50,
    total_estimado: 280,
  },
  {
    id: "REP-002",
    cliente: "María García",
    telefono: "912 345 678",
    equipo: "Smartphone",
    marca: "Apple",
    modelo: "iPhone 13 Pro",
    problema: "Batería se descarga muy rápido, cámara trasera falla",
    estado: "En reparación",
    fecha_ingreso: "2026-06-12",
    fecha_estimada: "2026-06-16",
    tecnico: "Luis Torres",
    adelanto: 100,
    total_estimado: 350,
  },
  {
    id: "REP-003",
    cliente: "Pedro Ríos",
    telefono: "956 789 012",
    equipo: "PC Escritorio",
    marca: "Genérico",
    modelo: "Custom Build",
    problema: "No enciende, posible falla en fuente de poder o placa",
    estado: "Esperando repuestos",
    fecha_ingreso: "2026-06-11",
    fecha_estimada: "2026-06-18",
    tecnico: "Juan Pérez",
    adelanto: 0,
    total_estimado: 450,
  },
  {
    id: "REP-004",
    cliente: "Ana Flores",
    telefono: "943 210 987",
    equipo: "Smartphone",
    marca: "Samsung",
    modelo: "Galaxy S22",
    problema: "Pantalla rota, touch no responde en zona inferior",
    estado: "Listo para entrega",
    fecha_ingreso: "2026-06-10",
    fecha_estimada: "2026-06-15",
    tecnico: "Luis Torres",
    adelanto: 80,
    total_estimado: 200,
  },
  {
    id: "REP-005",
    cliente: "Roberto Vargas",
    telefono: "901 234 567",
    equipo: "Laptop",
    marca: "Apple",
    modelo: "MacBook Air M1",
    problema: "Teclado con varias teclas pegadas, trackpad sin click físico",
    estado: "Pendiente",
    fecha_ingreso: "2026-06-14",
    fecha_estimada: "2026-06-20",
    tecnico: null,
    adelanto: 0,
    total_estimado: 0,
  },
  {
    id: "REP-006",
    cliente: "Lucía Mamani",
    telefono: "978 901 234",
    equipo: "Impresora",
    marca: "Epson",
    modelo: "L3150",
    problema: "No imprime, cabezal posiblemente obstruido, luces parpadeantes",
    estado: "Entregado",
    fecha_ingreso: "2026-06-09",
    fecha_estimada: "2026-06-13",
    tecnico: "Juan Pérez",
    adelanto: 60,
    total_estimado: 120,
  },
]

const ESTADOS: EstadoReparacion[] = [
  "Pendiente",
  "En diagnóstico",
  "En reparación",
  "Esperando repuestos",
  "Listo para entrega",
  "Entregado",
]

const TECNICOS = ["Juan Pérez", "Luis Torres"]

const ESTADO_STYLE: Record<EstadoReparacion, { bg: string; text: string; dot: string }> = {
  "Pendiente":           { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  "En diagnóstico":      { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  "En reparación":       { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  "Esperando repuestos": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  "Listo para entrega":  { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  "Entregado":           { bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-400" },
}

const FILTROS = [
  "Todos",
  "Pendiente",
  "En diagnóstico",
  "En reparación",
  "Esperando repuestos",
  "Listo para entrega",
] as const
type Filtro = (typeof FILTROS)[number]

const MOCK_REPUESTOS = [
  { id: 1, nombre: "Pantalla LCD 15.6\" FHD",    precio: 85.00 },
  { id: 2, nombre: "Batería HP 11.4V 41Wh",      precio: 45.00 },
  { id: 3, nombre: "Pasta térmica Noctua NT-H1", precio: 12.50 },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function noopSubscribe() { return () => undefined }

function formatToday() {
  return new Date().toLocaleDateString("es-PE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
}

function fmtFecha(iso: string) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-PE", {
      day: "2-digit", month: "short", year: "numeric",
    })
  } catch {
    return iso
  }
}

// ── EstadoBadge ────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: EstadoReparacion }) {
  const s = ESTADO_STYLE[estado]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", s.bg, s.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
      {estado}
    </span>
  )
}

// ── Backdrop ───────────────────────────────────────────────────────────────
function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 bg-black/40"
      onClick={onClick}
    />
  )
}

// ── UpdateEstadoDialog ─────────────────────────────────────────────────────
function UpdateEstadoDialog({
  rep,
  onClose,
  onSave,
}: {
  rep: Reparacion
  onClose: () => void
  onSave: (id: string, estado: EstadoReparacion) => void
}) {
  const [estado, setEstado]   = useState<EstadoReparacion>(rep.estado)
  const [tecnico, setTecnico] = useState(rep.tecnico ?? "")
  const [nota, setNota]       = useState("")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-heading">Actualizar estado</h3>
            <p className="mt-0.5 text-sm text-text-muted">
              {rep.id} · {rep.equipo} {rep.marca} {rep.modelo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Estado de reparación
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoReparacion)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Técnico asignado
            </label>
            <select
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Sin asignar</option>
              {TECNICOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Nota de actualización{" "}
              <span className="normal-case font-normal">(opcional)</span>
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Se encontró daño en condensadores, se procede a reemplazo..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-heading placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { onSave(rep.id, estado); onClose() }}
          >
            Guardar cambio
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── AdelantoDialog ─────────────────────────────────────────────────────────
function AdelantoDialog({
  rep,
  onClose,
  onSave,
}: {
  rep: Reparacion
  onClose: () => void
  onSave: (id: string, monto: number) => void
}) {
  const [monto, setMonto] = useState("")
  const pendiente = rep.total_estimado > 0 ? rep.total_estimado - rep.adelanto : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-heading">Registrar adelanto</h3>
            <p className="mt-0.5 text-sm text-text-muted">{rep.id} · {rep.cliente}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 p-4 space-y-1.5 mb-5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Total estimado</span>
            <span className="font-semibold text-text-heading">S/{formatNum(rep.total_estimado)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Adelantos pagados</span>
            <span className="font-semibold text-green-600">S/{formatNum(rep.adelanto)}</span>
          </div>
          <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm">
            <span className="font-semibold text-text-heading">Saldo pendiente</span>
            <span className="font-bold text-text-heading">S/{formatNum(pendiente)}</span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
            Monto a registrar (S/)
          </label>
          <Input
            type="number"
            min={1}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
            className="rounded-xl text-base font-semibold"
            autoFocus
          />
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { onSave(rep.id, parseFloat(monto) || 0); onClose() }}
            disabled={!monto || parseFloat(monto) <= 0}
          >
            Registrar
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── RepuestosDialog ────────────────────────────────────────────────────────
function RepuestosDialog({
  rep,
  onClose,
}: {
  rep: Reparacion
  onClose: () => void
}) {
  const [rows, setRows] = useState(MOCK_REPUESTOS.map((r) => ({ ...r, usado: false, cantidad: 1 })))

  const toggle = (id: number) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, usado: !r.usado } : r))

  const total = rows.filter((r) => r.usado).reduce((s, r) => s + r.precio * r.cantidad, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-heading">Repuestos utilizados</h3>
            <p className="mt-0.5 text-sm text-text-muted">
              {rep.id} · {rep.equipo} {rep.marca} {rep.modelo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {rows.map((r) => (
            <label
              key={r.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                r.usado ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50",
              )}
            >
              <input
                type="checkbox"
                checked={r.usado}
                onChange={() => toggle(r.id)}
                className="h-4 w-4 rounded accent-blue-600"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-heading truncate">{r.nombre}</p>
                <p className="text-xs text-text-muted">Cant: {r.cantidad}</p>
              </div>
              <span className="text-sm font-semibold text-text-heading tabular-nums shrink-0">
                S/{formatNum(r.precio)}
              </span>
            </label>
          ))}
        </div>

        {total > 0 && (
          <div className="flex justify-between rounded-xl bg-gray-50 px-4 py-2.5 text-sm mb-4">
            <span className="font-semibold text-text-heading">Total repuestos</span>
            <span className="font-bold text-text-heading tabular-nums">S/{formatNum(total)}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white" onClick={onClose}>
            Registrar uso
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── NuevaReparacionDialog ──────────────────────────────────────────────────
function NuevaReparacionDialog({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (rep: Omit<Reparacion, "id">) => void
}) {
  const [form, setForm] = useState({
    cliente: "", telefono: "", equipo: "", marca: "", modelo: "",
    problema: "", tecnico: "", adelanto: "", total_estimado: "", fecha_estimada: "",
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const isValid = form.cliente.trim() && form.equipo.trim() && form.problema.trim()

  const handleSave = () => {
    if (!isValid) return
    onSave({
      cliente:        form.cliente.trim(),
      telefono:       form.telefono.trim(),
      equipo:         form.equipo.trim(),
      marca:          form.marca.trim(),
      modelo:         form.modelo.trim(),
      problema:       form.problema.trim(),
      estado:         "Pendiente",
      fecha_ingreso:  new Date().toISOString().split("T")[0],
      fecha_estimada: form.fecha_estimada,
      tecnico:        form.tecnico || null,
      adelanto:       parseFloat(form.adelanto) || 0,
      total_estimado: parseFloat(form.total_estimado) || 0,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl overflow-y-auto max-h-[92vh]"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-heading">Registrar equipo</h3>
            <p className="mt-0.5 text-sm text-text-muted">Ingreso al servicio técnico</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Cliente</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Nombre *</label>
              <Input value={form.cliente} onChange={set("cliente")} placeholder="Carlos Mendoza" className="rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Teléfono</label>
              <Input value={form.telefono} onChange={set("telefono")} placeholder="987 654 321" className="rounded-xl" />
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 pt-1">Equipo</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Tipo *</label>
              <Input value={form.equipo} onChange={set("equipo")} placeholder="Laptop" className="rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Marca</label>
              <Input value={form.marca} onChange={set("marca")} placeholder="HP" className="rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Modelo</label>
              <Input value={form.modelo} onChange={set("modelo")} placeholder="Pavilion 15" className="rounded-xl" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Problema reportado *</label>
            <textarea
              value={form.problema}
              onChange={set("problema")}
              placeholder="Describe el problema del equipo..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-heading placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 pt-1">Servicio</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Técnico asignado</label>
              <select
                value={form.tecnico}
                onChange={set("tecnico")}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-heading focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Sin asignar</option>
                {TECNICOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Fecha estimada de entrega</label>
              <Input type="date" value={form.fecha_estimada} onChange={set("fecha_estimada")} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Total estimado (S/)</label>
              <Input type="number" min={0} value={form.total_estimado} onChange={set("total_estimado")} placeholder="0.00" className="rounded-xl" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Adelanto inicial (S/)</label>
              <Input type="number" min={0} value={form.adelanto} onChange={set("adelanto")} placeholder="0.00" className="rounded-xl" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
            disabled={!isValid}
          >
            Registrar ingreso
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── TecnicoDashboard ───────────────────────────────────────────────────────
type DialogType = "update" | "adelanto" | "repuestos" | "nueva"

export function TecnicoDashboard() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>(MOCK_REPARACIONES)
  const [filtro, setFiltro]             = useState<Filtro>("Todos")
  const [search, setSearch]             = useState("")
  const [dialog, setDialog]             = useState<{ type: DialogType; target: Reparacion | null } | null>(null)

  const session   = useSyncExternalStore(noopSubscribe, getSession, () => null)
  const today     = useSyncExternalStore(noopSubscribe, formatToday, () => "")
  const firstName = session?.nombre?.split(" ")[0] ?? ""

  const activas     = reparaciones.filter((r) => r.estado !== "Entregado").length
  const diagnostico = reparaciones.filter((r) => r.estado === "En diagnóstico").length
  const listos      = reparaciones.filter((r) => r.estado === "Listo para entrega").length
  const entregados  = reparaciones.filter((r) => r.estado === "Entregado").length

  const STAT_CARDS = [
    { label: "Reparaciones activas", value: activas,     icon: Wrench,       sub: "en proceso",              dark: true  },
    { label: "En diagnóstico",       value: diagnostico, icon: Timer,        sub: "esperando evaluación",    dark: false },
    { label: "Listos para entrega",  value: listos,      icon: CheckCheck,   sub: "aguardando al cliente",   dark: false },
    { label: "Entregados",           value: entregados,  icon: CheckCircle2, sub: "completados",             dark: false },
  ]

  const filtered = useMemo(() => {
    let list = reparaciones
    if (filtro !== "Todos") list = list.filter((r) => r.estado === filtro)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.equipo.toLowerCase().includes(q) ||
          r.marca.toLowerCase().includes(q) ||
          r.modelo.toLowerCase().includes(q),
      )
    }
    return list
  }, [reparaciones, filtro, search])

  const handleUpdateEstado = (id: string, estado: EstadoReparacion) =>
    setReparaciones((prev) => prev.map((r) => r.id === id ? { ...r, estado } : r))

  const handleAdelanto = (id: string, monto: number) =>
    setReparaciones((prev) => prev.map((r) => r.id === id ? { ...r, adelanto: r.adelanto + monto } : r))

  const handleNueva = (rep: Omit<Reparacion, "id">) => {
    const id = `REP-${String(reparaciones.length + 1).padStart(3, "0")}`
    setReparaciones((prev) => [{ ...rep, id }, ...prev])
  }

  const open = (type: DialogType, target: Reparacion | null = null) => setDialog({ type, target })

  return (
    <div className="min-h-full bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        {/* Greeting + CTA */}
        <BlurFade delay={0} duration={0.35}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-text-heading">
                Bienvenido{firstName ? `, ${firstName}` : ""}
              </h2>
              <p className="mt-1 text-sm capitalize text-text-muted">{today}</p>
            </div>
            <Button
              onClick={() => open("nueva")}
              className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Registrar equipo
            </Button>
          </div>
        </BlurFade>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STAT_CARDS.map((s, i) => (
            <BlurFade key={s.label} delay={0.06 + i * 0.06} duration={0.35}>
              <div
                className={cn(
                  "rounded-2xl p-5 shadow-sm",
                  s.dark
                    ? "border border-white/5 bg-linear-to-br from-black to-[#131B2E]"
                    : "border border-gray-200 bg-white",
                )}
              >
                <div className="flex items-start justify-between">
                  <p className={cn("text-xs font-semibold uppercase tracking-wider leading-tight pr-2", s.dark ? "text-text-on-dark" : "text-text-muted")}>
                    {s.label}
                  </p>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <s.icon className="h-4 w-4 text-gray-900" />
                  </div>
                </div>
                <p className={cn("mt-3 text-4xl font-extrabold tabular-nums", s.dark ? "text-white" : "text-text-heading")}>
                  <NumberTicker value={s.value} decimalPlaces={0} />
                </p>
                <p className={cn("mt-2 text-xs", s.dark ? "text-text-on-dark" : "text-text-muted")}>
                  {s.sub}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>

        {/* Alert listos */}
        {listos > 0 && (
          <BlurFade delay={0.3} duration={0.3}>
            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              <span>
                {listos} equipo{listos > 1 ? "s" : ""} listo{listos > 1 ? "s" : ""} para entrega al cliente.
              </span>
            </div>
          </BlurFade>
        )}

        {/* Reparaciones table */}
        <BlurFade delay={0.32} duration={0.35}>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text-heading">Reparaciones</h3>
                  <p className="mt-0.5 text-xs text-text-muted">{filtered.length} resultado(s)</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cliente, equipo..."
                    className="rounded-xl pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {FILTROS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                      filtro === f
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {[
                      { label: "ID",          align: "left"   },
                      { label: "Cliente",     align: "left"   },
                      { label: "Equipo",      align: "left"   },
                      { label: "Estado",      align: "left"   },
                      { label: "Ingreso",     align: "left"   },
                      { label: "Total S/",    align: "right"  },
                      { label: "Adelanto S/", align: "right"  },
                      { label: "Acciones",    align: "center" },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={cn(
                          "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                          h.align === "right"  && "text-right",
                          h.align === "center" && "text-center",
                          h.align === "left"   && "text-left",
                        )}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-text-muted">
                        Sin resultados
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        className="hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-muted whitespace-nowrap">
                          {r.id}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <div className="font-semibold text-text-heading">{r.cliente}</div>
                          <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            {r.telefono}
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-[130px]">
                          <div className="font-medium text-text-heading">{r.equipo}</div>
                          <div className="text-xs text-text-muted">{r.marca} {r.modelo}</div>
                        </td>
                        <td className="px-4 py-3 min-w-[170px]">
                          <EstadoBadge estado={r.estado} />
                          {r.tecnico && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-text-muted">
                              <User className="h-3 w-3 shrink-0" />
                              {r.tecnico}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                          {fmtFecha(r.fecha_ingreso)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-text-heading whitespace-nowrap">
                          {r.total_estimado > 0 ? `S/${formatNum(r.total_estimado)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {r.adelanto > 0 ? (
                            <span className="font-semibold tabular-nums text-green-600">
                              S/{formatNum(r.adelanto)}
                            </span>
                          ) : (
                            <span className="text-text-muted">S/0.00</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => open("update", r)}
                              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors whitespace-nowrap"
                            >
                              Estado
                            </button>
                            {r.estado !== "Entregado" && (
                              <>
                                <button
                                  onClick={() => open("adelanto", r)}
                                  className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600 hover:bg-green-100 transition-colors whitespace-nowrap"
                                >
                                  Adelanto
                                </button>
                                <button
                                  onClick={() => open("repuestos", r)}
                                  className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-100 transition-colors whitespace-nowrap"
                                >
                                  Repuestos
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </BlurFade>
      </div>

      {/* Dialogs */}
      <AnimatePresence>
        {dialog?.type === "update" && dialog.target && (
          <UpdateEstadoDialog
            key="update"
            rep={dialog.target}
            onClose={() => setDialog(null)}
            onSave={handleUpdateEstado}
          />
        )}
        {dialog?.type === "adelanto" && dialog.target && (
          <AdelantoDialog
            key="adelanto"
            rep={dialog.target}
            onClose={() => setDialog(null)}
            onSave={handleAdelanto}
          />
        )}
        {dialog?.type === "repuestos" && dialog.target && (
          <RepuestosDialog
            key="repuestos"
            rep={dialog.target}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.type === "nueva" && (
          <NuevaReparacionDialog
            key="nueva"
            onClose={() => setDialog(null)}
            onSave={handleNueva}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
