# Item Specs Sidebar — Catálogo Vendedor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow vendedores to click any product card in `/dashboard/catalogo` and see a specs sidebar (desktop) or bottom sheet (mobile) with the item's full technical sheet: SKU, marca, modelo, calidad (shown as signal bars), and especificaciones key-value table.

**Architecture:** Extend `v_vendedor_catalogo` SQL view to expose `calidad` and `especificaciones` from the `Items` table (already in the JOIN). Add new `ItemSpecsSidebar` component using `motion/react` for slide-in animation. Wire up `specItem` state in `CatalogoPage` — on desktop the specs panel replaces `FilterSidebar` in the right column; on mobile a `BottomSheet` shows the same content.

**Tech Stack:** NestJS (TypeORM raw SQL migrations), Next.js App Router (`"use client"`), Tailwind CSS, `motion/react` (already imported in the page), existing `BottomSheet` component.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `Backend/src/migrations/1781600000001-AddSpecsFieldsToCatalogoView.ts` | Create | Add `calidad` + `especificaciones` to `v_vendedor_catalogo` |
| `Backend/src/catalogo/catalogo.service.ts` | Modify (line 12-15) | Add `imagen_url, calidad, especificaciones` to base-query SELECT |
| `Backend/src/catalogo/catalogo.service.spec.ts` | Modify | Add test: base query SELECT includes `calidad` and `especificaciones` |
| `Frontend/lib/api/catalogo.ts` | Modify | Add `calidad` + `especificaciones` to `CatalogoItem` interface |
| `Frontend/components/vendedor/ItemSpecsSidebar.tsx` | Create | Desktop specs panel: gradient header, signal bars, ficha table |
| `Frontend/app/dashboard/catalogo/page.tsx` | Modify | specItem state, ProductCard click wiring, layout swap, mobile BottomSheet |

---

## Task 1: Migration — extend v_vendedor_catalogo

**Files:**
- Create: `Backend/src/migrations/1781600000001-AddSpecsFieldsToCatalogoView.ts`

