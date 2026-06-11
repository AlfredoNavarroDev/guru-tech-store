# Animation — UI Stack

**Importar siempre de `'motion/react'`. Nunca de `'framer-motion'`.**

Principio: las animaciones reducen latencia percibida y confirman acciones — no entretienen. Rápidas y funcionales.

---

## Timing

| Contexto | Duración máx |
|---|---|
| Page transitions | 0.25s |
| Modals / drawers | 0.20s |
| Micro-interactions | 0.15s |
| Toasts | 0.20s |
| KPI counters | 0.8s (dato visual, no feedback de acción) |

Animar solo: `opacity`, `x`, `y`, `scale` — **nunca** `width`, `height`, `top`, `left` (causan layout reflow).

---

## 1. Page Transitions

`template.tsx` — no `layout.tsx`. Layout no re-monta entre navegaciones; template sí.

```tsx
// app/dashboard/template.tsx
'use client'
import { motion } from 'motion/react'

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
```

`y: 8px` es suficiente para UI interna — evitar valores grandes. Exit animations requieren `<AnimatePresence>` en el root layout.

---

## 2. Modals

Render condicional — **no** `display:none`. `AnimatePresence` ejecuta el exit animation antes de remover del DOM.

**No usar `@base-ui/react` Dialog con `AnimatePresence`** — @base-ui no desmonta el DOM, usa CSS data-attributes. `AnimatePresence` nunca ve el unmount y el exit animation no ocurre.

```tsx
'use client'
import { AnimatePresence, motion } from 'motion/react'

export function Modal({ isOpen, onClose, children }: {
  isOpen: boolean; onClose: () => void; children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            key="modal"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg
                       -translate-x-1/2 -translate-y-1/2
                       bg-card rounded-xl shadow-xl p-6"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{   opacity: 0, scale: 0.95,  y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

---

## 3. Drawers / Sidesheets

Para paneles de detalle, filtros, o acciones que entran desde un borde. El sidebar de navegación principal (siempre visible) no necesita esto.

```tsx
'use client'
import { AnimatePresence, motion } from 'motion/react'

export function Drawer({ isOpen, side = 'right', onClose, children }: {
  isOpen: boolean; side?: 'left' | 'right'; onClose: () => void; children: React.ReactNode
}) {
  const initial = side === 'right' ? { x: '100%' } : { x: '-100%' }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            className={`fixed ${side}-0 top-0 h-full w-80 bg-card shadow-2xl z-50 p-6 overflow-y-auto`}
            initial={initial}
            animate={{ x: 0 }}
            exit={initial}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
```

`type: 'spring'` da sensación táctil. Ajustar `stiffness`/`damping` al gusto.

---

## 4. Form Feedback — useAnimate

`useAnimate` para animaciones imperativas de un solo disparo (eventos async).

```tsx
'use client'
import { useAnimate } from 'motion/react'
import { useState } from 'react'

export function SubmitButton({ onSave }: { onSave: () => Promise<void> }) {
  const [scope, animate] = useAnimate()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleClick() {
    setStatus('loading')
    try {
      await onSave()
      setStatus('success')
      await animate(scope.current, { scale: [1, 1.04, 1] }, { duration: 0.3 })
      setStatus('idle')
    } catch {
      setStatus('error')
      await animate(scope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.4 })
      setStatus('idle')
    }
  }

  return (
    <button ref={scope} onClick={handleClick} disabled={status === 'loading'}>
      {status === 'loading' ? 'Guardando…' : 'Guardar'}
    </button>
  )
}
```

**Shake de campo en error de validación:**

```tsx
const [fieldScope, animateField] = useAnimate()
// al detectar error:
animateField(fieldScope.current, { x: [0, -5, 5, -3, 3, 0] }, { duration: 0.35 })

<div ref={fieldScope}>
  <input className={cn(hasError && 'border-destructive')} />
</div>
```

**Combinar con react-hook-form:**

```tsx
// En handleSubmit cuando hay errores
if (Object.keys(form.formState.errors).length > 0) {
  animate(formRef.current, { x: [0, -5, 5, -3, 3, 0] }, { duration: 0.35 })
}
```

---

## 5. CRUD Table Rows — AutoAnimate

`@formkit/auto-animate` **NO está instalado** en este proyecto. Instalar primero:

```bash
npm i @formkit/auto-animate
```

```tsx
'use client'
import { useAutoAnimate } from '@formkit/auto-animate/react'

