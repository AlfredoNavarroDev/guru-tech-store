# Frontend Best Practices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Vercel React best-practice violations found in the Frontend audit: delete dead code, add useMemo for expensive inline derivations, fix unnecessary state re-renders.

**Architecture:** Four independent tasks in order of impact: (1) delete 32 unused component files to shrink the bundle, (2) wrap 8 inline derivations in catalogo/page.tsx with useMemo, (3) wrap 3 inline derivations in ventas/page.tsx with useMemo, (4) replace today's useEffect+setState in dashboard/page.tsx with lazy state init to eliminate one extra render.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, motion/react

---

## Task 1: Delete unused components

**Files:**
- Delete: `Frontend/components/landing/CTASection.tsx`
- Delete: `Frontend/components/landing/DarkSection.tsx`
- Delete: `Frontend/components/landing/FeaturesSection.tsx`
- Delete: `Frontend/components/landing/Footer.tsx`
- Delete: `Frontend/components/landing/HeroSection.tsx`
- Delete: `Frontend/components/landing/Navbar.tsx`
- Delete: `Frontend/components/landing/StatsSection.tsx`
- Delete: `Frontend/components/ui/alert.tsx`
- Delete: `Frontend/components/ui/animated-gradient-text.tsx`
- Delete: `Frontend/components/ui/animated-list.tsx`
- Delete: `Frontend/components/ui/animated-shiny-text.tsx`
- Delete: `Frontend/components/ui/auto-dismiss-error.tsx`
- Delete: `Frontend/components/ui/bento-grid.tsx`
- Delete: `Frontend/components/ui/border-beam.tsx`
- Delete: `Frontend/components/ui/breadcrumb.tsx`
- Delete: `Frontend/components/ui/card.tsx`
- Delete: `Frontend/components/ui/checkbox.tsx`
- Delete: `Frontend/components/ui/command.tsx`
- Delete: `Frontend/components/ui/dot-pattern.tsx`
- Delete: `Frontend/components/ui/drawer.tsx`
- Delete: `Frontend/components/ui/dropdown-menu.tsx`
- Delete: `Frontend/components/ui/input-group.tsx`
- Delete: `Frontend/components/ui/meteors.tsx`
- Delete: `Frontend/components/ui/pagination.tsx`
- Delete: `Frontend/components/ui/popover.tsx`
- Delete: `Frontend/components/ui/progress.tsx`
- Delete: `Frontend/components/ui/scroll-area.tsx`
- Delete: `Frontend/components/ui/select.tsx`
- Delete: `Frontend/components/ui/separator.tsx`
- Delete: `Frontend/components/ui/shimmer-button.tsx`
- Delete: `Frontend/components/ui/sparkles-text.tsx`
- Delete: `Frontend/components/ui/tabs.tsx`
- Delete: `Frontend/components/ui/textarea.tsx`
- Delete: `Frontend/components/ui/word-rotate.tsx`

- [ ] **Step 1: Verify none of these files are imported anywhere**

```bash
cd Frontend
grep -r "CTASection\|DarkSection\|FeaturesSection\|HeroSection\|Navbar\|StatsSection\|landing/Footer" app/ components/dashboard components/login --include="*.tsx" --include="*.ts"
```
Expected: zero matches. If any match appears, do NOT delete that file.

```bash
grep -r "from.*ui/alert\|from.*ui/animated-list\|from.*ui/auto-dismiss\|from.*ui/bento-grid\|from.*ui/border-beam\|from.*ui/breadcrumb\|from.*ui/card\b\|from.*ui/checkbox\|from.*ui/command\b\|from.*ui/dot-pattern\|from.*ui/drawer\|from.*ui/dropdown-menu\|from.*ui/input-group\|from.*ui/meteors\|from.*ui/pagination\|from.*ui/popover\|from.*ui/progress\|from.*ui/scroll-area\|from.*ui/select\b\|from.*ui/separator\|from.*ui/shimmer-button\|from.*ui/sparkles-text\|from.*ui/tabs\b\|from.*ui/textarea\|from.*ui/word-rotate\|from.*ui/animated-gradient-text\|from.*ui/animated-shiny-text" app/ components/dashboard components/login --include="*.tsx" --include="*.ts"
```
Expected: zero matches.

