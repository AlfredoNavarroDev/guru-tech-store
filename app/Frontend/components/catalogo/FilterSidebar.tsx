"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Filter, ChevronDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ─── FilterCheckbox ───────────────────────────────────────────────────────────

interface FilterCheckboxProps {
  label: string
  checked: boolean
  onChange: () => void
}

function FilterCheckbox({ label, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={onChange}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            onChange()
          }
        }}
        className={cn(
          "h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
          checked ? "bg-[#020617] border-[#020617]" : "bg-white border-gray-300 group-hover:border-gray-400"
        )}
      >
        {checked && (
          <svg className="h-2.5 w-2.5 text-lime" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 5L4 7.5L8.5 2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className={cn("text-xs leading-tight truncate", checked ? "text-gray-900 font-medium" : "text-gray-600")}>
        {label}
      </span>
    </label>
  )
}

// ─── FilterSection ─────────────────────────────────────────────────────────────

interface FilterSectionProps {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function FilterSection({ title, open, onToggle, children }: FilterSectionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="flex flex-col gap-1.5 px-4 pb-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── FilterSidebarSkeleton ────────────────────────────────────────────────────

export function FilterSidebarSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <Filter className="h-3.5 w-3.5 text-gray-300" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="flex flex-col divide-y divide-gray-100">
        {[
          [72, 56, 80, 64],
          [60, 88, 52],
        ].map((widths, si) => (
          <div key={si}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-3 rounded" />
            </div>
            <div className="flex flex-col gap-2 px-4 pb-3">
              {widths.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <Skeleton className="h-3" style={{ width: w }} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="px-4 py-3 flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── FilterSidebar ─────────────────────────────────────────────────────────────

export interface FilterSidebarProps {
  categorias: string[]
  marcas: string[]
  modelos: string[]
  selectedCategorias: Set<string>
  selectedMarcas: Set<string>
  selectedModelos: Set<string>
  soloConStock: boolean
  soloConPromo: boolean
  onToggleCategoria: (cat: string) => void
  onToggleMarca: (marca: string) => void
  onToggleModelo: (modelo: string) => void
  onToggleStock: (checked: boolean) => void
  onTogglePromo: () => void
  onClearAll: () => void
}

function FilterPanelContent({
  categorias,
  marcas,
  modelos,
  selectedCategorias,
  selectedMarcas,
  selectedModelos,
  soloConStock,
  soloConPromo,
  onToggleCategoria,
  onToggleMarca,
  onToggleModelo,
  onToggleStock,
  onTogglePromo,
  onClearAll,
}: FilterSidebarProps) {
  const [openSections, setOpenSections] = useState({
    categorias: true,
    marcas: true,
    modelos: true,
  })

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }))
  }

  const activeCount =
    selectedCategorias.size +
    selectedMarcas.size +
    selectedModelos.size +
    (soloConPromo ? 1 : 0)

  return (
    <div className="flex flex-col divide-y divide-gray-100 overflow-y-auto">
      {categorias.length > 0 && (
        <FilterSection
          title="Categoría"
          open={openSections.categorias}
          onToggle={() => toggleSection("categorias")}
        >
          {categorias.map((cat) => (
            <FilterCheckbox
              key={cat}
              label={cat}
              checked={selectedCategorias.has(cat)}
              onChange={() => onToggleCategoria(cat)}
            />
          ))}
        </FilterSection>
      )}

      {marcas.length > 0 && (
        <FilterSection
          title="Marca"
          open={openSections.marcas}
          onToggle={() => toggleSection("marcas")}
        >
          {marcas.map((m) => (
            <FilterCheckbox
              key={m}
              label={m}
              checked={selectedMarcas.has(m)}
              onChange={() => onToggleMarca(m)}
            />
          ))}
        </FilterSection>
      )}

      {modelos.length > 0 && (
        <FilterSection
          title="Modelo"
          open={openSections.modelos}
          onToggle={() => toggleSection("modelos")}
        >
          {modelos.map((mod) => (
            <FilterCheckbox
              key={mod}
              label={mod}
              checked={selectedModelos.has(mod)}
              onChange={() => onToggleModelo(mod)}
            />
          ))}
        </FilterSection>
      )}

      <div className="px-4 py-3 flex flex-col gap-3">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="text-xs text-gray-600">Solo con stock</span>
          <div
            role="switch"
            aria-checked={soloConStock}
            tabIndex={0}
            onClick={() => onToggleStock(!soloConStock)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault()
                onToggleStock(!soloConStock)
              }
            }}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1",
              soloConStock ? "bg-[#020617]" : "bg-gray-200"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                soloConStock ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </div>
        </label>
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="text-xs text-gray-600">En promoción</span>
          <div
            role="switch"
            aria-checked={soloConPromo}
            tabIndex={0}
            onClick={() => onTogglePromo()}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault()
                onTogglePromo()
              }
            }}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
              soloConPromo ? "bg-blue-500" : "bg-gray-200"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                soloConPromo ? "translate-x-4" : "translate-x-0.5"
              )}
            />
          </div>
        </label>
      </div>

      {activeCount > 0 && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500">
            {activeCount} activo{activeCount !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  )
}

export function FilterSidebar(props: FilterSidebarProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <Filter className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-sm font-semibold text-gray-900">Filtros</span>
      </div>
      <FilterPanelContent {...props} />
    </div>
  )
}

export { FilterPanelContent }
