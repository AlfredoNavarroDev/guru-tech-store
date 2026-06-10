# Components — UI Stack

---

## Decisión de arquitectura: @base-ui/react vs shadcn

Este proyecto usa `@base-ui/react` como primitiva del botón. Entender la diferencia antes de agregar componentes.

### Mapa de decisión

| Necesidad | Usar | Notas |
|---|---|---|
| Botón, variantes de estilo | `@base-ui/react/button` — ya en `button.tsx` | NO correr `npx shadcn add button` |
| Modal/overlay con exit animation | Render condicional propio + `AnimatePresence` | @base-ui no desmonta DOM |
| Dialog sin animation de salida | `@base-ui/react` Dialog | CSS data-attributes |
| Select, Combobox, Tabs, Table | `npx shadcn@latest add <nombre>` | Genera Radix-based |
| Tooltip, Popover | `npx shadcn@latest add tooltip popover` | Genera Radix-based |
| Input, Label, Textarea | `npx shadcn@latest add input label textarea` | Sin conflictos |
| Badge con variantes | CVA manual (ver SKILL.md) | No instalar shadcn badge |

### Limitación crítica: Button sin `asChild`

`@base-ui/react` Button **no tiene `asChild`**. El patrón estándar de shadcn rompe en runtime:

```tsx
// ❌ ROMPE — @base-ui no tiene asChild
<Button asChild>
  <Link href="/ruta">Ir</Link>
</Button>

// ✅ CORRECTO
import { buttonVariants } from '@/components/ui/button'
<Link href="/ruta" className={buttonVariants({ variant: 'default', size: 'md' })}>
  Ir
</Link>

// ✅ También correcto — botón que dispara navegación programática
<Button onClick={() => router.push('/ruta')}>Ir</Button>
```

### Limitación: @base-ui + dark mode

`@base-ui/react` no usa clases Tailwind internamente. Para dark mode en componentes @base-ui, aplicar estilos Tailwind explícitos en el className del componente — no asumas que `dark:` funciona automáticamente en elementos internos de @base-ui.

### Limitación: @base-ui Dialog + AnimatePresence

```tsx
// ❌ Exit animation NO ocurre — @base-ui Dialog no desmonta
<AnimatePresence>
  {open && <BaseUIDialog open={open}>...</BaseUIDialog>}
</AnimatePresence>

// ✅ Construir como render condicional propio
<AnimatePresence>
  {open && (
    <motion.div key="modal" ...>contenido</motion.div>
  )}
</AnimatePresence>
```

---

## Magic UI — Catálogo de componentes instalados

Todos en `components/ui/`. **Revisar aquí antes de pedir por MCP** — ya pueden existir.

### CSS-only (no usan motion/react)

| Componente | Efecto | Uso en el proyecto |
|---|---|---|
| `animated-shiny-text.tsx` | Texto con destello deslizante | Badges especiales, pills de estado |
| `animated-gradient-text.tsx` | Texto con gradiente animado | Headings decorativos |
| `shimmer-button.tsx` | Botón con shimmer de luz | CTAs destacados en landing |
| `meteors.tsx` | Lluvia de meteoros SVG | Fondos decorativos de landing |

### motion/react (importan de `'motion/react'`)

| Componente | API motion usada | Uso en el proyecto |
|---|---|---|
| `blur-fade.tsx` | `motion`, `AnimatePresence`, `useInView` | Fade-in al scroll en cualquier elemento |
| `border-beam.tsx` | `motion` | Cards destacadas con borde animado |
| `number-ticker.tsx` | `useMotionValue`, `useSpring`, `useInView` | **KPIs del dashboard** — usar este |
| `animated-grid-pattern.tsx` | `motion` | Fondos de secciones |
| `animated-list.tsx` | `motion`, `AnimatePresence` | Notificaciones, feeds de actividad |
| `dot-pattern.tsx` | `motion` | Fondos decorativos con puntos |
| `magic-card.tsx` | `motion` | Cards interactivas con spotlight al hover |
| `sparkles-text.tsx` | `motion` | Headings con partículas |
| `word-rotate.tsx` | `motion`, `AnimatePresence` | Rotación de palabras en taglines |

