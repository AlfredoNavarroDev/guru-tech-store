"use client"

import { ClientePicker } from "@/components/shared/ClientePicker"
import { useNuevaReparacion } from "../_context/nueva-reparacion.context"

export function Step1Cliente() {
  const { idCliente, setIdCliente } = useNuevaReparacion()

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Cliente *
      </h2>
      <ClientePicker onSelect={(c) => setIdCliente(c?.id_cliente ?? null)} />
      {!idCliente && (
        <p className="mt-2 text-[11px] text-gray-400">
          Busca y selecciona un cliente registrado
        </p>
      )}
    </div>
  )
}