- [ ] **Step 2: Delete all landing components**

```bash
cd Frontend
rm components/landing/CTASection.tsx
rm components/landing/DarkSection.tsx
rm components/landing/FeaturesSection.tsx
rm components/landing/Footer.tsx
rm components/landing/HeroSection.tsx
rm components/landing/Navbar.tsx
rm components/landing/StatsSection.tsx
rmdir components/landing 2>/dev/null || true
```

- [ ] **Step 3: Delete unused UI components**

```bash
cd Frontend
rm components/ui/alert.tsx
rm components/ui/animated-gradient-text.tsx
rm components/ui/animated-list.tsx
rm components/ui/animated-shiny-text.tsx
rm components/ui/auto-dismiss-error.tsx
rm components/ui/bento-grid.tsx
rm components/ui/border-beam.tsx
rm components/ui/breadcrumb.tsx
rm components/ui/card.tsx
rm components/ui/checkbox.tsx
rm components/ui/command.tsx
rm components/ui/dot-pattern.tsx
rm components/ui/drawer.tsx
rm components/ui/dropdown-menu.tsx
rm components/ui/input-group.tsx
rm components/ui/meteors.tsx
rm components/ui/pagination.tsx
rm components/ui/popover.tsx
rm components/ui/progress.tsx
rm components/ui/scroll-area.tsx
rm components/ui/select.tsx
rm components/ui/separator.tsx
rm components/ui/shimmer-button.tsx
rm components/ui/sparkles-text.tsx
rm components/ui/tabs.tsx
rm components/ui/textarea.tsx
rm components/ui/word-rotate.tsx
```

- [ ] **Step 4: Verify TypeScript build has no errors**

```bash
cd Frontend
npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors. If errors appear, the deleted file was imported somewhere — restore it and investigate.

- [ ] **Step 5: Commit**

```bash
git add -A Frontend/components/landing/ Frontend/components/ui/
git commit -m "chore(frontend): delete 32 unused component files

Removes 7 dead landing/ components and 25 unreachable ui/ components
identified by static import analysis. No active page imports any of these."
```

---

## Task 2: useMemo for 8 inline derivations in catalogo/page.tsx

**Context:** `CatalogoPage` has ~40 state variables. Every `setState` call re-executes these 8 inline derivations unnecessarily. Wrapping them in `useMemo` makes them recompute only when their actual dependencies change.

**Files:**
- Modify: `Frontend/app/dashboard/catalogo/page.tsx`

- [ ] **Step 1: Locate and read the derivation block**

Open `Frontend/app/dashboard/catalogo/page.tsx` lines 428–470 to confirm current code before editing.

- [ ] **Step 2: Replace inline derivations with useMemo**

Find this block in `catalogo/page.tsx` (approximately lines 428–469):

```typescript
  const subtotal = cartItems.reduce((s, c) => s + c.importe, 0)
  const totalItems = cartItems.reduce((s, c) => s + c.cantidad, 0)

  // sidebar selection helpers
  const sidebarSelectedItems = cartItems.filter((i) => !sidebarDeselected.has(i.id_item))
  const sidebarSubtotal = sidebarSelectedItems.reduce((s, c) => s + c.importe, 0)
  const sidebarSubtotalOriginal = sidebarSelectedItems.reduce((s, c) => {
    const base = c.precio_normal_momento ?? c.precio_unitario_momento
    return s + base * c.cantidad
  }, 0)
  const sidebarHasPromo = sidebarSubtotalOriginal > sidebarSubtotal
  const sidebarTotalItems = sidebarSelectedItems.reduce((s, c) => s + c.cantidad, 0)
  const sidebarAllSelected = cartItems.length > 0 && sidebarDeselected.size === 0
