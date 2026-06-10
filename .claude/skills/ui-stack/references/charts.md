# Charts — UI Stack

Librería: **shadcn charts** (wrapper de Recharts). Todos los charts son Client Components.

## Instalación

```bash
npx shadcn@latest add chart
```

Genera `components/ui/chart.tsx` con `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`.

---

## Tokens de color (globals.css)

shadcn charts usa CSS variables automáticamente — se adaptan a dark mode sin código extra:

```css
--chart-1: hsl(...);  /* color principal */
--chart-2: hsl(...);
--chart-3: hsl(...);
--chart-4: hsl(...);
--chart-5: hsl(...);
```

Usar `var(--chart-1)` etc. en `fill` y `stroke` — nunca hex hardcodeado.

---

## Patrón Server/Client para charts

```tsx
// app/dashboard/ventas/page.tsx  ← Server Component
import { VentasChart } from './VentasChart'
export default async function Page() {
  const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ventas/resumen`, {
    next: { revalidate: 60 },
  }).then(r => r.json())
  return <VentasChart data={data} />
}

// VentasChart.tsx  ← Client Component
'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
```

---

## 1. Bar Chart vertical — ventas por período

Uso: ventas por día/semana/mes, comparativa por vendedor.

```tsx
'use client'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

const chartConfig = {
  ventas: { label: 'Ventas', color: 'var(--chart-1)' },
  devoluciones: { label: 'Devoluciones', color: 'var(--chart-2)' },
}

