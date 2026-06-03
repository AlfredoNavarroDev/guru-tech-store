# Landing Page — Guía de Bienvenida por Rol

**Date:** 2026-06-03  
**Scope:** `Frontend/app/page.tsx`  
**Status:** Approved

---

## Context

Current `app/page.tsx` is a SaaS marketing landing page. Goal: replace content with a role-based welcome guide for employees of Guru Tech Store. Same visual design (blue palette, BlurFade, AnimatedGridPattern, existing mock components). Public page — visible before login.

---

## Architecture

Single file rewrite: `Frontend/app/page.tsx`. No new routes, no new components needed beyond one new `InventoryMock` for the Abastecedor section. Reuses all existing UI primitives from `components/ui/`.

---

## Page Structure

### Navbar
- Logo: "Guru Tech Store"
- Anchor links: Propietario · Administrador · Vendedor · Técnico · Abastecedor
- CTA button: "Iniciar sesión" → `/login`
- Mobile hamburger (same logic as current)

### Hero (`bg-bg-dark`, `AnimatedGridPattern`)
- Badge: "Sistema ERP · Guru Tech Store"
- H1: "Bienvenido al sistema"
- Subtitle: "Guía de acceso según tu rol. Conoce tus capacidades antes de iniciar sesión."
- CTA: "Ver roles ↓" (smooth scroll to first role section)
- No stats row (removed — irrelevant for guide context)

### Role Sections — Alternating layout

Each section: `grid grid-cols-1 lg:grid-cols-2`, text + visual alternating left/right.  
Each section contains:
- Role badge (e.g. `PROPIETARIO`)
- H2: role name
- Description paragraph
- Capabilities list (4 items, `CheckCircle2` icon, same style as current)
- CTA button: "Iniciar sesión →" → `/login`

| # | Role | Background | Layout | Visual mock |
|---|------|-----------|--------|-------------|
| 1 | Propietario | `bg-bg-main` | text left / visual right | `DashboardMock` |
| 2 | Administrador | `bg-white` | visual left / text right | `ServerMock` |
| 3 | Vendedor | `bg-bg-main` | text left / visual right | `TerminalMock` |
| 4 | Técnico | `bg-white` | visual left / text right | `CodeBlock` |
| 5 | Abastecedor | `bg-bg-main` | text left / visual right | `InventoryMock` (new) |

### Footer
Identical to current footer.

---

## Role Content

### Propietario
**Descripción:** Acceso completo al sistema. Supervisa todas las sedes, consulta reportes financieros y gestiona la estructura organizacional.  
**Capacidades:**
1. Ver reportes de ventas por sede
2. Gestionar empleados y roles
3. Acceso a todas las sedes
4. Consultar métricas del negocio

### Administrador
**Descripción:** Administra las operaciones de su sede. Gestiona personal, supervisa el inventario y controla las ventas.  
**Capacidades:**
1. Gestionar empleados de la sede
2. Supervisar ventas e inventario
3. Configurar precios y catálogo
4. Ver reportes de la sede

### Vendedor
**Descripción:** Opera el punto de venta. Registra ventas, gestiona clientes y emite boletas.  
**Capacidades:**
1. Registrar ventas en el POS
2. Buscar y crear clientes
3. Emitir boletas de venta
4. Consultar catálogo de productos

### Técnico
**Descripción:** Recibe y repara dispositivos de clientes. Gestiona órdenes de servicio técnico desde el ingreso hasta la entrega.  
**Capacidades:**
1. Registrar y buscar clientes
2. Ingresar dispositivos para reparación
3. Gestionar órdenes de servicio técnico
4. Registrar diagnóstico y reparación

### Abastecedor
**Descripción:** Gestiona el reabastecimiento del inventario. Coordina con proveedores y controla los niveles de stock.  
**Capacidades:**
1. Gestionar órdenes de reposición
2. Controlar niveles de stock
3. Coordinar con proveedores
4. Registrar entradas de inventario

---

## New Component: `InventoryMock`

Simple dark-bg mock showing inventory rows with stock indicators. Reuses existing pattern from `ServerMock` (animated rows) but adds stock level bars and a "STOCK" label. Defined inline in `page.tsx` alongside other mocks.

---

## What Changes

- `app/page.tsx` — full rewrite (content only, same component patterns)
- Nav section IDs: `propietario`, `administrador`, `vendedor`, `tecnico`, `abastecedor`
- Remove: stats row, "Meet Guru AI" section, "For Developers" section, search bar, business type cards
- Keep: navbar pattern, BlurFade animations, alternating section layout, footer

## What Does NOT Change

- `globals.css` — no token changes
- `components/ui/*` — no modifications
- `/login` route — untouched
- Design tokens, fonts, color palette