- [ ] **Step 1: Create migration file**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecsFieldsToCatalogoView1781600000001
  implements MigrationInterface
{
  name = 'AddSpecsFieldsToCatalogoView1781600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_catalogo AS
      WITH promo_vigente AS (
          SELECT
              COALESCE(pr.id_item_afectado, ic.id_item) AS id_item,
              pr.nombre          AS promo_nombre,
              pr.tipo_descuento  AS promo_tipo,
              pr.valor_descuento AS promo_valor
          FROM Promociones pr
          LEFT JOIN Item_Categorias ic ON ic.id_categoria = pr.id_categoria_afectada
          WHERE pr.estado = 'activa'
            AND (pr.fecha_inicio IS NULL OR pr.fecha_inicio <= CURRENT_DATE)
            AND (pr.fecha_fin    IS NULL OR pr.fecha_fin    >= CURRENT_DATE)
      ),
      categorias_por_item AS (
          SELECT ic.id_item,
                 STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria) AS categorias
          FROM Item_Categorias ic
          JOIN Categorias cat ON cat.id_categoria = ic.id_categoria
          GROUP BY ic.id_item
      )
      SELECT
          i.id_item,
          i.sku,
          i.nombre                  AS producto,
          m.nombre                  AS marca,
          ci.categorias             AS categoria,
          i.modelo,
          i.precio_venta_actual,
          i.imagen_url,
          i.calidad,
          i.especificaciones,
          inv.id_sede,
          s.nombre                  AS sede,
          inv.cantidad_actual        AS stock_disponible,
          pv.promo_nombre,
          pv.promo_tipo,
          pv.promo_valor,
          CASE
              WHEN pv.promo_tipo = 'porcentaje'
                  THEN ROUND(i.precio_venta_actual * (1 - pv.promo_valor / 100), 2)
              WHEN pv.promo_tipo = 'monto_fijo'
                  THEN GREATEST(i.precio_venta_actual - pv.promo_valor, 0)
              ELSE i.precio_venta_actual
          END                       AS precio_con_descuento
      FROM Items i
      JOIN  Inventario_Sedes inv   ON inv.id_item = i.id_item
      JOIN  Sedes s                ON s.id_sede   = inv.id_sede
      LEFT JOIN Marcas m           ON m.id_marca  = i.id_marca
      LEFT JOIN categorias_por_item ci ON ci.id_item = i.id_item
      LEFT JOIN promo_vigente pv   ON pv.id_item  = i.id_item
      WHERE i.tipo = 'producto'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_catalogo AS
      WITH promo_vigente AS (
          SELECT
              COALESCE(pr.id_item_afectado, ic.id_item) AS id_item,
              pr.nombre          AS promo_nombre,
              pr.tipo_descuento  AS promo_tipo,
              pr.valor_descuento AS promo_valor
          FROM Promociones pr
          LEFT JOIN Item_Categorias ic ON ic.id_categoria = pr.id_categoria_afectada
          WHERE pr.estado = 'activa'
            AND (pr.fecha_inicio IS NULL OR pr.fecha_inicio <= CURRENT_DATE)
            AND (pr.fecha_fin    IS NULL OR pr.fecha_fin    >= CURRENT_DATE)
      ),
      categorias_por_item AS (
          SELECT ic.id_item,
                 STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria) AS categorias
          FROM Item_Categorias ic
          JOIN Categorias cat ON cat.id_categoria = ic.id_categoria
          GROUP BY ic.id_item
      )
      SELECT
          i.id_item,
          i.sku,
          i.nombre                  AS producto,
          m.nombre                  AS marca,
          ci.categorias             AS categoria,
          i.modelo,
          i.precio_venta_actual,
          i.imagen_url,
          inv.id_sede,
          s.nombre                  AS sede,
          inv.cantidad_actual        AS stock_disponible,
          pv.promo_nombre,
          pv.promo_tipo,
          pv.promo_valor,
          CASE
              WHEN pv.promo_tipo = 'porcentaje'
                  THEN ROUND(i.precio_venta_actual * (1 - pv.promo_valor / 100), 2)
              WHEN pv.promo_tipo = 'monto_fijo'
                  THEN GREATEST(i.precio_venta_actual - pv.promo_valor, 0)
              ELSE i.precio_venta_actual
          END                       AS precio_con_descuento
      FROM Items i
      JOIN  Inventario_Sedes inv   ON inv.id_item = i.id_item
      JOIN  Sedes s                ON s.id_sede   = inv.id_sede
      LEFT JOIN Marcas m           ON m.id_marca  = i.id_marca
      LEFT JOIN categorias_por_item ci ON ci.id_item = i.id_item
      LEFT JOIN promo_vigente pv   ON pv.id_item  = i.id_item
      WHERE i.tipo = 'producto'
    `);
  }
}
```

- [ ] **Step 2: Run migration**

```bash
cd Backend && npm run migration:run
```

Expected: `Migration AddSpecsFieldsToCatalogoView1781600000001 has been executed successfully.`

- [ ] **Step 3: Verify columns exist in view**

```bash
cd Backend && npm run migration:run -- --query "SELECT column_name FROM information_schema.columns WHERE table_name = 'v_vendedor_catalogo' ORDER BY ordinal_position;"
```

Expected output includes `calidad` and `especificaciones` rows.

- [ ] **Step 4: Commit**

```bash
git add Backend/src/migrations/1781600000001-AddSpecsFieldsToCatalogoView.ts
git commit -m "feat(db): add calidad and especificaciones to v_vendedor_catalogo view"
```

---

## Task 2: Backend service — add calidad/especificaciones to base query + test

**Files:**
- Modify: `Backend/src/catalogo/catalogo.service.ts:12-15`
- Modify: `Backend/src/catalogo/catalogo.service.spec.ts`

The service has three SELECT branches. The `vc.*` branches (categoria and marca filters) already return all view columns automatically. Only the base query (no categoria, no marca) uses an explicit column list that needs updating. This also fixes a pre-existing bug where `imagen_url` was missing from the base query.

- [ ] **Step 1: Write failing test**