### Sin animación

| Componente | Uso |
|---|---|
| `bento-grid.tsx` | Layout bento con cards — secciones de features |
| `date-picker.tsx` | Date picker personalizado para formularios |
| `button.tsx` | Botón base (@base-ui/react) con CVA |

---

## MCP Workflow — Flujo para obtener componentes

**Orden de prioridad:**

1. **Revisar catálogo arriba** — ¿ya existe en `components/ui/`?
2. **`@magicuidesign/mcp`** — buscar en Magic UI registry (genera con `'motion/react'` ✓)
3. **`magic` (21st.dev)** — describir el componente, genera código production-ready
4. **`npx shadcn@latest add`** — primitivas base (excepto `button`)

### Uso de magic (21st.dev)

Describir el componente en detalle, especificar que el proyecto usa:
- `motion/react` (no framer-motion)
- `lucide-react` para iconos
- `cn()` de `@/lib/utils`
- Tailwind CSS v4 con tokens semánticos

**Revisar siempre el output** del MCP antes de usar:
- Reemplazar `from 'framer-motion'` → `from 'motion/react'`
- Reemplazar `@radix-ui/react-icons` → equivalente en `lucide-react`
- Reemplazar `<Button asChild>` → `buttonVariants()` + `<Link>`

### shadcn CLI — componentes seguros de instalar

```bash
# Sin conflictos con el proyecto
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add select
npx shadcn@latest add tabs
npx shadcn@latest add badge
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add textarea
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add dropdown-menu
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add form        # requiere react-hook-form + zod instalados
npx shadcn@latest add sonner      # requiere sonner instalado

# ⚠️ NO correr — sobrescribe button.tsx con implementación Radix
# npx shadcn@latest add button
```

---

## components.json — Configuración del proyecto

```json
{
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": { "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components", "utils": "@/lib/utils",
    "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks"
  }
}
```

- `style: "base-nova"` — estilo shadcn más reciente (diferente de `"default"` y `"new-york"`)
- `iconLibrary: "lucide"` — shadcn genera automáticamente con lucide-react
- Todos los componentes nuevos de shadcn van a `components/ui/`

---

## Organización de archivos

```
Frontend/
├── components/
│   ├── ui/              ← shadcn CLI + Magic UI (compartido)
│   ├── landing/         ← componentes exclusivos de landing page
│   └── login/           ← componentes de login
├── app/
│   ├── dashboard/       ← páginas Sistema (Server Components por defecto)
│   │   ├── layout.tsx
│   │   ├── template.tsx ← page transitions
│   │   ├── page.tsx
│   │   ├── ventas/
│   │   ├── catalogo/
│   │   └── clientes/
│   ├── login/
│   └── globals.css
└── lib/
    └── utils.ts         ← cn() helper
```

---

## Iconos

**Librería única: `lucide-react`**

```tsx
import { Search, Plus, Loader2, TrendingUp, ShoppingCart, Users, ArrowUpRight,
         Package, LayoutDashboard, LogOut, ChevronDown, AlertCircle } from 'lucide-react'

// Spinner
<Loader2 className="h-4 w-4 animate-spin" />

// Inline con texto
<TrendingUp className="h-4 w-4 mr-2 inline" />

// En botón
<Button><Plus className="h-4 w-4 mr-2" />Nueva venta</Button>
```

`@radix-ui/react-icons` tiene 1 uso stray en `bento-grid.tsx` (`ArrowRightIcon`). No agregar más en código nuevo. Si un componente Magic UI o del MCP trae imports de `@radix-ui/react-icons`, reemplazar por el equivalente en lucide.

Nunca emojis como iconos.

---

## Utility Composition

```ts
// cn() — ya implementado en lib/utils.ts
import { cn } from '@/lib/utils'

// cva — variantes de componentes
import { cva, type VariantProps } from 'class-variance-authority'

// Ejemplo: Badge de estado para Sistema
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        danger:  'bg-red-100   text-red-800   dark:bg-red-900   dark:text-red-200',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        default: 'bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

// Uso: estados Sistema
// success → pagado, completado
// danger  → cancelado, rechazado, error
// pending → pendiente, en proceso
```

