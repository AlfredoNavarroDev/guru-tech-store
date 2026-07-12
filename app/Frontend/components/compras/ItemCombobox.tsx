"use client"

import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import type { Item } from "@/lib/api/items"

interface ItemComboboxProps {
  items: Item[]
  value: Item | null
  onChange: (item: Item) => void
  onCreateNew: (name: string) => void
}

export function ItemCombobox({ items, value, onChange, onCreateNew }: ItemComboboxProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.length >= 1
    ? items
        .filter(
          (i) =>
            i.nombre.toLowerCase().includes(query.toLowerCase()) ||
            i.sku.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : []

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleSelect(item: Item) {
    onChange(item)
    setQuery("")
    setOpen(false)
  }

  function handleCreateNew() {
    onCreateNew(query)
    setQuery("")
    setOpen(false)
  }

  const inputCls =
    "flex items-center gap-2 w-full rounded-xl border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-lime-dark/10 transition-colors"

  // Display mode — item selected, not editing
  if (value && !open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className={`${inputCls} border-lime-dark text-left`}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="flex-1 truncate text-gray-900">{value.nombre}</span>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {value.sku}
        </span>
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={`${inputCls} border-gray-200`}>
        <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          autoFocus={open}
          className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          placeholder="Buscar por nombre o SKU..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && (filtered.length > 0 || query.length >= 2) && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.map((item) => (
            <button
              key={item.id_item}
              type="button"
              className="flex w-full items-center gap-2.5 border-b border-gray-50 px-3 py-2 text-left last:border-none hover:bg-gray-50"
              onClick={() => handleSelect(item)}
            >
              {item.imagen_url ? (
                <img
                  src={item.imagen_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm">
                  📦
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">
                  {item.nombre}
                </div>
                <div className="text-xs text-gray-500">{item.sku}</div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  item.stock_disponible > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                Stock {item.stock_disponible}
              </span>
            </button>
          ))}
          {query.length >= 2 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
              onClick={handleCreateNew}
            >
              <span>📦</span>
              Crear &ldquo;{query}&rdquo; como nuevo ítem
            </button>
          )}
        </div>
      )}
    </div>
  )
}