export function DataTable<T extends { id: string }>({
  rows, renderRow,
}: { rows: T[]; renderRow: (row: T) => React.ReactNode }) {
  const [parent, enable] = useAutoAnimate({ duration: 200, easing: 'ease-in-out' })

  return (
    <table className="w-full text-sm">
      <tbody ref={parent}>
        {rows.map((row) => (
          <tr key={row.id}>{renderRow(row)}</tr>
        ))}
      </tbody>
    </table>
  )
}
```

Funciona igual en `<ul>`, `<div>`, o cualquier contenedor cuyos hijos cambian.
En operaciones masivas: `enable(false)` durante la carga, `enable(true)` al terminar.

---

## 6. Loading States

### Skeleton cards (staggered)

```tsx
'use client'
import { motion } from 'motion/react'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } }

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show"
      className="grid grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} variants={item}
          className="rounded-xl border p-4 animate-pulse bg-muted h-24" />
      ))}
    </motion.div>
  )
}
```

### Spinner inline (sin JS — Tailwind puro)

```tsx
<span className="inline-block h-4 w-4 animate-spin rounded-full
                 border-2 border-current border-t-transparent" />
```

### Skeleton de fila de tabla

```tsx
<tr className="animate-pulse">
  <td className="p-3"><div className="h-4 bg-muted rounded w-24" /></td>
  <td className="p-3"><div className="h-4 bg-muted rounded w-32" /></td>
  <td className="p-3"><div className="h-4 bg-muted rounded w-16" /></td>
</tr>
```

---

## 7. KPI Counters

Usar `number-ticker.tsx` existente en `components/ui/`. No crear un componente nuevo.

```tsx
import NumberTicker from '@/components/ui/number-ticker'

