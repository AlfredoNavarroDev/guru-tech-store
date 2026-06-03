# Landing Page — Guía de Bienvenida por Rol — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `Frontend/app/page.tsx` from a marketing SaaS landing into a role-based welcome guide (Propietario, Administrador, Vendedor, Técnico, Abastecedor) while preserving the existing visual design system.

**Architecture:** Single-file rewrite of `app/page.tsx`. All mock visual components stay inline (existing pattern). Two new mock components added: `RepairMock` (Técnico) and `InventoryMock` (Abastecedor). No new routes, no new files outside `page.tsx`.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, shadcn/ui, lucide-react, `BlurFade` + `AnimatedGridPattern` from `components/ui/`.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify (full rewrite) | `app/page.tsx` | All page content, navbar, hero, 5 role sections, footer, inline mocks |

---

### Task 1: Update imports and add new mock components

**Files:**
- Modify: `app/page.tsx` (top section — imports and mock component functions)

Context: The current file imports `NumberTicker`, `Search`, `Code2`, `Layers`, `Terminal`, `BarChart3`, `Cpu` — none needed in the new design. Two new mocks are needed: `RepairMock` (phone repair orders visual for Técnico) and `InventoryMock` (stock levels visual for Abastecedor).

- [ ] **Step 1: Replace the import block at the top of `app/page.tsx`**

Replace everything from line 1 to the end of the current imports with:

```tsx
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Zap, Package, ShoppingBag, Building2,
  CheckCircle2, ChevronRight, ArrowRight,
  Shield, Smartphone, Menu, X,
} from "lucide-react"
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern"
import { BlurFade } from "@/components/ui/blur-fade"
import { cn } from "@/lib/utils"
```

- [ ] **Step 2: Add `RepairMock` component after the existing `TerminalMock` function**

Find the end of `TerminalMock` (closes with `}`). Add immediately after:

