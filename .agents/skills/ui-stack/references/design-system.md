# Design System — UI Stack

---

## Fuentes

El proyecto usa **Plus Jakarta Sans** como fuente primaria, cargada via `next/font` en `app/layout.tsx` (ya configurado).

```tsx
// app/layout.tsx — ya implementado, no duplicar
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700'],
})
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
```

En CSS (`globals.css`):
```css
--font-sans: var(--font-jakarta);
--font-mono: var(--font-geist-mono);
body { font-family: var(--font-jakarta, 'Plus Jakarta Sans', Arial, sans-serif); }
```

En componentes: usar `font-sans` (Tailwind) — nunca hardcodear la fuente.

---

## Design Tokens del Proyecto

Definidos en `globals.css` bajo `@theme inline`. Se usan como clases Tailwind prefijadas automáticamente.

### Colores del proyecto

| Token CSS | Clase Tailwind | Valor hex | Uso |
|---|---|---|---|
| `--color-primary-lime` | `bg-primary-lime` · `text-primary-lime` | `#B3FF4D` | CTA principal, highlights, acento |
| `--color-accent-cyan` | `bg-accent-cyan` · `text-accent-cyan` | `#10B5D1` | Acento secundario, links activos, gráficos |
| `--color-bg-dark` | `bg-bg-dark` | `#0B0E14` | Fondo base dark mode |
| `--color-bg-main` | `bg-bg-main` | `#F4F7F9` | Fondo base light mode |
| `--color-surface` | `bg-surface` | `#FFFFFF` | Superficie de cards y panels |
| `--color-text-heading` | `text-text-heading` | `#1A202C` | Headings principales |
| `--color-text-muted` | `text-text-muted` | `#64748B` | Texto secundario, labels, placeholders |

### Tokens semánticos de shadcn (siempre disponibles)

```
bg-background      text-foreground
bg-card            text-card-foreground
bg-primary         text-primary-foreground
bg-secondary       text-secondary-foreground
bg-muted           text-muted-foreground
bg-accent          text-accent-foreground
bg-destructive     text-destructive-foreground
border             ring
bg-popover         text-popover-foreground
```

### Radio y espaciado

```css
--radius: 0.625rem   /* base radius */
--radius-sm:  calc(var(--radius) * 0.6)   /* ~0.375rem */
--radius-md:  calc(var(--radius) * 0.8)   /* ~0.5rem   */
--radius-lg:  var(--radius)               /* 0.625rem  */
--radius-xl:  calc(var(--radius) * 1.4)   /* ~0.875rem */
--radius-2xl: calc(var(--radius) * 1.8)   /* ~1.125rem */
```

Clases Tailwind: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`

**Nunca hardcodear hex en componentes** — usar siempre tokens o clases Tailwind semánticas.

---

## Estructura de globals.css

```css
/* 1. Tailwind v4 — sin tailwind.config.js */
@import "tailwindcss";

/* 2. Keyframes CSS animados (gradient, shiny-text, meteor, shimmer, etc.) */
@import "tw-animate-css";

/* 3. Variables base-nova de shadcn (tokens oklch) */
@import "shadcn/tailwind.css";

/* 4. Dark mode — next-themes pone class="dark" en <html> */
@custom-variant dark (&:is(.dark *));

/* 5. Tema inline — mapea CSS vars a clases Tailwind */
@theme inline {
  --font-sans: var(--font-jakarta);
  --font-mono: var(--font-geist-mono);

  /* Tokens del proyecto */
  --color-primary-lime: #B3FF4D;
  --color-accent-cyan:  #10B5D1;
  --color-bg-dark:      #0B0E14;
  --color-bg-main:      #F4F7F9;
  --color-surface:      #FFFFFF;
  --color-text-heading: #1A202C;
  --color-text-muted:   #64748B;

  /* Animaciones Magic UI */
  --animate-gradient:   gradient 8s linear infinite;
  --animate-shiny-text: shiny-text 8s infinite;
  --animate-meteor:     meteor 5s linear infinite;

  /* Tokens shadcn (mapeados desde :root) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... resto de tokens */
}

