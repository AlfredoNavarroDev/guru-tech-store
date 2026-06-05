"use client"

import { useState, useRef, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const DAYS_SHORT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"]

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}
function firstDayOfMonth(y: number, m: number) {
  return new Date(y, m, 1).getDay()
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}
function formatDisplay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1].slice(0, 3)} ${y}`
}

export interface DatePickerProps {
  value?: string
  onChange?: (v: string | undefined) => void
  placeholder?: string
  className?: string
  align?: "left" | "right"
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  align = "left",
}: DatePickerProps) {
  const today = new Date()
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() =>
    value ? parseInt(value.split("-")[0]) : today.getFullYear()
  )
  const [viewMonth, setViewMonth] = useState(() =>
    value ? parseInt(value.split("-")[1]) - 1 : today.getMonth()
  )

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function selectDay(day: number) {
    onChange?.(toISO(viewYear, viewMonth, day))
    setOpen(false)
  }

  const total = daysInMonth(viewYear, viewMonth)
  const first = firstDayOfMonth(viewYear, viewMonth)
  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-2xl border bg-white px-3 text-sm transition-all",
          value
            ? "border-accent-cyan text-text-heading shadow-sm"
            : "border-gray-200 text-text-muted hover:border-accent-cyan hover:text-accent-cyan",
          open && "border-accent-cyan ring-2 ring-accent-cyan/20"
        )}
      >
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span>{value ? formatDisplay(value) : placeholder}</span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {/* Month / year header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-accent-cyan/10 hover:text-accent-cyan"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-text-heading">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-accent-cyan/10 hover:text-accent-cyan"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="mb-1 grid grid-cols-7">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-semibold text-text-muted">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const iso = toISO(viewYear, viewMonth, day)
              const isSelected = iso === value
              const isToday = iso === todayISO
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-xl text-sm transition-colors",
                    isSelected
                      ? "bg-primary-lime font-bold text-black"
                      : isToday
                        ? "font-bold text-accent-cyan ring-2 ring-accent-cyan"
                        : "text-text-heading hover:bg-gray-100"
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => { onChange?.(todayISO); setOpen(false) }}
              className="flex-1 rounded-xl py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-accent-cyan/10 hover:text-accent-cyan"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => { onChange?.(undefined); setOpen(false) }}
              className="flex-1 rounded-xl py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-accent-cyan/10 hover:text-accent-cyan"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