```tsx
function RepairMock() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
          Órdenes de servicio
        </span>
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
      </div>
      {[
        { id: "OS-001", device: "iPhone 13 Pro", status: "En reparación", bg: "bg-blue-100", text: "text-blue-600" },
        { id: "OS-002", device: "Samsung S22",   status: "Diagnóstico",   bg: "bg-yellow-100", text: "text-yellow-600" },
        { id: "OS-003", device: "Xiaomi 12",     status: "Listo",         bg: "bg-green-100",  text: "text-green-600" },
      ].map(({ id, device, status, bg, text }) => (
        <div key={id} className="mb-2 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Smartphone className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-700">{device}</div>
            <div className="text-[10px] text-gray-400">{id}</div>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", bg, text)}>
            {status}
          </span>
        </div>
      ))}
      <div className="mt-3 flex gap-2">
        <div className="flex flex-1 items-center justify-center rounded-xl bg-blue-50 py-2">
          <span className="text-[10px] font-bold text-blue-600">+ Nueva orden</span>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-100 py-2">
          <span className="text-[10px] font-bold text-gray-500">Ver historial</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add `InventoryMock` component after `RepairMock`**

```tsx
function InventoryMock() {
  return (
    <div className="relative h-80 overflow-hidden rounded-2xl bg-bg-dark">
      <AnimatedGridPattern
        className="absolute inset-0 text-white/5 fill-white/5 stroke-white/5"
        numSquares={25}
        maxOpacity={0.04}
        duration={3}
      />
      <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6">
        <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
          Control de stock
        </div>
        {[
          { label: "Laptops ASUS",   stock: 85, color: "bg-blue-500" },
          { label: "Smartphones",    stock: 42, color: "bg-blue-400/70" },
          { label: "Accesorios USB", stock: 93, color: "bg-blue-300/50" },
          { label: "Cables HDMI",    stock: 20, color: "bg-red-400/70" },
          { label: "Cargadores",     stock: 67, color: "bg-blue-500/60" },
        ].map(({ label, stock, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
            <Package className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <span className="flex-1 text-xs text-white/60">{label}</span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10">
              <div className={cn("h-full rounded-full", color)} style={{ width: `${stock}%` }} />
            </div>
            <span className="w-8 text-right text-[10px] font-bold text-white/40">{stock}%</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-20 w-40 -translate-x-1/2 rounded-full bg-blue-100 blur-3xl" />
    </div>
  )
}
```

- [ ] **Step 4: Verify file compiles — run the dev server check**

```bash
cd Frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to `page.tsx`).

---

### Task 2: Rewrite `LandingPage` — navbar and hero

**Files:**
- Modify: `app/page.tsx` (the `LandingPage` export default function — navbar + hero)

Context: The current navbar uses `Section` type with `"plataforma" | "soluciones" | "recursos"`. Replace with role-based anchor links. Hero changes from dark marketing pitch to a welcoming guide intro on `bg-bg-dark`.

- [ ] **Step 1: Replace the `type Section` declaration and `LandingPage` function opening**

Find:
```tsx
type Section = "plataforma" | "soluciones" | "recursos"
```

Replace with:
```tsx
type RoleId = "propietario" | "administrador" | "vendedor" | "tecnico" | "abastecedor"

const NAV_ROLES: { id: RoleId; label: string }[] = [
  { id: "propietario",  label: "Propietario" },
  { id: "administrador", label: "Administrador" },
  { id: "vendedor",     label: "Vendedor" },
  { id: "tecnico",      label: "Técnico" },
  { id: "abastecedor",  label: "Abastecedor" },
]
```

- [ ] **Step 2: Replace the `LandingPage` function body — state + useEffect + navbar**

Find the entire `export default function LandingPage()` opening through the closing `</nav>` tag and replace with:

```tsx
export default function LandingPage() {
  const [active, setActive] = useState<RoleId>("propietario")
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id as RoleId)
        }
      },
      { threshold: 0.3, rootMargin: "-15% 0px -60% 0px" }
    )
    NAV_ROLES.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-bg-main">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-extrabold tracking-tight text-text-heading">
            Guru Tech Store
          </span>
          {/* Desktop links */}
          <div className="hidden items-center gap-6 md:flex">
            {NAV_ROLES.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className={cn(
                  "text-sm transition-colors",
                  active === id
                    ? "border-b-2 border-blue-400 pb-px font-semibold text-text-heading"
                    : "text-text-muted hover:text-text-heading"
                )}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 md:block"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-gray-100 hover:text-text-heading md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="border-t border-gray-100 bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {NAV_ROLES.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "text-sm transition-colors",
                    active === id
                      ? "font-semibold text-text-heading"
                      : "text-text-muted hover:text-text-heading"
                  )}
                >
                  {label}
                </a>
              ))}
              <div className="border-t border-gray-100 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-2xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
```

- [ ] **Step 3: Add hero section immediately after the navbar, before role sections**

Add this right after the closing `</nav>` tag:

```tsx
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-bg-dark py-20 sm:py-28">
        <AnimatedGridPattern
          className="absolute inset-0 text-white/5 fill-white/5 stroke-white/5"
          numSquares={40}
          maxOpacity={0.04}
          duration={3}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <BlurFade delay={0} duration={0.5}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-300">
              <Zap className="h-3 w-3" />
              Sistema ERP · Guru Tech Store
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Bienvenido al sistema
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/50">
              Guía de acceso según tu rol. Conoce tus capacidades antes de iniciar sesión.
            </p>
            <a
              href="#propietario"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Ver roles
              <ChevronRight className="h-4 w-4" />
            </a>
          </BlurFade>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </section>
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd Frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

---

### Task 3: Add Propietario and Administrador sections

**Files:**
- Modify: `app/page.tsx` (role sections 1 and 2)

Context: Each role section uses `grid grid-cols-1 lg:grid-cols-2`. Odd sections (1, 3, 5): text left, mock right. Even sections (2, 4): mock left, text right — achieved by reversing grid child order.

- [ ] **Step 1: Add the Propietario section after the hero**

Add immediately after the hero closing `</section>` tag:

```tsx
      {/* ══ PROPIETARIO ══ */}
      <section id="propietario" className="bg-bg-main">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <Building2 className="h-3 w-3" />
                  Propietario
                </div>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Visión completa del negocio
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Acceso completo al sistema. Supervisa todas las sedes, consulta reportes financieros y gestiona la estructura organizacional.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Ver reportes de ventas por sede",
                    "Gestionar empleados y roles",
                    "Acceso a todas las sedes",
                    "Consultar métricas del negocio",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={0.15} duration={0.5}>
              <DashboardMock />
            </BlurFade>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Add the Administrador section**

Add immediately after the Propietario closing `</section>`:

```tsx
      {/* ══ ADMINISTRADOR ══ */}
      <section id="administrador" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0.15} duration={0.5} className="order-last lg:order-first">
              <ServerMock />
            </BlurFade>
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <Shield className="h-3 w-3" />
                  Administrador
                </div>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Control de la sede
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Administra las operaciones de su sede. Gestiona personal, supervisa el inventario y controla las ventas.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Gestionar empleados de la sede",
                    "Supervisar ventas e inventario",
                    "Configurar precios y catálogo",
                    "Ver reportes de la sede",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>
```

Note: `order-last lg:order-first` makes the mock appear below text on mobile but left on desktop — correct alternating behavior without duplicating grid logic.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd Frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 4: Add Vendedor and Técnico sections

**Files:**
- Modify: `app/page.tsx` (role sections 3 and 4)

- [ ] **Step 1: Add the Vendedor section**

Add immediately after the Administrador closing `</section>`:

```tsx
      {/* ══ VENDEDOR ══ */}
      <section id="vendedor" className="bg-bg-main">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <ShoppingBag className="h-3 w-3" />
                  Vendedor
                </div>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Punto de venta ágil
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Opera el punto de venta. Registra ventas, gestiona clientes y emite boletas de manera rápida y eficiente.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Registrar ventas en el POS",
                    "Buscar y crear clientes",
                    "Emitir boletas de venta",
                    "Consultar catálogo de productos",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={0.15} duration={0.5}>
              <TerminalMock />
            </BlurFade>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Add the Técnico section**

Add immediately after the Vendedor closing `</section>`:

```tsx
      {/* ══ TÉCNICO ══ */}
      <section id="tecnico" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0.15} duration={0.5} className="order-last lg:order-first">
              <RepairMock />
            </BlurFade>
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <Smartphone className="h-3 w-3" />
                  Técnico
                </div>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Servicio técnico profesional
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Recibe y repara dispositivos de clientes. Gestiona órdenes de servicio técnico desde el ingreso hasta la entrega.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Registrar y buscar clientes",
                    "Ingresar dispositivos para reparación",
                    "Gestionar órdenes de servicio técnico",
                    "Registrar diagnóstico y reparación",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd Frontend && npx tsc --noEmit 2>&1 | head -20
```

---

### Task 5: Add Abastecedor section, footer, remove old content, commit

**Files:**
- Modify: `app/page.tsx` (section 5 + footer + cleanup)

- [ ] **Step 1: Add the Abastecedor section**

Add immediately after the Técnico closing `</section>`:

```tsx
      {/* ══ ABASTECEDOR ══ */}
      <section id="abastecedor" className="bg-bg-main">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <BlurFade delay={0} duration={0.5}>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-500">
                  <Package className="h-3 w-3" />
                  Abastecedor
                </div>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-text-heading sm:text-4xl">
                  Gestión de inventario
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  Gestiona el reabastecimiento del inventario. Coordina con proveedores y controla los niveles de stock.
                </p>
                <div className="mt-6 space-y-3">
                  {[
                    "Gestionar órdenes de reposición",
                    "Controlar niveles de stock",
                    "Coordinar con proveedores",
                    "Registrar entradas de inventario",
                  ].map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                      {cap}
                    </div>
                  ))}
                </div>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </BlurFade>
            <BlurFade delay={0.15} duration={0.5}>
              <InventoryMock />
            </BlurFade>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Add footer and close the component**