```

Replace with:

```typescript
  const subtotal = useMemo(() => cartItems.reduce((s, c) => s + c.importe, 0), [cartItems])
  const totalItems = useMemo(() => cartItems.reduce((s, c) => s + c.cantidad, 0), [cartItems])

  // sidebar selection helpers
  const sidebarSelectedItems = useMemo(
    () => cartItems.filter((i) => !sidebarDeselected.has(i.id_item)),
    [cartItems, sidebarDeselected],
  )
  const sidebarSubtotal = useMemo(
    () => sidebarSelectedItems.reduce((s, c) => s + c.importe, 0),
    [sidebarSelectedItems],
  )
  const sidebarSubtotalOriginal = useMemo(
    () =>
      sidebarSelectedItems.reduce((s, c) => {
        const base = c.precio_normal_momento ?? c.precio_unitario_momento
        return s + base * c.cantidad
      }, 0),
    [sidebarSelectedItems],
  )
  const sidebarHasPromo = sidebarSubtotalOriginal > sidebarSubtotal
  const sidebarTotalItems = useMemo(
    () => sidebarSelectedItems.reduce((s, c) => s + c.cantidad, 0),
    [sidebarSelectedItems],
  )
  const sidebarAllSelected = cartItems.length > 0 && sidebarDeselected.size === 0
```

Then find these two lines (approximately lines 465–469):

```typescript
  const catalogoTotalPages = Math.ceil(filteredItems.length / CATALOGO_LIMIT)
  const paginatedCatalogoItems = filteredItems.slice(
    (catalogoPage - 1) * CATALOGO_LIMIT,
    catalogoPage * CATALOGO_LIMIT,
  )
```

Replace with:

```typescript
  const catalogoTotalPages = useMemo(
    () => Math.ceil(filteredItems.length / CATALOGO_LIMIT),
    [filteredItems],
  )
  const paginatedCatalogoItems = useMemo(
    () => filteredItems.slice((catalogoPage - 1) * CATALOGO_LIMIT, catalogoPage * CATALOGO_LIMIT),
    [filteredItems, catalogoPage],
  )
```

- [ ] **Step 3: Verify TypeScript build passes**

```bash
cd Frontend
npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add Frontend/app/dashboard/catalogo/page.tsx
git commit -m "perf(catalogo): wrap 8 inline derivations in useMemo

cartItems has ~40 sibling state variables; every setState was re-running
subtotal, totalItems, sidebar reduce chains, and pagination slice.
Each now recomputes only when its specific dependencies change."
```

---

## Task 3: useMemo for 3 inline derivations in ventas/page.tsx

**Context:** `totalPages`, `hasFilters`, and `selectedVenta` are derived from state objects inline in the render body. `selectedVenta` runs `Array.find()` on every render even when `selectedVentaId` and `summaries` haven't changed.

**Files:**
- Modify: `Frontend/app/dashboard/ventas/page.tsx`

- [ ] **Step 1: Locate and read the derivation block**

Open `Frontend/app/dashboard/ventas/page.tsx` lines 393–397 to confirm current code:

```typescript
  const summaries: VentaSummary[] = useMemo(() => groupVentas(data?.items ?? []), [data?.items])
  const dayGroups: DayGroup[] = useMemo(() => groupByDay(summaries), [summaries])
  const totalPages = data?.totalPages ?? 1
  const hasFilters = appliedDesde || appliedHasta || appliedNombre
  const selectedVenta = summaries.find((s) => s.id_venta === selectedVentaId)
