import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNum(n: number | string | null | undefined, decimals = 2): string {
  return Number(n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(String(iso).slice(0, 10) + "T00:00:00").toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return String(iso).slice(0, 10)
  }
}

export function repId(id: number): string {
  return `REP-${String(id).padStart(3, "0")}`
}

export function limaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })
}

export function limaDate(iso: string | Date | null | undefined): string {
  if (!iso) return ""
  return new Date(String(iso)).toLocaleDateString("en-CA", { timeZone: "America/Lima" })
}