Add these two tests to `Backend/src/catalogo/catalogo.service.spec.ts` inside the existing `describe('findAll', ...)` block, after the last `it(...)`:

```typescript
it('base query includes calidad and especificaciones', async () => {
  await service.findAll(1, {});
  const [sql] = dataSource.query.mock.calls[0];
  expect(sql).toContain('calidad');
  expect(sql).toContain('especificaciones');
});

it('base query includes imagen_url', async () => {
  await service.findAll(1, {});
  const [sql] = dataSource.query.mock.calls[0];
  expect(sql).toContain('imagen_url');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd Backend && npm test -- --testPathPattern=catalogo.service.spec
```

Expected: 2 failures — `expect(sql).toContain('calidad')` and `expect(sql).toContain('imagen_url')` fail.

- [ ] **Step 3: Update base query in service**

In `Backend/src/catalogo/catalogo.service.ts`, replace lines 12–15:

```typescript
// OLD:
    let sql = `SELECT id_item, sku, producto, marca, categoria, modelo,
                      precio_venta_actual, stock_disponible,
                      promo_nombre, promo_tipo, promo_valor, precio_con_descuento
               FROM v_vendedor_catalogo
               WHERE id_sede = $1`;
```

With:

```typescript
// NEW:
    let sql = `SELECT id_item, sku, producto, marca, categoria, modelo,
                      precio_venta_actual, imagen_url, stock_disponible,
                      promo_nombre, promo_tipo, promo_valor, precio_con_descuento,
                      calidad, especificaciones
               FROM v_vendedor_catalogo
               WHERE id_sede = $1`;
```

- [ ] **Step 4: Run all catalogo service tests**

```bash
cd Backend && npm test -- --testPathPattern=catalogo.service.spec
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Backend/src/catalogo/catalogo.service.ts Backend/src/catalogo/catalogo.service.spec.ts
git commit -m "feat(catalogo): expose calidad, especificaciones and imagen_url in base query"
```

---

## Task 3: Frontend — update CatalogoItem type

**Files:**
- Modify: `Frontend/lib/api/catalogo.ts`

- [ ] **Step 1: Add fields to CatalogoItem interface**

In `Frontend/lib/api/catalogo.ts`, add two fields after `imagen_url`:

```typescript
export interface CatalogoItem {
  id_item: number
  sku: string
  producto: string
  marca: string
  categoria: string
  modelo: string | null
  precio_venta_actual: number
  stock_disponible: number
  promo_nombre: string | null
  promo_tipo: string | null
  promo_valor: number | null
  precio_con_descuento: number | null
  imagen_url: string | null
  calidad: string | null
  especificaciones: Record<string, unknown> | null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/lib/api/catalogo.ts
git commit -m "feat(frontend): add calidad and especificaciones to CatalogoItem type"
```

---

## Task 4: New component — ItemSpecsSidebar

**Files:**
- Create: `Frontend/components/vendedor/ItemSpecsSidebar.tsx`

This component is the desktop sidebar only (`hidden lg:flex`). Mobile uses a `BottomSheet` in the page with the same inner markup, which is exported separately as `ItemSpecsContent`.

- [ ] **Step 1: Create component file**

