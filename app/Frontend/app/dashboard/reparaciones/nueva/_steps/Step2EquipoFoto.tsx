"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Power, PowerOff, X, ChevronDown, Camera, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useNuevaReparacion,
  type ChecklistKey,
  type ChecklistEstado,
} from "../_context/nueva-reparacion.context"

const MARCAS_PREDEFINIDAS = ["Samsung", "Huawei", "Motorola", "Xiaomi", "iPhone"]

const CHECKLIST_ITEMS: { key: ChecklistKey; label: string }[] = [
  { key: "pantalla",       label: "Pantalla" },
  { key: "bateria",        label: "Batería" },
  { key: "zocalo",         label: "Zócalo" },
  { key: "carcasa",        label: "Carcasa" },
  { key: "camara_frontal", label: "Cámara frontal" },
  { key: "camara_trasera", label: "Cámara trasera" },
  { key: "altavoz",        label: "Altavoz" },
  { key: "microfono",      label: "Micrófono" },
  { key: "tactil",         label: "Táctil" },
  { key: "brillo_pantalla",label: "Brillo/pantalla" },
  { key: "wifi",           label: "WiFi" },
  { key: "bluetooth",      label: "Bluetooth" },
  { key: "huella",         label: "Huella" },
  { key: "face_id",        label: "Face ID" },
]

const CHECKS_REQUIRE_ENCENDIDO: ChecklistKey[] = [
  "camara_frontal", "camara_trasera", "altavoz", "microfono",
  "tactil", "brillo_pantalla", "wifi", "bluetooth", "huella", "face_id",
]

export function Step2EquipoFoto() {
  const {
    marca, setMarca,
    modelo, setModelo,
    imei, setImei,
    estaEncendido, setEstaEncendido,
    checklist, setChecklist,
    fotoBase64, setFotoBase64,
    setFotoContentType,
  } = useNuevaReparacion()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [marcaOpcion, setMarcaOpcion] = useState<string>(() => {
    if (!marca) return ""
    return MARCAS_PREDEFINIDAS.includes(marca) ? marca : "Otro"
  })

  function selectMarca(opcion: string) {
    setMarcaOpcion(opcion)
    if (opcion !== "Otro") setMarca(opcion)
    else setMarca("")
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(",")[1]
      setFotoBase64(base64)
      setFotoContentType(file.type as "image/jpeg" | "image/png" | "image/webp")
    }
    reader.readAsDataURL(file)
  }

  function setChecklistItem(key: ChecklistKey, value: ChecklistEstado) {
    setChecklist((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Equipo */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Equipo *
        </h2>
        {/* Marca */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-text-muted">
            Marca <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MARCAS_PREDEFINIDAS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => selectMarca(m)}
                className={cn(
                  "rounded-xl border py-2 text-sm font-medium transition-colors",
                  marcaOpcion === m
                    ? "border-[#020617] bg-[#020617]/5 text-[#020617]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[#020617]/25 hover:bg-[#020617]/5",
                )}
              >
                {m}
              </button>
            ))}
            <button
              type="button"
              onClick={() => selectMarca("Otro")}
              className={cn(
                "rounded-xl border py-2 text-sm font-medium transition-colors",
                marcaOpcion === "Otro"
                  ? "border-[#020617] bg-[#020617]/5 text-[#020617]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#020617]/25 hover:bg-[#020617]/5",
              )}
            >
              Otro
            </button>
          </div>
          <AnimatePresence>
            {marcaOpcion === "Otro" && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <Input
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Escribe la marca..."
                  className="rounded-xl"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modelo e IMEI */}
        <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Modelo <span className="text-red-400">*</span></label>
            <Input
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Galaxy S21"
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">IMEI</label>
            <Input
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
              placeholder="15 dígitos"
              className="rounded-xl font-mono"
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-text-muted">
            Estado al ingreso
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEstaEncendido(true)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                estaEncendido === true
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              <Power className="h-4 w-4" /> Enciende
            </button>
            <button
              type="button"
              onClick={() => setEstaEncendido(false)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                estaEncendido === false
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
              )}
            >
              <PowerOff className="h-4 w-4" /> No enciende
            </button>
            {estaEncendido !== null && (
              <button
                type="button"
                onClick={() => setEstaEncendido(null)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Checklist de estado físico
        </h2>
        <p className="mb-4 text-[11px] text-gray-400">
          Marca solo los componentes relevantes para este equipo
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {CHECKLIST_ITEMS.map(({ key, label }) => {
            const estado = checklist[key]
            const isBlocked = estaEncendido === false && CHECKS_REQUIRE_ENCENDIDO.includes(key)
            return (
              <div
                key={key}
                className={cn("flex items-center justify-between gap-2", isBlocked && "opacity-40")}
                title={isBlocked ? "Requiere equipo encendido" : undefined}
              >
                <span className="text-xs font-medium text-gray-700">{label}</span>
                <div className="relative">
                  <select
                    value={estado ?? ""}
                    disabled={isBlocked}
                    onChange={(e) => {
                      if (isBlocked) return
                      const v = e.target.value as ChecklistEstado | ""
                      if (v === "") {
                        setChecklist((prev) => {
                          const next = { ...prev }
                          delete next[key]
                          return next
                        })
                      } else {
                        setChecklistItem(key, v)
                      }
                    }}
                    className={cn(
                      "appearance-none rounded-lg border px-2 py-1.5 pr-6 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#020617]/10",
                      isBlocked
                        ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                        : estado === "ok"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : estado === "dañado"
                            ? "border-red-200 bg-red-50 text-red-600"
                            : estado === "no aplica"
                              ? "border-gray-200 bg-gray-50 text-gray-400"
                              : "border-gray-200 bg-white text-gray-500",
                    )}
                  >
                    <option value="">—</option>
                    <option value="ok">OK</option>
                    <option value="dañado">Dañado</option>
                    <option value="no aplica">N/A</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Foto de ingreso */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Foto de ingreso
        </h2>
        <p className="mb-4 text-[11px] text-gray-400">Opcional — evidencia del estado del equipo</p>

        {fotoBase64 ? (
          <div className="flex items-start gap-3">
            <img
              src={`data:image/jpeg;base64,${fotoBase64}`}
              alt="Foto de ingreso"
              className="h-24 w-24 rounded-xl object-cover border border-gray-200"
            />
            <button
              type="button"
              onClick={() => {
                setFotoBase64(null)
                setFotoContentType(null)
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar foto
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-5 py-4 text-sm text-gray-500 hover:border-[#020617]/30 hover:text-[#020617] transition-colors"
          >
            <Camera className="h-4 w-4" />
            Tomar foto / seleccionar archivo
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