---

## Responsive en Componentes

### Botones — tamaño y texto adaptativo

```tsx
{/* Icon-only en móvil, texto en sm+ */}
<Button size="sm" className="gap-2">
  <Plus className="h-4 w-4 shrink-0" />
  <span className="hidden sm:inline">Nueva venta</span>
</Button>

{/* Full-width en móvil, auto en desktop */}
<Button className="w-full sm:w-auto">Guardar</Button>

{/* Grupo de acciones */}
<div className="flex flex-col gap-2 sm:flex-row">
  <Button variant="outline" className="w-full sm:w-auto">Exportar</Button>
  <Button className="w-full sm:w-auto">Crear</Button>
</div>

{/* FAB (Floating Action Button) — solo móvil */}
<button className="fixed bottom-4 right-4 z-30 sm:hidden
                   flex h-14 w-14 items-center justify-center
                   rounded-full bg-primary text-primary-foreground shadow-lg
                   active:scale-95 transition-transform">
  <Plus className="h-6 w-6" />
</button>
```

### Cards — padding y grid responsive

```tsx
{/* Card individual */}
<div className="rounded-xl border bg-card p-4 md:p-6">
  <p className="text-xs text-muted-foreground sm:text-sm">Ventas totales</p>
  <p className="text-2xl font-bold sm:text-3xl mt-1">S/ 12,450</p>
</div>

{/* Grid de cards KPI */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
  {/* cards */}
</div>

{/* Grid de cards contenido (tablas, charts) */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
  {/* secciones */}
</div>
```

### Badges — no cambian por breakpoint

```tsx
{/* Badges son siempre compactos — no necesitan responsive */}
<span className={cn(badge({ variant: 'success' }))}>Pagado</span>
```

### Page header — responsive

```tsx
{/* Título + acciones: stack en móvil, row en sm+ */}
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
  <div>
    <h1 className="text-lg font-bold md:text-xl">Ventas</h1>
    <p className="text-xs text-muted-foreground md:text-sm">Gestión de ventas del mes</p>
  </div>
  <div className="flex gap-2 shrink-0">
    <Button variant="outline" size="sm" className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Exportar</span>
    </Button>
    <Button size="sm" className="gap-1.5">
      <Plus className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Nueva venta</span>
    </Button>
  </div>
</div>
```

### Tabla — columnas ocultas en móvil

```tsx
<div className="overflow-x-auto rounded-lg border">
  <table className="w-full min-w-[640px] text-sm">
    <thead>
      <tr className="border-b bg-muted/50">
        <th className="px-4 py-3 text-left font-medium">Cliente</th>
        <th className="px-4 py-3 text-left font-medium">Total</th>
        <th className="hidden md:table-cell px-4 py-3 text-left font-medium">Vendedor</th>
        <th className="hidden lg:table-cell px-4 py-3 text-left font-medium">Fecha</th>
        <th className="px-4 py-3 text-left font-medium">Estado</th>
        <th className="px-4 py-3" />
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
          <td className="px-4 py-3">{row.cliente}</td>
          <td className="px-4 py-3 font-medium">{formatCurrency(row.total, 'PEN')}</td>
          <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{row.vendedor}</td>
          <td className="hidden lg:table-cell px-4 py-3 text-muted-foreground">{row.fecha}</td>
          <td className="px-4 py-3">
            <span className={cn(badge({ variant: row.estado === 'pagado' ? 'success' : 'pending' }))}>
              {row.estado}
            </span>
          </td>
          <td className="px-4 py-3">
            {/* acciones */}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Reglas responsive para componentes

| Elemento | Móvil | Tablet (md+) | Desktop (lg+) |
|----------|-------|--------------|---------------|
| Button texto | icon only | icon + texto | icon + texto |
| Button width | `w-full` | `w-auto` | `w-auto` |
| Card padding | `p-4` | `p-6` | `p-6` |
| Grid KPI | 1 col | 2 col | 4 col |
| Grid contenido | 1 col | 1 col | 2 col |
| Tabla columnas | mínimas | + vendedor | + fecha |
| Page header | stack | row | row |
| FAB | visible | hidden | hidden |