```typescript
"use client"

import { X } from "lucide-react"
import { motion } from "motion/react"
import { ItemImage } from "@/components/ui/item-image"
import type { CatalogoItem } from "@/lib/api/catalogo"
import { formatNum } from "@/lib/utils"

interface ItemSpecsSidebarProps {
  item: CatalogoItem
  onClose: () => void
}

function qualityBars(calidad: string | null): number {
  if (!calidad) return 0
  const val = calidad.toLowerCase()
  if (val === "original") return 3
  if (val === "genérico" || val === "generico") return 2
  return 1
}

export function ItemSpecsContent({ item, onClose }: ItemSpecsSidebarProps) {
  const bars = qualityBars(item.calidad)
  const hasSpecs =
    item.especificaciones != null &&
    Object.keys(item.especificaciones).length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Dark gradient header */}
      <div
        className="shrink-0 relative p-4"
        style={{ background: "linear-gradient(135deg, #020617, #1e3a5f)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-white transition-colors"
          aria-label="Cerrar especificaciones"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="mb-3 flex items-center justify-center">
          <ItemImage src={item.imagen_url} alt={item.producto} size="xl" />
        </div>

        <p className="text-sm font-bold text-white leading-snug mb-1">
          {item.producto}
        </p>
        <p className="font-mono text-xs text-[#acf847] mb-2">
          {item.sku} · S/ {formatNum(Number(item.precio_venta_actual))}
        </p>

        {bars > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Calidad:</span>
            <div className="flex items-end gap-[3px]">
              {[5, 8, 11].map((h, i) => (
                <div
                  key={i}
                  style={{
                    height: h,
                    width: 4,
                    borderRadius: 1,
                    background: i < bars ? "#acf847" : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-semibold text-[#acf847]">
              {item.calidad}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Ficha meta */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Ficha
          </p>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {item.marca && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500">Marca</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">
                    {item.marca}
                  </td>
                </tr>
              )}
              {item.modelo && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-500">Modelo</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">
                    {item.modelo}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-1.5 text-gray-500">SKU</td>
                <td className="py-1.5 text-right font-mono text-[10px] text-gray-400">
                  {item.sku}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Especificaciones */}
        {hasSpecs && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Especificaciones
            </p>
            <table className="w-full text-xs border-collapse">
              <tbody>
                {Object.entries(item.especificaciones!).map(([k, v]) => (
                  <tr key={k} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 text-gray-500">{k}</td>
                    <td className="py-1.5 text-right font-semibold text-gray-900">
                      {String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function ItemSpecsSidebar({ item, onClose }: ItemSpecsSidebarProps) {
  return (
    <motion.div
      key="specs-sidebar"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-[calc(100vh-5rem)] border-l-2 border-blue-500 bg-white overflow-hidden"
    >
      <ItemSpecsContent item={item} onClose={onClose} />
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/components/vendedor/ItemSpecsSidebar.tsx
git commit -m "feat(frontend): add ItemSpecsSidebar component for vendedor catalog"
```

---

## Task 5: Wire ProductCard — add onViewSpecs click

**Files:**
- Modify: `Frontend/app/dashboard/catalogo/page.tsx:72-192`

ProductCard needs an `onViewSpecs` prop. The card outer div gets an `onClick`. All inner interactive buttons (stepper +/-, Agregar) need `e.stopPropagation()` so they don't trigger the card click.

- [ ] **Step 1: Update ProductCardProps interface (line 72)**

Replace:

```typescript
interface ProductCardProps {
  item: CatalogoItem
  delay: number
  onAdd: (item: CatalogoItem) => void
  onDecrement: (id: number) => void
  inCart: boolean
  cartQty: number
}
```

With:

```typescript
interface ProductCardProps {
  item: CatalogoItem
  delay: number
  onAdd: (item: CatalogoItem) => void
  onDecrement: (id: number) => void
  onViewSpecs: (item: CatalogoItem) => void
  inCart: boolean
  cartQty: number
}
```

- [ ] **Step 2: Update ProductCard function signature and card div (line 93)**

Replace:

```typescript
function ProductCard({ item, delay, onAdd, onDecrement, inCart, cartQty }: ProductCardProps) {
  const hasPromo = item.precio_con_descuento != null &&
    item.precio_con_descuento !== 0 &&
    Number(item.precio_con_descuento) < Number(item.precio_venta_actual)

  const label = hasPromo ? discountLabel(item) : ""

  return (
    <BlurFade delay={delay} duration={0.4} className="h-full">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full flex flex-col transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl hover:border-gray-300">
```

With:

```typescript
function ProductCard({ item, delay, onAdd, onDecrement, onViewSpecs, inCart, cartQty }: ProductCardProps) {
  const hasPromo = item.precio_con_descuento != null &&
    item.precio_con_descuento !== 0 &&
    Number(item.precio_con_descuento) < Number(item.precio_venta_actual)

  const label = hasPromo ? discountLabel(item) : ""

  return (
    <BlurFade delay={delay} duration={0.4} className="h-full">
      <div
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full flex flex-col transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl hover:border-gray-300 cursor-pointer"
        onClick={() => onViewSpecs(item)}
      >
```