/* 6. Keyframes Magic UI que NO están en tw-animate-css */
@keyframes shimmer-slide { to { transform: translate(calc(100cqw - 100%), 0); } }
@keyframes spin-around { /* rotación 0-360 */ }

/* 7. Utilities Tailwind para Magic UI */
@utility animate-shimmer-slide { animation: shimmer-slide var(--speed, 3s) ease-in-out infinite alternate; }
@utility animate-spin-around { animation: spin-around calc(var(--speed, 3s) * 2) infinite linear; }

/* 8. CSS vars shadcn */
:root { --background: #F4F7F9; --foreground: #1A202C; /* ... oklch vars */ }
.dark { --background: oklch(0.145 0 0); /* ... */ }
```

### Nota sobre keyframes duplicados

`tw-animate-css` ya provee `gradient`, `shiny-text` y `meteor`. `globals.css` los redefine en `@theme inline` — las definiciones de globals.css ganan por cascade. Es redundancia controlada. **No agregar más redefiniciones manuales** de keyframes que ya existan en `tw-animate-css`.

### Cómo agregar un token nuevo

```css
@theme inline {
  --color-nuevo-token: #valor;
}
```

Tailwind lo convierte automáticamente a `bg-nuevo-token`, `text-nuevo-token`, `border-nuevo-token`, etc.

---

## Dark Mode

```tsx
// app/layout.tsx — ya configurado
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>  {/* suppressHydrationWarning es obligatorio */}
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Toggle de tema

```tsx
'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark'
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />}
    </button>
  )
}
```

### Reglas de dark mode

- Usar prefijo `dark:` en Tailwind para todos los overrides
- Usar tokens semánticos (`bg-card`, `text-muted-foreground`) — se adaptan automáticamente
- Nunca hardcodear hex — si usas `text-text-heading` en light, en dark usa `dark:text-white` o el token correspondiente
- `@base-ui/react` no adapta dark automáticamente — aplicar `dark:` explícito en sus className

```tsx
// ✅ Tokens semánticos — se adaptan solos
<div className="bg-card text-card-foreground border">

// ✅ Tokens del proyecto con dark manual
<div className="bg-bg-main dark:bg-bg-dark text-text-heading dark:text-white">

// ❌ Nunca
<div style={{ backgroundColor: '#F4F7F9' }}>
```

---

## Escalas de Tipografía

Escala recomendada para el dashboard:

| Clase Tailwind | Uso |
|---|---|
| `text-xs` (12px) | Labels de badge, captions |
| `text-sm` (14px) | Texto de tabla, formularios |
| `text-base` (16px) | Texto de body |
| `text-lg` (18px) | Subtítulos de sección |
| `text-xl` (20px) | Títulos de card |
| `text-2xl` (24px) | KPI values |
| `text-3xl` (30px) | Headings de página |

Peso tipográfico:
- `font-normal` (400) — body, tablas
- `font-medium` (500) — labels, nav items activos
- `font-semibold` (600) — KPI values, headings de card
- `font-bold` (700) — headings de página principales

---

## CSS Animations — Clases Disponibles

Provistas por `tw-animate-css` + definiciones en `globals.css`:

| Clase | Uso |
|---|---|
| `animate-gradient` | `animated-gradient-text.tsx` |
| `animate-shiny-text` | `animated-shiny-text.tsx` |
| `animate-meteor` | `meteors.tsx` |
| `animate-shimmer-slide` | `shimmer-button.tsx` |
| `animate-spin-around` | `shimmer-button.tsx` |
| `animate-pulse` | Skeletons de loading |
| `animate-spin` | Spinners de carga |
| `animate-bounce` | Indicadores de atención |
