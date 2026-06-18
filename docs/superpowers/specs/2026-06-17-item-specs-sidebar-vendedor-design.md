# Item Specs Sidebar — Catálogo Vendedor

**Date:** 2026-06-17  
**Status:** Approved

## Problem

Sellers (vendedores) in the `/dashboard/catalogo` POS view cannot see item specifications (`especificaciones`, `calidad`, `modelo`) when a customer asks about a product. The only way to view specs is via the admin items page (`/dashboard/items`), which is not accessible to the seller role and breaks the sales flow.

## Goal

Allow vendedores to see the full technical sheet (SKU, marca, modelo, calidad, especificaciones) for any catalog item without leaving the POS grid and without disrupting the cart flow.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Interaction pattern | Click card → detail panel | Keeps cart visible; no navigation away |
| Desktop layout | Sidebar slides in from right, grid narrows | Shopify POS v9.9 split-screen pattern; validated industry standard |
| Mobile layout | `BottomSheet` (existing component) | Native mobile pattern; component already exists in project |
| Panel content | SKU + marca + modelo + calidad + especificaciones | Full technical sheet; no stock count (already shown via filter) |
| Visual style | Dark gradient header + signal bars for quality + table | Phone market identity; signal bars communicate quality grade intuitively |
| Data strategy | Extend `v_vendedor_catalogo` view | Zero extra network requests on click; `calidad`/`especificaciones` already on `Items` table in existing JOIN |

## Visual Design

### Sidebar panel (desktop, ~200px wide)

```
┌─────────────────────────┐
│ [gradient #020617→#1e3a5f]       ✕ │
│  [product image / emoji icon]       │
│  Samsung Galaxy S24                 │
│  PRD-001 · S/ 2,500   (lime mono)  │
│  Calidad: ▁▃█ original (lime bars) │
├─────────────────────────┤
│ FICHA                               │
│  Marca      Samsung                 │
│  Modelo     Galaxy S24              │
│  SKU        PRD-001 (mono gray)     │
├─────────────────────────┤
│ ESPECIFICACIONES                    │
│  RAM        8GB                     │
│  Almacen.   256GB                   │
│  Pantalla   6.2"                    │
│  Conectiv.  5G                      │
└─────────────────────────┘
```

- Dark gradient header: `background: linear-gradient(135deg, #020617, #1e3a5f)`
- Product name: white, bold
- SKU + price: `#acf847` (lime), monospace
- Quality signal bars: 3 bars = `original`, 2 bars = `genérico`, 1 bar = other/unknown. Bars in `#acf847`.
- Table rows: gray label left, bold value right, `border-bottom: 1px solid #f3f4f6`
- Specs section only renders if `especificaciones` has at least one key
- Close button (✕) top-right, closes sidebar (sets `selectedItem = null`)

### Animation

- `motion.div` from `motion/react` (already imported in `catalogo/page.tsx`)
- Initial: `x: "100%"`, Animate: `x: 0`, Exit: `x: "100%"`
- Wrapped in `AnimatePresence` (already used in the page)
- Grid transition: `flex-1` on grid shrinks naturally when sidebar mounts

### Mobile (< lg breakpoint)

- Same `BottomSheet` component used for the sale modal in this page
- Same panel content inside the sheet
- Trigger: click on product card (not the +/- stepper buttons)

### Quality signal bars logic

```ts
function qualityBars(calidad: string | null): number {
  if (!calidad) return 0
  const val = calidad.toLowerCase()
  if (val === 'original') return 3
  if (val === 'genérico' || val === 'generico') return 2
  return 1
}
```

Bars rendered as 3 divs with heights 5px / 8px / 11px. Filled bars use `#acf847`, empty bars use `rgba(255,255,255,0.2)`.

## Architecture

### Backend changes

**1. Migration** — Add `calidad` and `especificaciones` to `v_vendedor_catalogo`:

```sql
-- In SELECT of v_vendedor_catalogo:
i.calidad,
i.especificaciones,
```

No new JOINs required — `Items i` is already the base table.

**2. `CatalogoService.findAll()`** — Update raw SQL SELECT to include `calidad, especificaciones` in all query branches (base query + categoria/marca filter variants).

### Frontend changes

**1. `CatalogoItem` type** (`Frontend/lib/api/catalogo.ts`):

```ts
export interface CatalogoItem {
  // ... existing fields ...
  calidad: string | null        // ADD
  especificaciones: Record<string, unknown> | null  // ADD
}
```

**2. New component** `Frontend/components/vendedor/ItemSpecsSidebar.tsx`:

- Props: `item: CatalogoItem | null`, `onClose: () => void`
- Renders `motion.div` panel with gradient header + signal bars + table
- Used on desktop (hidden on mobile via `hidden lg:flex`)

**Layout coexistence with `FilterSidebar`:** `FilterSidebar` already occupies the right column (`w-56`). When `specItem` is non-null, `FilterSidebar` is hidden and `ItemSpecsSidebar` takes its place in the same column slot. This avoids a 3-column layout and keeps the grid width stable. The filter state is preserved — filters re-appear when specs sidebar closes.

**3. `catalogo/page.tsx`** state additions:

```ts
const [specItem, setSpecItem] = useState<CatalogoItem | null>(null)
```

- `ProductCard` `onClick` (on the card wrapper, not the +/- buttons) calls `setSpecItem(item)`
- `AnimatePresence` wraps `<ItemSpecsSidebar>` in the right column alongside the existing `FilterSidebar`
- On mobile: `specItem` drives a `BottomSheet` with same content

## Edge Cases

- **No especificaciones**: Specs section hidden; panel still shows marca/modelo/calidad/SKU.
- **No calidad**: Signal bars not rendered; row omitted from ficha.
- **Clicking same card twice**: Closes sidebar (toggle).
- **Opening sale modal while sidebar open**: Sidebar stays mounted (doesn't conflict — different z-index layers).
- **Repuestos**: Current view only returns `tipo = 'producto'`. Repuestos don't appear in catalog. No change needed.

## Out of Scope

- Adding specs to `ProductCard` inline (explicitly rejected — keeps cards compact)
- Independent route `/catalogo/[id]` (rejected — breaks POS flow)
- Stock count in sidebar (already accessible via "solo con stock" filter)
- Add-to-cart button inside sidebar (stepper already on card)