```

- [ ] **Step 2: Wrap the three derivations in useMemo**

Check the import line at the top for `useMemo`. It should already be imported since the file uses it above. If not, add it to the React import.

Replace the block above with:

```typescript
  const summaries: VentaSummary[] = useMemo(() => groupVentas(data?.items ?? []), [data?.items])
  const dayGroups: DayGroup[] = useMemo(() => groupByDay(summaries), [summaries])
  const totalPages = useMemo(() => data?.totalPages ?? 1, [data?.totalPages])
  const hasFilters = useMemo(
    () => !!(appliedDesde || appliedHasta || appliedNombre),
    [appliedDesde, appliedHasta, appliedNombre],
  )
  const selectedVenta = useMemo(
    () => summaries.find((s) => s.id_venta === selectedVentaId),
    [summaries, selectedVentaId],
  )
```

- [ ] **Step 3: Verify TypeScript build passes**

```bash
cd Frontend
npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add Frontend/app/dashboard/ventas/page.tsx
git commit -m "perf(ventas): memoize totalPages, hasFilters, selectedVenta

selectedVenta was running Array.find on every render regardless of whether
summaries or selectedVentaId changed. hasFilters and totalPages are now
stable references for downstream conditional renders."
```

---

## Task 4: Fix `today` unnecessary re-render in dashboard/page.tsx

**Context:** `today` is a formatted date string that never changes after mount. Storing it via `useEffect`+`setState` causes an extra render cycle. Using lazy state initialization (`useState(() => ...)`) computes the value once during first render with no subsequent re-render.

**Files:**
- Modify: `Frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Locate the current pattern**

Open `Frontend/app/dashboard/page.tsx` lines 58–76 to confirm current code:

```typescript
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [today, setToday] = useState("")

  useEffect(() => {
    // Razonamiento: diferir datos derivados del navegador evita setState síncrono dentro del efecto inicial.
    const dashboardHydrationTimeout = window.setTimeout(() => {
      setSession(getSession())
      setToday(new Date().toLocaleDateString("es-PE", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      }))
    }, 0)
    getEstadisticas()
      .then(setStats)
      .catch(() => setError(true))
    return () => window.clearTimeout(dashboardHydrationTimeout)
  }, [])
```

- [ ] **Step 2: Extract `today` to lazy state init**

`session` must stay deferred (reads `localStorage`, would cause SSR/hydration mismatch if read synchronously). `today` does not access any browser-only API — `Date` works fine on the server — but we keep it in client state to avoid hydration mismatch (server renders empty string, client renders today's date). The fix is `useState(() => ...)` lazy init: runs once on first client render, no second render.

Replace:

```typescript
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [today, setToday] = useState("")

  useEffect(() => {
    // Razonamiento: diferir datos derivados del navegador evita setState síncrono dentro del efecto inicial.
    const dashboardHydrationTimeout = window.setTimeout(() => {
      setSession(getSession())
      setToday(new Date().toLocaleDateString("es-PE", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      }))
    }, 0)
    getEstadisticas()
      .then(setStats)
      .catch(() => setError(true))
    return () => window.clearTimeout(dashboardHydrationTimeout)
  }, [])
```

With:

```typescript
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null)
  const [today] = useState(() =>
    new Date().toLocaleDateString("es-PE", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })
  )

  useEffect(() => {
    const dashboardHydrationTimeout = window.setTimeout(() => {
      setSession(getSession())
    }, 0)
    getEstadisticas()
      .then(setStats)
      .catch(() => setError(true))
    return () => window.clearTimeout(dashboardHydrationTimeout)
  }, [])
```

- [ ] **Step 3: Verify TypeScript build passes**

```bash
cd Frontend
npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors.

- [ ] **Step 4: Confirm `today` renders correctly in the dashboard**

```bash
cd Frontend
npm run dev
```

Open `http://localhost:3000/login`, log in, navigate to `/dashboard`. Verify the date shows correctly (e.g., "martes, 10 de junio de 2026").

- [ ] **Step 5: Commit**

```bash
git add Frontend/app/dashboard/page.tsx
git commit -m "perf(dashboard): use lazy useState for today string

today never changes after mount. useEffect+setState was causing an extra
render cycle. Lazy init computes the value once during first render."
```