export function VentasMensualesChart({ data }: { data: { mes: string; ventas: number; devoluciones: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `S/ ${(v / 1000).toFixed(0)}k`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="ventas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="devoluciones" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
```

---

## 2. Bar Chart horizontal — top productos / ranking

Uso: top 10 productos más vendidos, vendedores con mayor ingreso.

```tsx
'use client'
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = { total: { label: 'Total vendido', color: 'var(--chart-1)' } }

export function TopProductosChart({ data }: { data: { nombre: string; total: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `S/ ${v.toLocaleString('es-PE')}`}
        />
        <YAxis type="category" dataKey="nombre" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
```

---

## 3. Line / Area Chart — tendencia temporal

Uso: flujo de caja, ingresos acumulados, clientes nuevos por mes.

```tsx
'use client'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = { ingresos: { label: 'Ingresos', color: 'var(--chart-1)' } }

export function IngresosAreaChart({ data }: { data: { fecha: string; ingresos: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `S/ ${(v / 1000).toFixed(0)}k`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="ingresos"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#gradIngresos)"
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
```

---

## 4. Donut Chart — distribución / participación

Uso: métodos de pago, categorías de producto, estado de boletas. Máx 5 segmentos.

```tsx
'use client'
import { Pie, PieChart, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'

const chartConfig = {
  efectivo:     { label: 'Efectivo',     color: 'var(--chart-1)' },
  tarjeta:      { label: 'Tarjeta',      color: 'var(--chart-2)' },
  transferencia:{ label: 'Transferencia',color: 'var(--chart-3)' },
}

export function MetodosPagoChart({ data }: { data: { metodo: string; monto: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <PieChart>
        <Pie
          data={data}
          dataKey="monto"
          nameKey="metodo"
          cx="50%"
          cy="50%"
          innerRadius={56}
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={`var(--chart-${i + 1})`} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  )
}
```

---

## 5. Sparkline — mini tendencia en KPI card

Uso: dentro de KPI cards del dashboard, sin ejes ni labels.

```tsx
'use client'
import { Line, LineChart, ResponsiveContainer } from 'recharts'

export function Sparkline({ data, color = 'var(--chart-1)' }: {
  data: { value: number }[]
  color?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Uso en KPI card:
// <Sparkline data={[{value:120},{value:145},{value:130},{value:180},{value:160}]} />
```

---

## 6. Radial / Progress — meta de ventas

Uso: % de meta mensual alcanzada, cumplimiento de cuota.

```tsx
'use client'
import { RadialBar, RadialBarChart, PolarAngleAxis } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'

const chartConfig = { progreso: { label: 'Meta', color: 'var(--chart-1)' } }

export function MetaVentasChart({ actual, meta }: { actual: number; meta: number }) {
  const porcentaje = Math.min(Math.round((actual / meta) * 100), 100)
  const data = [{ name: 'Meta', progreso: porcentaje }]

  return (
    <div className="relative flex flex-col items-center">
      <ChartContainer config={chartConfig} className="h-40 w-40">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={50}
          outerRadius={70}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="progreso" fill="var(--chart-1)" cornerRadius={8} background />
        </RadialBarChart>
      </ChartContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{porcentaje}%</span>
        <span className="text-xs text-muted-foreground">de meta</span>
      </div>
    </div>
  )
}
```

---

## Formateo de datos — moneda dual (PEN / USD)

```tsx
// lib/chart-utils.ts
type Currency = 'PEN' | 'USD'

export function formatCurrency(value: number, currency: Currency = 'PEN'): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(value)
  // PEN → S/ 1,234.56
  // USD → US$ 1,234.56
}

export function formatCurrencyShort(value: number, currency: Currency = 'PEN'): string {
  const symbol = currency === 'PEN' ? 'S/' : 'US$'
  if (value >= 1_000_000) return `${symbol} ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `${symbol} ${(value / 1_000).toFixed(0)}k`
  return `${symbol} ${value}`
  // PEN → S/ 12k   |  USD → US$ 12k
}
```

**Uso en charts:**

```tsx
// Prop currency en cada chart
export function VentasMensualesChart({
  data,
  currency = 'PEN',
}: {
  data: { mes: string; ventas: number }[]
  currency?: 'PEN' | 'USD'
}) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data}>
        <YAxis tickFormatter={(v) => formatCurrencyShort(v, currency)} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value), currency)}
            />
          }
        />
        {/* ... */}
      </BarChart>
    </ChartContainer>
  )
}

// Invocación
<VentasMensualesChart data={data} currency="PEN" />
<VentasMensualesChart data={data} currency="USD" />
```

**Selector de moneda para el dashboard:**

```tsx
'use client'
import { useState } from 'react'

type Currency = 'PEN' | 'USD'

export function CurrencyToggle({ value, onChange }: {
  value: Currency
  onChange: (c: Currency) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden text-sm">
      {(['PEN', 'USD'] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            'px-3 py-1 transition-colors',
            value === c
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted',
          )}
        >
          {c === 'PEN' ? 'S/' : 'US$'}
        </button>
      ))}
    </div>
  )
}

// Uso en dashboard:
const [currency, setCurrency] = useState<Currency>('PEN')
<CurrencyToggle value={currency} onChange={setCurrency} />
<VentasMensualesChart data={data} currency={currency} />
```

---

## Reglas Sistema para charts

| Situación | Regla |
|-----------|-------|
| Comparar categorías | Bar vertical |
| Ranking / top N | Bar horizontal |
| Tendencia en el tiempo | Line o Area |
| Distribución ≤5 partes | Donut |
| Mini tendencia en card | Sparkline |
| % de objetivo | Radial progress |
| >5 categorías en donut | Cambiar a bar horizontal |
| 100+ puntos de datos | Agregar por semana/mes, no renderizar todo |
| Datos en tiempo real (polling) | NO animar cada update — solo cambios por usuario |

---

## Responsive Charts

Sistema es principalmente desktop, pero debe ser usable en tablet (768px+) y tolerable en móvil.

### Altura por breakpoint

```tsx
// Nunca altura fija — siempre clases responsivas
<ChartContainer config={chartConfig} className="h-48 sm:h-64 lg:h-80 w-full">
```

| Chart | Móvil | Tablet | Desktop |
|-------|-------|--------|---------|
| Bar vertical | `h-48` | `h-64` | `h-80` |
| Area / Line | `h-40` | `h-56` | `h-64` |
| Bar horizontal | `h-64` | `h-72` | `h-80` |
| Donut | `h-48` | `h-56` | `h-56` |
| Sparkline | `h-10` | `h-10` | `h-10` |
| Radial | `h-36` | `h-40` | `h-40` |

### Grid de charts

```tsx
// 1 col móvil → 2 cols tablet → 2 cols desktop (charts anchos)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <VentasMensualesChart data={data} currency={currency} />
  <MetodosPagoChart data={pagos} currency={currency} />
</div>

// KPI cards + chart full width
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="lg:col-span-2">
    <IngresosAreaChart data={data} currency={currency} />
  </div>
  <MetaVentasChart actual={actual} meta={meta} />
</div>
```

### XAxis — evitar labels apilados en móvil

```tsx
import { useWindowSize } from '@/hooks/use-window-size' // o useMediaQuery

// Opción 1: interval automático (Recharts)
<XAxis
  dataKey="mes"
  interval="preserveStartEnd"   // muestra solo primero y último en pantallas chicas
  tick={{ fontSize: 11 }}
/>

// Opción 2: hook de breakpoint para control total
'use client'
import { useEffect, useState } from 'react'

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

// En el chart:
const isMobile = useIsMobile()
<XAxis
  dataKey="mes"
  interval={isMobile ? 'preserveStartEnd' : 0}
  tick={{ fontSize: isMobile ? 10 : 12 }}
  angle={isMobile ? -30 : 0}
  textAnchor={isMobile ? 'end' : 'middle'}
  height={isMobile ? 40 : 20}
/>
```

### YAxis — ocultar en móvil, mostrar en tablet+

```tsx
const isMobile = useIsMobile()

<YAxis
  hide={isMobile}                          // ocultar en móvil — tooltip igual muestra el valor
  tickLine={false}
  axisLine={false}
  tick={{ fontSize: 11 }}
  tickFormatter={(v) => formatCurrencyShort(v, currency)}
  width={isMobile ? 0 : 64}
/>
```

### Bar horizontal — adaptación móvil

En móvil, el eje Y (nombres de producto) se acorta. Truncar con `tickFormatter`:

```tsx
<YAxis
  type="category"
  dataKey="nombre"
  width={isMobile ? 80 : 120}
  tick={{ fontSize: isMobile ? 10 : 12 }}
  tickFormatter={(v) => isMobile && v.length > 10 ? `${v.slice(0, 10)}…` : v}
/>
```

### Donut — centrar label en todos los tamaños

```tsx
<PieChart>
  <Pie
    cx="50%"
    cy="50%"
    innerRadius={isMobile ? 40 : 56}
    outerRadius={isMobile ? 60 : 80}
    // ...
  />
</PieChart>
```

### Patrón completo — chart responsive con moneda

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatCurrency, formatCurrencyShort, type Currency } from '@/lib/chart-utils'

function useIsMobile(bp = 640) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    setM(mq.matches)
    const h = (e: MediaQueryListEvent) => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [bp])
  return m
}

const chartConfig = { ventas: { label: 'Ventas', color: 'var(--chart-1)' } }

export function VentasMensualesChart({
  data,
  currency = 'PEN',
}: {
  data: { mes: string; ventas: number }[]
  currency?: Currency
}) {
  const isMobile = useIsMobile()

  return (
    <ChartContainer config={chartConfig} className="h-48 sm:h-64 lg:h-80 w-full">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: isMobile ? 24 : 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="mes"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: isMobile ? 10 : 12 }}
          interval={isMobile ? 'preserveStartEnd' : 0}
          angle={isMobile ? -30 : 0}
          textAnchor={isMobile ? 'end' : 'middle'}
          height={isMobile ? 40 : 20}
        />
        <YAxis
          hide={isMobile}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => formatCurrencyShort(v, currency)}
          width={64}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value), currency)}
            />
          }
        />
        <Bar dataKey="ventas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
```

---

## Do Not

| ❌ | ✅ |
|----|----|
| `import { BarChart } from 'recharts'` directo sin `ChartContainer` | Siempre envolver en `ChartContainer config={chartConfig}` |
| Hex hardcodeado en `fill` | `var(--chart-1)` … `var(--chart-5)` |
| Pie chart con 6+ segmentos | Bar horizontal |
| Charts en Server Components | Extraer a `*Chart.tsx` con `'use client'` |
| `width` / `height` fijos en px en el chart | `className="h-48 sm:h-64 lg:h-80 w-full"` en `ChartContainer` |
| Animar re-renders de polling | `isAnimationActive={false}` en updates frecuentes |
| `interval={0}` en XAxis en móvil | `interval="preserveStartEnd"` para evitar labels apilados |
| YAxis visible en móvil con labels largos | `hide={isMobile}` — tooltip igual muestra el valor |
| Charts side-by-side en móvil | `grid-cols-1 md:grid-cols-2` |

---

## Quick Reference

```
Instalar             →  npx shadcn@latest add chart
Colores              →  var(--chart-1) … var(--chart-5)  (dark mode automático)
Bar vertical         →  ventas/período, comparativa vendedores
Bar horizontal       →  top productos, ranking
Line / Area          →  tendencia temporal, flujo de caja
Donut                →  métodos de pago, categorías (≤5 segmentos)
Sparkline            →  mini trend dentro de KPI card (sin ejes)
Radial progress      →  % de meta mensual
Currency utils       →  formatCurrency(v, 'PEN'|'USD') / formatCurrencyShort(v, currency) en lib/chart-utils.ts
Currency toggle      →  <CurrencyToggle value={currency} onChange={setCurrency} />
Prop currency        →  pasar currency='PEN'|'USD' a cada chart como prop
Responsive altura    →  className="h-48 sm:h-64 lg:h-80 w-full" en ChartContainer
Responsive hook      →  useIsMobile() → ocultar YAxis, simplificar XAxis interval/angle
Grid charts          →  grid-cols-1 md:grid-cols-2 gap-4
XAxis móvil          →  interval="preserveStartEnd" + angle=-30 + height=40
YAxis móvil          →  hide={isMobile} — tooltip sigue mostrando el valor
Client Component     →  SIEMPRE — charts nunca en Server Components
```
