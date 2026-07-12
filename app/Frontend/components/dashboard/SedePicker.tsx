"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSedes, type Sede } from "@/lib/api/sedes"

interface SidebarPickerProps {
  isCollapsed: boolean
}

export function SedePicker({ isCollapsed }: SidebarPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sedes, setSedes] = useState<Sede[]>([])
  const [open, setOpen] = useState(false)

  const currentSedeId = searchParams.get("sede")
    ? parseInt(searchParams.get("sede")!, 10)
    : null
  const currentSede = sedes.find((s) => s.id_sede === currentSedeId)

  useEffect(() => {
    getSedes().then(setSedes).catch(console.error)
  }, [])

  function selectSede(idSede: number | null) {
    setOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    if (idSede == null) {
      params.delete("sede")
    } else {
      params.set("sede", String(idSede))
    }
    router.push(`?${params.toString()}`)
  }

  if (isCollapsed) {
    return (
      <div className="flex justify-center px-0 py-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
          title={currentSede?.nombre ?? "Todas las sedes"}
          onClick={() => setOpen((p) => !p)}
        >
          <MapPin className="h-4 w-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative px-3 py-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
          open
            ? "border-lime/60 bg-lime text-[#020617]"
            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
        )}
      >
        <MapPin className={cn("h-3.5 w-3.5 shrink-0", open ? "text-[#020617]/60" : "text-white/50")} />
        <span className="flex-1 truncate text-xs font-medium">
          {currentSede?.nombre ?? "Todas las sedes"}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open ? "rotate-180 text-[#020617]/60" : "text-white/40")} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-xl border border-lime/30 bg-lime shadow-xl shadow-lime/20">
          <button
            onClick={() => selectSede(null)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[#d4f96a]",
              currentSedeId == null ? "font-semibold text-[#020617]" : "text-[#020617]/70",
            )}
          >
            <MapPin className="h-3 w-3 shrink-0" />
            Todas las sedes
          </button>
          {sedes.map((s) => (
            <button
              key={s.id_sede}
              onClick={() => selectSede(s.id_sede)}
              className={cn(
                "flex w-full items-center gap-2 border-t border-[#020617]/10 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[#d4f96a]",
                currentSedeId === s.id_sede ? "font-semibold text-[#020617]" : "text-[#020617]/70",
              )}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {s.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
