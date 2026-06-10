# Sprint 2 — Frontend

**Stack:** Next.js 14 · Tailwind CSS · Magic UI · Lucide React  
**Entregables:** Landing page pública + Panel de administración de empleados

---

## Páginas

| Ruta               | Archivo                         | Descripción                       |
|--------------------|---------------------------------|-----------------------------------|
| `/`                | `app/page.tsx`                  | Landing page pública              |
| `/dashboard/admin` | `app/dashboard/admin/page.tsx`  | Panel admin — gestión empleados   |

---

## Landing Page (`/`)

### Objetivo
Página principal pública. Presenta el sistema. Tono profesional, tech, confiable.

### Paleta de Colores
| Token           | Valor     | Uso                      |
|-----------------|-----------|--------------------------|
| `bg-hero`       | `#0a0a0a` | Hero, secciones dark     |
| `bg-section`    | `#ffffff` / `#f8f8f8` | Secciones light |
| `accent-primary`| `#3b82f6` | Links, highlights        |
| `accent-green`  | `#22c55e` | Badges, bullets positivos|
| `text-muted`    | `#6b7280` | Subtítulos, labels       |

### Secciones

#### 1. Navbar
- Sticky, `backdrop-blur-md bg-black/80 border-b border-white/10`
- Logo: `Guru Tech Store` (texto bold)
- Links: Plataforma, Soluciones, Recursos
- CTAs: "Iniciar sesión" (ghost) + "Contacto" (`ShimmerButton`)

#### 2. Hero (dark)
- Fondo: `Meteors` — baja densidad
- Badge: `AnimatedShinyText` — "✦ SISTEMA DE GESTION"
- Headline: "Control de" + `WordRotate` (["inventario", "ventas", "personal"]) + "en múltiples sedes"
- CTAs: `ShimmerButton` "Iniciar sesión →" + botón ghost "Ver demo ○"
- Visual: Card/mockup del dashboard con `BorderBeam`

#### 3. Stats Bar (light)
- 4 columnas con `NumberTicker` al scroll:
  - `99.9%` — "Garantía de tiempo de actividad"
  - `1.2M+` — "Ops gestionadas"
  - `150ms` — "Latencia de consulta"
  - `24/7` — "Soporte experto"

#### 4. Features — Funcionalidades principales
- Fondo: `DotPattern` con máscara radial
- `BentoGrid` 3 col desktop / 1 mobile
- Cards con `BorderBeam` al hover:

  | Card | Icono | Descripción |
  |------|-------|-------------|
  | Inventario inteligente | `Package` | Análisis tendencias, reposición auto |
  | Asistente de IA | `Bot` | Consulta info en lenguaje natural |
  | Omni-Ventas | `ShoppingCart` | Ventas unificadas |
  | Multi-Sede | `Building2` | Gestión múltiples sedes |
  | Gestión de pedidos | `ClipboardList` | Procesamiento y trazabilidad |
  | Control de ventas | `TrendingUp` | Suite unificada de punto de venta |

#### 5. Dark Section — "Diseñado para optimizar la gestión empresarial"
- Fondo `#0a0a0a` con `WarpBackground`
- `AnimatedGradientText` headline
- 2 bullets: Motor de datos relacional · Seguridad inmutable

#### 6. Meet Guru AI (dark)
- Badge: "NEXT-GEN INTELLIGENCE"
- Headline: "Meet Guru AI"
- Features IA: gestión de ingresos, análisis y planificación
- CTA: `ShimmerButton` "Solicitar acceso"

#### 7. CTA Final (light)
- `SparklesText`: "¿Listo para mejorar la gestión de tus operaciones comerciales?"
- Dos `ShimmerButton`: "Solicitar acceso" + "Contactar al administrador"

#### 8. Footer (dark)
- 4 columnas: logo/tagline, Plataforma, Términos, Seguridad
- `© 2026 GURU TECH STORE. SISTEMA DE GESTIÓN DE PRECISIÓN.`

### Magic UI Components
`meteors` · `animated-shiny-text` · `word-rotate` · `number-ticker` · `bento-grid` · `border-beam` · `dot-pattern` · `shimmer-button` · `sparkles-text` · `animated-gradient-text` · `warp-background`

### Archivos
```
app/page.tsx
components/landing/
  Navbar.tsx
  HeroSection.tsx
  StatsSection.tsx
  FeaturesSection.tsx
  DarkOptimizeSection.tsx
  AISection.tsx
  CTASection.tsx
  Footer.tsx
```

---

## Panel Admin — Gestión de Empleados

### Objetivo
Interfaz para que el admin registre y administre empleados de su sede.

### Layout
```
┌──────────────────────────────────────────┐
│  Dashboard Admin · Sede: [nombre sede]   │
├──────────────┬───────────────────────────┤
│   Sidebar    │  Empleados de la Sede     │
│              │  ─────────────────────── │
│  · Empleados │  [+ Nuevo Empleado]       │
│              │                           │
│              │  Filtros: cargo | estado  │
│              │                           │
│              │  Tabla:                   │
│              │  Nombre | Cargo | Estado  │
│              │  [Editar] [Desactivar]    │
└──────────────┴───────────────────────────┘
```

### Componentes
- Tabla de empleados con paginación
- Modal "Crear Empleado" con form validado
- Modal "Editar Empleado"
- Toggle de estado activo/inactivo
- Badge de cargo con colores por rol

### Integración con Backend
```typescript
// GET /empleados
const { data: empleados } = await fetcher('/empleados', token);

// POST /empleados
await fetch('/empleados', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(createEmpleadoDto),
});
```

### Archivos
```
app/dashboard/admin/
  page.tsx
components/admin/
  EmpleadosTable.tsx
  CreateEmpleadoModal.tsx
  EditEmpleadoModal.tsx
  CargoBadge.tsx
```