Add immediately after the Abastecedor closing `</section>`:

```tsx
      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-text-heading">
                Guru Tech Store
              </p>
              <p className="mt-1 text-xs text-text-muted">© 2026 Guru Tech Dev.</p>
            </div>
            <div className="flex flex-wrap gap-6">
              {["Política de Privacidad", "Términos de Servicio", "Seguridad", "Estado"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors hover:text-text-heading"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: Delete everything between the hero closing `</section>` and the Propietario section that belongs to the old page**

At this point `page.tsx` should contain ONLY:
- imports
- `ServerMock`, `DashboardMock`, `TerminalMock`, `RepairMock`, `InventoryMock` functions
- `RoleId` type + `NAV_ROLES` constant
- `LandingPage` component with: navbar → hero → 5 role sections → footer

If any old sections remain (the old `<section id="plataforma">`, `<section id="soluciones">`, `<section id="recursos">`, stats row, "Meet Guru AI", "For Developers", search bar, business type cards) — delete them now.

- [ ] **Step 4: Final TypeScript check**

```bash
cd Frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 new errors.

- [ ] **Step 5: Start dev server and visually verify**

```bash
cd Frontend && npm run dev
```

Open `http://localhost:3000` and check:
- [ ] Navbar shows 5 role links + "Iniciar sesión" button
- [ ] Hero shows on dark background with AnimatedGridPattern
- [ ] Scrolling highlights the correct nav link per section
- [ ] Each role section alternates text-left/mock-right correctly
- [ ] All 5 "Iniciar sesión" CTAs link to `/login`
- [ ] Mobile hamburger opens/closes with role links
- [ ] Footer renders correctly

- [ ] **Step 6: Commit**

```bash
git add Frontend/app/page.tsx
git commit -m "feat(frontend): redesign landing page as role-based welcome guide"
```

---

## Self-Review

**Spec coverage:**
- ✅ Navbar: role anchor links + "Iniciar sesión" CTA
- ✅ Hero: dark bg, AnimatedGridPattern, welcome copy, scroll CTA
- ✅ Stats row removed (not in spec)
- ✅ Propietario: DashboardMock, text left
- ✅ Administrador: ServerMock, mock left (alternated)
- ✅ Vendedor: TerminalMock, text left
- ✅ Técnico: RepairMock (not CodeBlock — adjusted to fit phone repair role), mock left
- ✅ Abastecedor: InventoryMock, text left
- ✅ Each section: role badge + h2 + description + 4 capabilities + CTA
- ✅ Footer unchanged
- ✅ `CodeBlock` function removed (no longer used) — implementer must delete it

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code blocks complete.

**Type consistency:** `RoleId` defined Task 2 Step 1, used in `useState<RoleId>` in same task. `NAV_ROLES` array defined Task 2 Step 1, used in navbar map in same task. All mock function names match across tasks.

**Gap found:** `CodeBlock` and `ServerMock` + `DashboardMock` + `TerminalMock` mock functions from the original file — `CodeBlock` is unused in the new design. The implementer must delete `CodeBlock` during Task 5 Step 3 cleanup. Already covered by that step's instruction.