- [ ] **Step 3: Add stopPropagation to the stepper − button (line ~138)**

Replace:

```typescript
                <button
                  type="button"
                  onClick={() => onDecrement(item.id_item)}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  aria-label="Reducir cantidad"
                >
```

With:

```typescript
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDecrement(item.id_item) }}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  aria-label="Reducir cantidad"
                >
```

- [ ] **Step 4: Add stopPropagation to the stepper + button (line ~155)**

Replace:

```typescript
                <button
                  type="button"
                  onClick={() => onAdd(item)}
                  disabled={cartQty >= item.stock_disponible}
                  className="text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-30"
                  aria-label="Incrementar cantidad"
                >
```

With:

```typescript
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAdd(item) }}
                  disabled={cartQty >= item.stock_disponible}
                  className="text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-30"
                  aria-label="Incrementar cantidad"
                >
```

- [ ] **Step 5: Add stopPropagation to the RippleButton Agregar (line ~174)**

Replace:

```typescript
                <RippleButton
                  type="button"
                  onClick={() => onAdd(item)}
```

With:

```typescript
                <RippleButton
                  type="button"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onAdd(item) }}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: error about `onViewSpecs` missing in the ProductCard call site (line ~1654). That's expected — we fix it in Task 6.

- [ ] **Step 7: Commit**

```bash
git add Frontend/app/dashboard/catalogo/page.tsx
git commit -m "feat(catalogo): add onViewSpecs prop to ProductCard with stopPropagation on cart buttons"
```

---

## Task 6: Wire CatalogoPage — state, layout swap, mobile sheet

**Files:**
- Modify: `Frontend/app/dashboard/catalogo/page.tsx`

Four changes: (1) add imports, (2) add `specItem` state + `isDesktop` media query state, (3) pass `onViewSpecs` to ProductCard, (4) replace right sidebar slot with conditional specs/filter, (5) add mobile BottomSheet for specs.

- [ ] **Step 1: Add imports at top of file**

After the existing import block, add:

```typescript
import { ItemSpecsSidebar, ItemSpecsContent } from "@/components/vendedor/ItemSpecsSidebar"
```

The `BottomSheet` import is already present (`import { BottomSheet } from "@/components/ui/bottom-sheet"`).

- [ ] **Step 2: Add specItem state and isDesktop after existing state declarations (~line 543)**

After `const [mobileFilterOpen, setMobileFilterOpen] = useState(false)`, add:

```typescript
  const [specItem, setSpecItem] = useState<CatalogoItem | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
```

Note: `React` is already imported as `import React, { ... } from "react"` — if it isn't, use `useEffect` directly since it's already destructured in the import.

Actually the file uses named imports: `import { useCallback, useEffect, ... } from "react"`. So use `useEffect` (not `React.useEffect`). Replace `React.useEffect` above with `useEffect`.

- [ ] **Step 3: Pass onViewSpecs to ProductCard in the map (~line 1654)**

Replace:

```typescript
              <ProductCard
                key={item.id_item}
                item={item}
                delay={Math.min(i * 0.05, 0.3)}
                onAdd={addToCart}
                onDecrement={decrementFromCard}
                inCart={cartMap.has(item.id_item)}
                cartQty={cartMap.get(item.id_item)?.cantidad ?? 0}
              />
```

With:

```typescript
              <ProductCard
                key={item.id_item}
                item={item}
                delay={Math.min(i * 0.05, 0.3)}
                onAdd={addToCart}
                onDecrement={decrementFromCard}
                onViewSpecs={(clicked) => setSpecItem(prev => prev?.id_item === clicked.id_item ? null : clicked)}
                inCart={cartMap.has(item.id_item)}
                cartQty={cartMap.get(item.id_item)?.cantidad ?? 0}
              />
