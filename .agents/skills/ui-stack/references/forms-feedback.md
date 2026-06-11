# Forms & Feedback — UI Stack

---

## Formularios — react-hook-form + zod

`react-hook-form`, `zod` y el componente `Form` de shadcn **NO están instalados**. Instalar antes de usar:

```bash
npm i react-hook-form zod @hookform/resolvers
npx shadcn@latest add form input label select textarea
```

---

## Patrón estándar de formulario

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { toast } from 'sonner'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  monto: z.coerce.number().positive('Debe ser positivo').multipleOf(0.01),
})

type FormValues = z.infer<typeof schema>

export function NuevaVentaForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', monto: 0 },
  })

  async function handleSubmit(data: FormValues) {
    try {
      await saveVenta(data)
      toast.success('Venta registrada correctamente')
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast.error('Error al guardar — intente de nuevo')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del cliente</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="monto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto (S/)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" {...field} />
              </FormControl>
              <FormDescription>Ingresa el monto en soles peruanos</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando…' : 'Guardar venta'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

---

## Schemas Zod para campos comunes del peruano

```ts
import { z } from 'zod'

// Cliente
const clienteSchema = z.object({
  dni: z.string()
    .length(8, 'DNI debe tener exactamente 8 dígitos')
    .regex(/^\d{8}$/, 'DNI solo puede contener números'),
  ruc: z.string()
    .length(11, 'RUC debe tener 11 dígitos')
    .regex(/^\d{11}$/, 'RUC solo puede contener números')
    .optional(),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  apellido: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string()
    .regex(/^9\d{8}$/, 'Teléfono móvil peruano debe empezar con 9 y tener 9 dígitos')
    .optional()
    .or(z.literal('')),
  direccion: z.string().max(200).optional(),
})

// Venta
const ventaSchema = z.object({
  clienteId: z.string().uuid('ID de cliente inválido'),
  vendedorId: z.string().uuid('ID de vendedor inválido'),
  items: z.array(z.object({
    productoId: z.string().uuid(),
    cantidad: z.coerce.number().int().positive('Cantidad debe ser mayor a 0'),
    precioUnitario: z.coerce.number().positive().multipleOf(0.01),
  })).min(1, 'La venta debe tener al menos un producto'),
  descuento: z.coerce.number().min(0).max(100).default(0), // porcentaje 0-100
  metodoPago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin']),
  fecha: z.coerce.date().default(new Date),
})

// Producto / Catálogo
const productoSchema = z.object({
  nombre: z.string().min(2).max(200),
  sku: z.string().min(3).max(50).regex(/^[A-Z0-9-]+$/, 'SKU: solo mayúsculas, números y guiones'),
  precio: z.coerce.number().positive().multipleOf(0.01),
  stock: z.coerce.number().int().min(0, 'Stock no puede ser negativo'),
  categoriaId: z.string().uuid(),
  descripcion: z.string().max(500).optional(),
})

// Pago
const pagoSchema = z.object({
  ventaId: z.string().uuid(),
  monto: z.coerce.number().positive().multipleOf(0.01),
  metodo: z.enum(['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin']),
  comprobante: z.string().max(100).optional(), // número de boleta/factura
})
```

---

## Select con shadcn

```tsx
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

<FormField
  control={form.control}
  name="metodoPago"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Método de pago</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar método" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="efectivo">Efectivo</SelectItem>
          <SelectItem value="tarjeta">Tarjeta</SelectItem>
          <SelectItem value="transferencia">Transferencia</SelectItem>
          <SelectItem value="yape">Yape</SelectItem>
          <SelectItem value="plin">Plin</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Form + Shake en error (motion/react)

```tsx
'use client'
import { useAnimate } from 'motion/react'
import { useRef } from 'react'

export function FormWithShake() {
  const [formScope, animateForm] = useAnimate()
  const form = useForm({ ... })

  async function handleSubmit(data: FormValues) {
    try {
      await saveData(data)
    } catch {
      // Shake del form completo en error de servidor
      animateForm(formScope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.4 })
    }
  }

  // Shake al submit con errores de validación
  async function onInvalid() {
    animateForm(formScope.current, { x: [0, -5, 5, -3, 3, 0] }, { duration: 0.35 })
  }

  return (
    <Form {...form}>
      <form
        ref={formScope}
        onSubmit={form.handleSubmit(handleSubmit, onInvalid)}
      >
        {/* campos */}
      </form>
    </Form>
  )
}
```

---

## Toast / Notificaciones — Sonner

`sonner` **NO está instalado**. Instalar cuando se necesite:

```bash
npm i sonner
npx shadcn@latest add sonner
```

### Setup en layout (una sola vez)

```tsx
// app/layout.tsx — agregar Toaster dentro del ThemeProvider
import { Toaster } from '@/components/ui/sonner'

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
  <Toaster richColors position="bottom-right" />
</ThemeProvider>
```

### API de sonner

```tsx
'use client'
import { toast } from 'sonner'

// Tipos básicos
toast.success('Venta registrada correctamente')
toast.error('Error al guardar — intente de nuevo')
toast.info('Procesando pago…')
toast.warning('Stock bajo para este producto')

// Con descripción
toast.success('Venta registrada', {
  description: `Boleta #${numeroVenta} generada correctamente`,
})

// Promise — maneja loading/success/error automáticamente
toast.promise(
  saveVenta(data),
  {
    loading: 'Guardando venta…',
    success: (result) => `Venta #${result.id} registrada`,
    error: 'Error al guardar la venta',
  }
)

// Con acción de deshacer
toast.success('Cliente eliminado', {
  action: {
    label: 'Deshacer',
    onClick: () => restoreCliente(clienteId),
  },
})

// Descartar manualmente
const id = toast.loading('Procesando…')
// después:
toast.dismiss(id)
toast.success('Completado')
```

### Convenciones del proyecto

| Regla | Valor |
|---|---|
| Posición | `bottom-right` |
| Colores | `richColors` (semántico con el sistema de diseño) |
| Duración | Default sonner (4s) — no modificar |
| Operaciones CRUD | `toast.promise()` — evita estado de loading manual |
| Acciones destructivas | Incluir acción de deshacer con `toast.success(..., { action })` |

---

## Formulario con estado de carga sin react-hook-form

Para casos simples (formularios de login, filtros rápidos):

```tsx
'use client'
import { useState } from 'react'
import { toast } from 'sonner'

export function LoginForm() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    try {
      await login({ email: fd.get('email') as string, password: fd.get('password') as string })
    } catch {
      toast.error('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="email" type="email" required className="..." />
      <input name="password" type="password" required className="..." />
      <Button type="submit" disabled={loading}>
        {loading ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </form>
  )
}
```

---

## Responsive en Formularios

### Grid de campos — stack en móvil, 2 columnas en desktop

```tsx
<form className="space-y-4">
  {/* 2 columnas en sm+, 1 en móvil */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="space-y-1">
      <label className="text-sm font-medium">Nombre</label>
      <input className="w-full h-10 rounded-md border px-3 text-sm" />
    </div>
    <div className="space-y-1">
      <label className="text-sm font-medium">Apellido</label>
      <input className="w-full h-10 rounded-md border px-3 text-sm" />
    </div>
  </div>

  {/* Campo full-width siempre */}
  <div className="space-y-1">
    <label className="text-sm font-medium">Correo</label>
    <input type="email" className="w-full h-10 rounded-md border px-3 text-sm" />
  </div>

  {/* 3 columnas en md+, 1 en móvil */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="space-y-1">
      <label className="text-sm font-medium">Precio</label>
      <input type="number" className="w-full h-10 rounded-md border px-3 text-sm" />
    </div>
    <div className="space-y-1">
      <label className="text-sm font-medium">Cantidad</label>
      <input type="number" className="w-full h-10 rounded-md border px-3 text-sm" />
    </div>
    <div className="space-y-1">
      <label className="text-sm font-medium">Descuento %</label>
      <input type="number" className="w-full h-10 rounded-md border px-3 text-sm" />
    </div>
  </div>

  {/* Acciones: full-width en móvil, alineadas a la derecha en desktop */}
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
    <Button variant="outline" type="button" className="w-full sm:w-auto">Cancelar</Button>
    <Button type="submit" className="w-full sm:w-auto">Guardar</Button>
  </div>
</form>
```

### Inputs touch-friendly

```tsx
{/* Altura mínima 44px para touch — usar h-11 en móvil */}
<input className="w-full h-11 sm:h-10 rounded-md border px-3 text-sm" />
<select className="w-full h-11 sm:h-10 rounded-md border px-3 text-sm" />

{/* Textarea responsive */}
<textarea className="w-full min-h-[100px] sm:min-h-[80px] rounded-md border px-3 py-2 text-sm resize-none" />
```

### Formulario en modal — responsive

```tsx
{/* Dentro del modal (full-screen en móvil, centrado en tablet+) */}
<div className="space-y-4">
  <h2 className="text-base font-semibold md:text-lg">Nueva venta</h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {/* campos */}
  </div>

  {/* Sticky footer en móvil */}
  <div className="sticky bottom-0 pt-4 pb-2 bg-card border-t -mx-6 px-6 sm:static sm:border-0 sm:pt-2 sm:pb-0 sm:mx-0 sm:px-0">
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
      <Button className="w-full sm:w-auto">Guardar</Button>
    </div>
  </div>
</div>
```

### Reglas responsive para formularios

| Situación | Clase |
|-----------|-------|
| Inputs en móvil | `h-11` (44px mínimo touch) |
| Inputs en desktop | `h-10` → `sm:h-10` |
| 1 campo ancho | `col-span-1 sm:col-span-2` |
| Botón primario móvil | `w-full sm:w-auto` |
| Labels | `text-sm` siempre |
| Error text | `text-xs` siempre, debajo del campo |
