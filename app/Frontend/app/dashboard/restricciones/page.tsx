'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Lock, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { BlurFade } from '@/components/ui/blur-fade'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getRestricciones,
  upsertItemRestriccion,
  upsertCategoriaRestriccion,
  type ItemRestriccion,
  type CategoriaRestriccion,
} from '@/lib/api/restricciones'
import { getItems, getCategorias } from '@/lib/api/items'

type Tab = 'items' | 'categorias'

const PAGE_SIZE = 10

// ─── Toggle ─────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-[#06B6D4]' : 'bg-gray-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse"
        >
          <div className="flex-1 h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-5 w-9 bg-gray-200 rounded-full" />
          <div className="h-8 w-28 bg-gray-200 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RestriccionesPage() {
  const [tab, setTab] = useState<Tab>('items')
  const [data, setData] = useState<{ items: ItemRestriccion[]; categorias: CategoriaRestriccion[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  function switchTab(t: Tab) {
    setTab(t)
    setPage(1)
    setSearch('')
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [restricciones, allItems, allCategorias] = await Promise.all([
        getRestricciones(),
        getItems({ limit: 200 }),
        getCategorias(),
      ])

      const itemsMap = new Map(restricciones.items.map((r) => [r.id_item, r]))
      const mergedItems: ItemRestriccion[] = allItems.items.map((i) =>
        itemsMap.get(i.id_item) ?? { id_item: i.id_item, nombre: i.nombre, es_no_cambiable: false, max_dias_garantia: null },
      )

      const catsMap = new Map(restricciones.categorias.map((r) => [r.id_categoria, r]))
      const mergedCategorias: CategoriaRestriccion[] = allCategorias.map((c) =>
        catsMap.get(c.id_categoria) ?? { id_categoria: c.id_categoria, nombre_categoria: c.nombre_categoria, es_no_cambiable: false, max_dias_garantia: null },
      )

      setData({ items: mergedItems, categorias: mergedCategorias })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar las restricciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleItemChange = useCallback(
    async (item: ItemRestriccion, field: 'es_no_cambiable' | 'max_dias_garantia', value: boolean | number | null) => {
      const key = `item-${item.id_item}`
      setSaving(key)
      const updated = { es_no_cambiable: item.es_no_cambiable, max_dias_garantia: item.max_dias_garantia, [field]: value }
      try {
        await upsertItemRestriccion(item.id_item, updated)
        setData((prev) =>
          prev ? { ...prev, items: prev.items.map((i) => (i.id_item === item.id_item ? { ...i, ...updated } : i)) } : prev,
        )
        toast.success('Restricción guardada')
      } catch {
        toast.error('No se pudo guardar la restricción')
      } finally {
        setSaving(null)
      }
    },
    [],
  )

  const handleCatChange = useCallback(
    async (cat: CategoriaRestriccion, field: 'es_no_cambiable' | 'max_dias_garantia', value: boolean | number | null) => {
      const key = `cat-${cat.id_categoria}`
      setSaving(key)
      const updated = { es_no_cambiable: cat.es_no_cambiable, max_dias_garantia: cat.max_dias_garantia, [field]: value }
      try {
        await upsertCategoriaRestriccion(cat.id_categoria, updated)
        setData((prev) =>
          prev ? { ...prev, categorias: prev.categorias.map((c) => (c.id_categoria === cat.id_categoria ? { ...c, ...updated } : c)) } : prev,
        )
        toast.success('Restricción guardada')
      } catch {
        toast.error('No se pudo guardar la restricción')
      } finally {
        setSaving(null)
      }
    },
    [],
  )

  const q = search.trim().toLowerCase()
  const filteredItems = q ? (data?.items ?? []).filter((i) => i.nombre.toLowerCase().includes(q)) : (data?.items ?? [])
  const filteredCategorias = q ? (data?.categorias ?? []).filter((c) => c.nombre_categoria.toLowerCase().includes(q)) : (data?.categorias ?? [])

  return (
    <div className="bg-bg-main min-h-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <BlurFade delay={0} duration={0.45}>
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#020617]">
              <Lock className="h-4 w-4 text-lime" />
            </div>
            <h1 className="text-2xl font-bold text-text-heading">Restricciones</h1>
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            Configura qué ítems y categorías no son cambiables y el límite de días de garantía.
          </p>
        </div>
      </BlurFade>

      {/* Tabs */}
      <BlurFade delay={0.05} duration={0.45}>
        <div className="mb-6 flex w-fit rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
          {(['items', 'categorias'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={cn(
                'rounded-xl px-5 py-2 text-sm font-semibold transition-colors',
                tab === t
                  ? 'bg-[#020617] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {t === 'items' ? 'Ítems' : 'Categorías'}
            </button>
          ))}
        </div>
      </BlurFade>

      {/* Search */}
      <BlurFade delay={0.08} duration={0.45}>
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={tab === 'items' ? 'Buscar ítem...' : 'Buscar categoría...'}
            className="pl-9 bg-white"
          />
        </div>
      </BlurFade>

      {/* Error state */}
      {!loading && error && (
        <BlurFade delay={0} duration={0.4}>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
            <p className="mb-1 text-sm font-medium text-gray-900">Error al cargar</p>
            <p className="mb-5 max-w-xs text-xs text-gray-500">{error}</p>
            <Button variant="outline" size="sm" onClick={loadData}>Reintentar</Button>
          </div>
        </BlurFade>
      )}

      {/* Loading */}
      {loading && <SkeletonRows />}

      {/* Column headers */}
      {!loading && !error && data && (
        <BlurFade delay={0.08} duration={0.4}>
          <div className="mb-2 flex items-center gap-4 px-5">
            <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {tab === 'items' ? 'Ítem' : 'Categoría'}
            </span>
            <span className="w-32 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
              No cambiable
            </span>
            <span className="w-36 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
              Máx días garantía
            </span>
          </div>
        </BlurFade>
      )}

      {/* Items list */}
      {!loading && !error && data && tab === 'items' && (
        <BlurFade delay={0.1} duration={0.4}>
          <div className="space-y-2">
            {filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item) => {
              const isSaving = saving === `item-${item.id_item}`
              return (
                <div
                  key={item.id_item}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3.5 transition-colors duration-150',
                    item.es_no_cambiable ? 'border-red-100 bg-red-50/40' : 'hover:border-gray-300 hover:bg-gray-50/60',
                    isSaving && 'opacity-60',
                  )}
                >
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    {isSaving
                      ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />
                      : <div className="h-2 w-2 shrink-0 rounded-full bg-gray-200" />
                    }
                    <span className="truncate text-sm font-medium text-gray-900">{item.nombre}</span>
                  </div>

                  <div className="flex w-32 items-center justify-center">
                    <Toggle
                      checked={item.es_no_cambiable}
                      disabled={isSaving}
                      onChange={(v) => handleItemChange(item, 'es_no_cambiable', v)}
                    />
                  </div>

                  <div className="flex w-36 justify-center">
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={item.max_dias_garantia ?? ''}
                      disabled={isSaving}
                      placeholder="15 (por defecto)"
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
                        if (v === null || (v >= 1 && v <= 3650)) handleItemChange(item, 'max_dias_garantia', v)
                      }}
                      className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-center text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-[#06B6D4] disabled:opacity-50 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )
            })}
            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 text-center">
                <p className="text-sm text-gray-400">{q ? 'Sin resultados' : 'No hay ítems en el catálogo'}</p>
              </div>
            )}
          </div>
        </BlurFade>
      )}

      {/* Categorias list */}
      {!loading && !error && data && tab === 'categorias' && (
        <BlurFade delay={0.1} duration={0.4}>
          <div className="space-y-2">
            {filteredCategorias.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((cat) => {
              const isSaving = saving === `cat-${cat.id_categoria}`
              return (
                <div
                  key={cat.id_categoria}
                  className={cn(
                    'flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3.5 transition-colors duration-150',
                    cat.es_no_cambiable ? 'border-red-100 bg-red-50/40' : 'hover:border-gray-300 hover:bg-gray-50/60',
                    isSaving && 'opacity-60',
                  )}
                >
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    {isSaving
                      ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />
                      : <div className="h-2 w-2 shrink-0 rounded-full bg-gray-200" />
                    }
                    <span className="truncate text-sm font-medium text-gray-900">{cat.nombre_categoria}</span>
                  </div>

                  <div className="flex w-32 items-center justify-center">
                    <Toggle
                      checked={cat.es_no_cambiable}
                      disabled={isSaving}
                      onChange={(v) => handleCatChange(cat, 'es_no_cambiable', v)}
                    />
                  </div>

                  <div className="flex w-36 justify-center">
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={cat.max_dias_garantia ?? ''}
                      disabled={isSaving}
                      placeholder="15 (por defecto)"
                      onChange={(e) => {
                        const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
                        if (v === null || (v >= 1 && v <= 3650)) handleCatChange(cat, 'max_dias_garantia', v)
                      }}
                      className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-center text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-[#06B6D4] disabled:opacity-50 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )
            })}
            {filteredCategorias.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 text-center">
                <p className="text-sm text-gray-400">{q ? 'Sin resultados' : 'No hay categorías en el catálogo'}</p>
              </div>
            )}
          </div>
        </BlurFade>
      )}

      {/* Pagination */}
      {!loading && !error && data && (() => {
        const total = tab === 'items' ? filteredItems.length : filteredCategorias.length
        const totalPages = Math.ceil(total / PAGE_SIZE)
        if (totalPages <= 1) return null
        return (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <span className="text-xs text-gray-500">
              Página <span className="font-semibold text-gray-900">{page}</span> de{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })()}
    </div>
  )
}