```

The toggle logic (`prev?.id_item === clicked.id_item ? null : clicked`) closes the sidebar when clicking the same card twice.

- [ ] **Step 4: Replace right sidebar slot (~line 1695)**

Replace:

```typescript
        {/* ══════════ RIGHT: filter sidebar (desktop) ══════════ */}
        {loading ? (
          <FilterSidebarSkeleton />
        ) : (
          <FilterSidebar
            categorias={categorias}
            marcas={marcas}
            modelos={modelos}
            selectedCategorias={selectedCategorias}
            selectedMarcas={selectedMarcas}
            selectedModelos={selectedModelos}
            soloConStock={soloConStock}
            soloConPromo={soloConPromo}
            onToggleCategoria={toggleCategoria}
            onToggleMarca={toggleMarca}
            onToggleModelo={toggleModelo}
            onToggleStock={handleToggleStock}
            onTogglePromo={() => { setSoloConPromo((v) => !v); setCatalogoPage(1) }}
            onClearAll={clearAllFilters}
          />
        )}
```

With:

```typescript
        {/* ══════════ RIGHT: specs sidebar OR filter sidebar (desktop) ══════════ */}
        <AnimatePresence mode="wait">
          {specItem ? (
            <ItemSpecsSidebar
              key="specs-sidebar"
              item={specItem}
              onClose={() => setSpecItem(null)}
            />
          ) : loading ? (
            <FilterSidebarSkeleton key="filter-skeleton" />
          ) : (
            <FilterSidebar
              key="filter-sidebar"
              categorias={categorias}
              marcas={marcas}
              modelos={modelos}
              selectedCategorias={selectedCategorias}
              selectedMarcas={selectedMarcas}
              selectedModelos={selectedModelos}
              soloConStock={soloConStock}
              soloConPromo={soloConPromo}
              onToggleCategoria={toggleCategoria}
              onToggleMarca={toggleMarca}
              onToggleModelo={toggleModelo}
              onToggleStock={handleToggleStock}
              onTogglePromo={() => { setSoloConPromo((v) => !v); setCatalogoPage(1) }}
              onClearAll={clearAllFilters}
            />
          )}
        </AnimatePresence>
```

- [ ] **Step 5: Add mobile BottomSheet for specs**

Just before the closing `</div>` of `CatalogoPage` return (after the mobile cart button div), add:

```typescript
      {/* Mobile specs bottom sheet */}
      <BottomSheet
        open={!!specItem && !isDesktop}
        onClose={() => setSpecItem(null)}
      >
        <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white">
          {specItem && (
            <ItemSpecsContent item={specItem} onClose={() => setSpecItem(null)} />
          )}
        </div>
      </BottomSheet>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd Frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add Frontend/app/dashboard/catalogo/page.tsx
git commit -m "feat(catalogo): wire specs sidebar — click card shows tech sheet, desktop sidebar + mobile bottom sheet"
```

---

## Task 7: Manual smoke test

- [ ] **Step 1: Start backend**

```bash
cd Backend && npm run start:dev
```

- [ ] **Step 2: Start frontend**

```bash
cd Frontend && npm run dev
```

- [ ] **Step 3: Open http://localhost:3000/dashboard/catalogo as a vendedor role**

- [ ] **Step 4: Click any product card (not the +/- or Agregar button)**

Expected (desktop ≥ 1024px):
- Filter sidebar slides out, specs sidebar slides in from right
- Header: dark gradient, product image centered, name in white, SKU+price in lime
- If item has `calidad`: signal bars appear in lime
- Ficha table: marca, modelo (if present), SKU
- If item has `especificaciones`: second table with key-value rows

- [ ] **Step 5: Click the same card again**

Expected: specs sidebar closes, filter sidebar slides back in.

- [ ] **Step 6: Click +/- or Agregar on a card**

Expected: specs sidebar does NOT open. Cart updates normally.

- [ ] **Step 7: Resize to mobile width (< 1024px) and click a card**

Expected: specs sidebar hidden, BottomSheet slides up with same content.

- [ ] **Step 8: Open sale modal while specs are open**

Expected: both coexist without visual conflict (specs sidebar z-index normal, sale modal z-50 overlays correctly).