// Ventas del día, stock total, ingresos, etc.
<NumberTicker value={ventasHoy} />
<NumberTicker value={ingresos} />
```

El componente usa `useMotionValue` + `useSpring` de `'motion/react'` internamente — consistente con el resto del proyecto.

---

## 8. Accordion / Paneles Colapsables

Para filtros, secciones de detalle, filas expandibles.

```tsx
'use client'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function Accordion({ title, children }: {
  title: string; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        {title}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{   height: 0,    opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

## 9. Tab Panel / Role Switching

`AnimatePresence mode="wait"` — el panel saliente termina antes de que entre el nuevo. Evita overlap flash.

```tsx
'use client'
import { AnimatePresence, motion } from 'motion/react'

export function TabPanel({ activeKey, panels }: {
  activeKey: string; panels: Record<string, React.ReactNode>
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0  }}
        exit={{   opacity: 0, x: -10 }}
        transition={{ duration: 0.15 }}
      >
        {panels[activeKey]}
      </motion.div>
    </AnimatePresence>
  )
}

// Uso en el dashboard con roles
<TabPanel activeKey={activeRole} panels={{ vendedor: <VendedorView />, admin: <AdminView /> }} />
```

---

## 10. Staggered Card Entrance

Para la grilla de KPIs o cualquier grid que aparece al montar.

```tsx
'use client'
import { motion } from 'motion/react'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } }

export function KPIGrid({ cards }: { cards: { id: string; label: string; value: number }[] }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show"
      className="grid grid-cols-4 gap-4">
      {cards.map((c) => (
        <motion.div key={c.id} variants={item}
          className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">{c.label}</p>
          <p className="text-2xl font-semibold mt-1">
            {new Intl.NumberFormat('es-PE').format(c.value)}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )
}
```

---

## 11. Toasts con AnimatePresence (alternativa a sonner)

Si no se usa sonner, implementación manual:

```tsx
'use client'
import { AnimatePresence, motion } from 'motion/react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

type ToastType = { id: number; message: string; type: 'success' | 'error' | 'info' | 'warning' }

export function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const push = useCallback((message: string, type: ToastType['type'] = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const ToastContainer = () => (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 16, scale: 0.95  }}
            transition={{ duration: 0.2 }}
            className={cn(
              'rounded-lg px-4 py-3 text-sm text-white shadow-lg min-w-64',
              t.type === 'success' && 'bg-green-600',
              t.type === 'error'   && 'bg-red-600',
              t.type === 'info'    && 'bg-blue-600',
              t.type === 'warning' && 'bg-yellow-600',
            )}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  return { push, ToastContainer }
}
```

Ver `references/forms-feedback.md` para la implementación con sonner (recomendada).

---

## 12. Micro-interactions

Default: Tailwind — cero JS, cero bundle.

| Caso | Herramienta |
|---|---|
| Button hover scale | `hover:scale-105 active:scale-95 transition-transform duration-150` |
| Card hover lift | `hover:-translate-y-1 hover:shadow-lg transition-all duration-150` |
| Link active state | `transition-colors duration-150` |
| Loading skeleton | `animate-pulse` (Tailwind) |
| Spinner | `animate-spin` (Tailwind) |
| Animated counter | `<NumberTicker>` de `components/ui/number-ticker.tsx` |
| Staggered entrance | `motion/react` `staggerChildren` |
| Spring-physics feel | `motion/react` `type: 'spring'` |

Usar `motion/react` solo cuando CSS no puede expresar la interacción.

---

## 13. Reduced Motion

Siempre respetar `prefers-reduced-motion`.

```tsx
import { useReducedMotion } from 'motion/react'

function MyComponent() {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
    />
  )
}
```

---

## 14. Responsive en Animaciones

### Modal — full-screen en móvil, centrado en desktop

```tsx
'use client'
import { AnimatePresence, motion } from 'motion/react'

export function Modal({ isOpen, onClose, children }: {
  isOpen: boolean; onClose: () => void; children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          {/* Móvil: slide desde abajo, full-width. Desktop: scale centrado */}
          <motion.div
            key="modal"
            className="
              fixed z-50 bg-card shadow-xl
              /* móvil: sheet desde abajo, ocupa ancho completo */
              bottom-0 left-0 right-0 rounded-t-2xl p-6 max-h-[90dvh] overflow-y-auto
              /* tablet+: centrado clásico */
              sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:right-auto
              sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-full sm:max-w-lg sm:rounded-xl sm:max-h-[85dvh]
            "
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: 40 }}
            // En desktop: scale además de fade
            // Usar variantes si se necesita comportamiento diferente por breakpoint
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### Drawer — ancho responsive

```tsx
export function Drawer({ isOpen, side = 'right', onClose, children }: {
  isOpen: boolean; side?: 'left' | 'right'; onClose: () => void; children: React.ReactNode
}) {
  const xOut = side === 'right' ? '100%' : '-100%'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            className={`
              fixed ${side}-0 top-0 h-full z-50 bg-card shadow-2xl overflow-y-auto p-6
              w-full          /* móvil: full-width */
              sm:w-80         /* tablet+: 320px */
              md:w-96         /* desktop: 384px */
            `}
            initial={{ x: xOut }}
            animate={{ x: 0 }}
            exit={{ x: xOut }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
```

### Staggered grid — columnas responsive

```tsx
// KPI cards: el stagger funciona igual, el grid maneja las columnas
<motion.div
  variants={container}
  initial="hidden"
  animate="show"
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
>
  {cards.map((c) => (
    <motion.div key={c.id} variants={item} className="rounded-xl border bg-card p-4">
      {/* contenido */}
    </motion.div>
  ))}
</motion.div>
```

---

## 15. Cuándo NO animar

| Situación | Por qué |
|---|---|
| Tablas con 100+ filas | AutoAnimate en listas grandes causa jank |
| Datos de polling (cada X segundos) | Animación de cada update es distractor |
| Acciones frecuentes repetidas (escaneo de barcode, entrada rápida) | Las transiciones añaden fricción |
| Dispositivos lentos / conexión lenta | Respetar `prefers-reduced-motion` |

---

## 15. Performance Checklist de Animaciones

- [ ] Todo `motion.*` / `useAutoAnimate` dentro de archivos `'use client'`
- [ ] Import selectivo: `import { motion, AnimatePresence } from 'motion/react'`
- [ ] NUNCA `from 'framer-motion'`
- [ ] Animar solo `opacity`, `x`, `y`, `scale`
- [ ] Duraciones dentro de límites de la tabla de timing
- [ ] `will-change: transform` solo en elementos que animan en cada interacción
- [ ] `useReducedMotion()` en todas las animaciones de entrada
- [ ] AutoAnimate con `enable(false)` durante cargas masivas de datos
- [ ] CSS animations (tw-animate-css) y `motion.div` no compiten en la misma propiedad del mismo elemento
