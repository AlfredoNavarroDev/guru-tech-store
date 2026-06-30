"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type ChecklistKey =
  | "pantalla"
  | "touch"
  | "bateria"
  | "camara"
  | "altavoz"
  | "microfono"
  | "zocalo"
  | "carcasa"

export type ChecklistEstado = "ok" | "dañado" | "no aplica"

export type RepuestoSeleccionado = {
  id_item: number
  nombre: string
  sku: string
  precio_compra_actual: number
  cantidad: number
  precio_cobrado: number
  stock_disponible: number
}

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia" | "yape" | "plin" | "otro"

export type PagoEntry = { metodo: MetodoPago; monto: string }

type NuevaReparacionContextType = {
  // Step 1
  idCliente: number | null
  setIdCliente: (v: number | null) => void
  // Step 2
  marca: string
  setMarca: (v: string) => void
  modelo: string
  setModelo: (v: string) => void
  imei: string
  setImei: (v: string) => void
  estaEncendido: boolean | null
  setEstaEncendido: (v: boolean | null) => void
  checklist: Partial<Record<ChecklistKey, ChecklistEstado>>
  setChecklist: (
    fn: (
      prev: Partial<Record<ChecklistKey, ChecklistEstado>>,
    ) => Partial<Record<ChecklistKey, ChecklistEstado>>,
  ) => void
  fotoBase64: string | null
  setFotoBase64: (v: string | null) => void
  fotoContentType: "image/jpeg" | "image/png" | "image/webp" | null
  setFotoContentType: (v: "image/jpeg" | "image/png" | "image/webp" | null) => void
  // Step 3
  tipoServicio: "software" | "hardware" | "mixto" | null
  setTipoServicio: (v: "software" | "hardware" | "mixto" | null) => void
  diagnostico: string
  setDiagnostico: (v: string) => void
  fechaEst: string
  setFechaEst: (v: string) => void
  cotizado: string
  setCotizado: (v: string) => void
  // Step 4
  repuestos: RepuestoSeleccionado[]
  setRepuestos: (fn: (prev: RepuestoSeleccionado[]) => RepuestoSeleccionado[]) => void
  // Step 5
  tipoDescuento: "porcentaje" | "monto_fijo"
  setTipoDescuento: (v: "porcentaje" | "monto_fijo") => void
  valorDescuento: string
  setValorDescuento: (v: string) => void
  justificacionDescuento: string
  setJustificacionDescuento: (v: string) => void
  pagos: PagoEntry[]
  setPagos: (fn: (prev: PagoEntry[]) => PagoEntry[]) => void
}

const NuevaReparacionContext = createContext<NuevaReparacionContextType | null>(null)

export function NuevaReparacionProvider({ children }: { children: ReactNode }) {
  const [idCliente, setIdCliente] = useState<number | null>(null)
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [imei, setImei] = useState("")
  const [estaEncendido, setEstaEncendido] = useState<boolean | null>(null)
  const [checklist, setChecklist] = useState<Partial<Record<ChecklistKey, ChecklistEstado>>>({})
  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [fotoContentType, setFotoContentType] = useState<
    "image/jpeg" | "image/png" | "image/webp" | null
  >(null)
  const [tipoServicio, setTipoServicio] = useState<"software" | "hardware" | "mixto" | null>(null)
  const [diagnostico, setDiagnostico] = useState("")
  const [fechaEst, setFechaEst] = useState("")
  const [cotizado, setCotizado] = useState("")
  const [repuestos, setRepuestos] = useState<RepuestoSeleccionado[]>([])
  const [tipoDescuento, setTipoDescuento] = useState<"porcentaje" | "monto_fijo">("monto_fijo")
  const [valorDescuento, setValorDescuento] = useState("")
  const [justificacionDescuento, setJustificacionDescuento] = useState("")
  const [pagos, setPagos] = useState<PagoEntry[]>([{ metodo: "efectivo", monto: "" }])

  return (
    <NuevaReparacionContext.Provider
      value={{
        idCliente, setIdCliente,
        marca, setMarca,
        modelo, setModelo,
        imei, setImei,
        estaEncendido, setEstaEncendido,
        checklist, setChecklist,
        fotoBase64, setFotoBase64,
        fotoContentType, setFotoContentType,
        tipoServicio, setTipoServicio,
        diagnostico, setDiagnostico,
        fechaEst, setFechaEst,
        cotizado, setCotizado,
        repuestos, setRepuestos,
        tipoDescuento, setTipoDescuento,
        valorDescuento, setValorDescuento,
        justificacionDescuento, setJustificacionDescuento,
        pagos, setPagos,
      }}
    >
      {children}
    </NuevaReparacionContext.Provider>
  )
}

export function useNuevaReparacion() {
  const ctx = useContext(NuevaReparacionContext)
  if (!ctx) throw new Error("useNuevaReparacion must be used inside NuevaReparacionProvider")
  return ctx
}
