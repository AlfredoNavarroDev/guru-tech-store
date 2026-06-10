---
name: erp-ui-stack
description: Use when building or modifying any UI in this project (TFC 2026 Grupo 45 — Next.js 16 dashboard for Peruvian retail). Covers full stack imports, component generation, animation, @base-ui/react vs shadcn decisions, Magic UI catalog, design tokens, forms, toast, UX, accessibility, and Next.js performance. Self-contained — does not depend on other UI skills.
---

# UI Stack — TFC 2026 Grupo 45

Next.js 16.2.6 App Router · shadcn/ui (`style: base-nova`) · Tailwind CSS v4 · `motion` (`motion/react`) · `@base-ui/react` · `lucide-react` · `tw-animate-css` · `tailwind-merge` · `clsx` · `class-variance-authority` · `next-themes`

---

## ⚠️ CRÍTICO: paquete de animación

**Importar SIEMPRE de `'motion/react'`, NUNCA de `'framer-motion'`.**

Ambos están en `package.json` pero tienen contextos React separados. Mezclarlos rompe `AnimatePresence` silenciosamente — las exit animations no ocurren sin error en consola.

```tsx
import { motion, AnimatePresence, useAnimate, useMotionValue, useReducedMotion } from 'motion/react'
// NUNCA: import { motion } from 'framer-motion'
```

---

## Stack instalado (package.json)

```json
{
  "next": "16.2.6",  "react": "19.2.4",
  "motion": "^12.40.0",        "@base-ui/react": "^1.5.0",
  "lucide-react": "^1.17.0",   "next-themes": "^0.4.6",
  "tailwindcss": "^4",         "tw-animate-css": "^1.4.0",
  "tailwind-merge": "^3.6.0",  "clsx": "^2.1.1",
  "class-variance-authority": "^0.7.1",  "shadcn": "^4.8.3"
}
```

No instalados aún — instalar cuando se necesiten:
- `@formkit/auto-animate` → `npm i @formkit/auto-animate`
- `react-hook-form` + `zod` → ver `references/forms-feedback.md`
- `sonner` → ver `references/forms-feedback.md`
- shadcn charts (Recharts) → `npx shadcn@latest add chart` → ver `references/charts.md`

`framer-motion` está en package.json pero es redundante — NO usar.

---

## Arquitectura Server/Client

```tsx
// app/dashboard/ventas/page.tsx  ← Server Component (datos, no 'use client')
import { VentasClient } from './VentasClient'
export default async function Page() {
  const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ventas`, {
    next: { revalidate: 60 },
  }).then(r => r.json())
  return <VentasClient data={data} />
}

// VentasClient.tsx  ← Client Component (estado, animación, eventos)
'use client'
import { motion } from 'motion/react'
```

Reglas:
- Server Components: data fetching, layouts estáticos, sin hooks
- Client Components: `useState`, `useEffect`, `motion.*`, event handlers, formularios
- `motion.*` y `useAutoAnimate` **nunca** en Server Components

---

## Utilities

```ts
// lib/utils.ts — ya implementado
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

```ts
import { cva, type VariantProps } from 'class-variance-authority'
const badge = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      danger:  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
  },
})
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` |
| `<Button asChild><Link /></Button>` | `<Link className={buttonVariants()} />` |
| `npx shadcn@latest add button` | Editar `button.tsx` directamente |
| Animaciones en Server Components | Extraer a `*Client.tsx` |
| `animate: width/height` | Usar `scale` o `clip-path` |
| Hex hardcodeado en componentes | `bg-primary`, `text-muted-foreground`, `bg-bg-dark` |
| Emojis como iconos | `lucide-react` únicamente |
| `import X from '@radix-ui/react-icons'` en código nuevo | `lucide-react` equivalente |
| Animar datos de polling en tiempo real | Solo en cambios disparados por usuario |
| `suppressHydrationWarning` ausente en `<html>` | Siempre presente (next-themes) |

---

## References — leer la sección relevante

| Tema | Archivo |
|---|---|
| Animaciones completas (modals, drawers, accordions, tab panels, KPI, toasts, skeletons) | `references/animation.md` |
| Componentes (Magic UI catálogo, @base-ui vs shadcn, MCP workflow, shadcn CLI) | `references/components.md` |
| Sistema de diseño (tokens, fuentes, globals.css, dark mode) | `references/design-system.md` |
| Formularios (react-hook-form + zod) y Toast (sonner) | `references/forms-feedback.md` |
| UX del sistema (tablas, badges, navegación, accesibilidad, performance Next.js) | `references/ux-performance.md` |
| Charts (bar, line, area, donut, sparkline, radial — shadcn charts + Recharts) | `references/charts.md` |
| POS / Caja registradora | `references/pos-caja.md` |
| Inventario y stock | `references/inventario.md` |
| Roles y permisos | `references/roles-permisos.md` |
| Operaciones masivas | `references/bulk-operations.md` |
| Reportes y análisis | `references/reportes.md` |
| Autenticación y autorización UI | `references/auth-ui.md` |
| Errores y edge cases | `references/errores-edge-cases.md` |
| State management Sistema | `references/state-management.md` |
| Performance Sistema | `references/performance-erp.md` |

---

## Quick Reference

```
Package animación      →  'motion/react'  (NUNCA 'framer-motion')
Animaciones detalladas →  references/animation.md
Componentes / MCP      →  references/components.md
Tokens / fuentes / CSS →  references/design-system.md
Formularios / Toast    →  references/forms-feedback.md
UX Sistema / performance   →  references/ux-performance.md

Utility merge          →  cn() en lib/utils.ts
Variantes              →  cva() de class-variance-authority
Iconos                 →  lucide-react (ÚNICO estándar del proyecto)
Button asChild pattern →  buttonVariants() + <Link> directo
Currency format        →  Intl.NumberFormat('es-PE', { currency: 'PEN' }) → S/ 1,234.56
KPI counter            →  <NumberTicker> de components/ui/number-ticker.tsx
Charts                 →  references/charts.md  (bar, line, area, donut, sparkline, radial)

--- Módulos Sistema ---
POS / Carrito          →  references/pos-caja.md      (useReducer, pagos, flujo completo)
Inventario             →  references/inventario.md    (stock, movimientos, conteo físico)
Roles / Permisos       →  references/roles-permisos.md (can(), <Can>, sidebar dinámico)
Operaciones masivas    →  references/bulk-operations.md (checkboxes, toolbar, bulk pricing)
Reportes               →  references/reportes.md      (DateRangePicker, comparativo, Excel)
Auth UI                →  references/auth-ui.md       (login, middleware, refresh, inactividad)
Errores / Edge cases   →  references/errores-edge-cases.md (server errors, concurrencia, boundaries)
State management       →  references/state-management.md  (useReducer, optimistic, BroadcastChannel)
Performance            →  references/performance-erp.md   (code splitting, lazy charts, paginación)
```
