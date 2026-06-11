# Errores y Edge Cases — UI Stack

---

## Errores de servidor mapeados a campos

```tsx
// Mapear errores del backend a campos con react-hook-form
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

type ApiFieldError = { field: string; message: string }
type ApiError = { message: string; errors?: ApiFieldError[] }

export function ProductoForm() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function handleSubmit(data: FormValues) {
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error: ApiError = await res.json()

        if (error.errors?.length) {
          // Mapear errores de campo del backend a react-hook-form
          error.errors.forEach(({ field, message }) => {
            form.setError(field as keyof FormValues, { type: 'server', message })
          })
        } else {
          toast.error(error.message ?? 'Error al guardar')
        }
        return
      }

      toast.success('Producto guardado correctamente')
      form.reset()
    } catch {
      toast.error('Error de conexión — intente de nuevo', {
        action: { label: 'Reintentar', onClick: () => form.handleSubmit(handleSubmit)() },
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        {/* Los errores de servidor aparecen igual que errores de zod */}
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage /> {/* Muestra error de validación O de servidor */}
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
```

---

## Detección de edición concurrente

```tsx
// components/common/ConcurrentEditGuard.tsx
// El backend devuelve version/updatedAt — detectar conflicto al guardar
'use client'
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type ConflictData = { serverVersion: string; localVersion: string }

export function useConcurrentEdit<T extends { version: string }>(entidad: T) {
  const [conflict, setConflict] = useState<ConflictData | null>(null)

  async function guardar(data: Partial<T>) {
    const res = await fetch(`/api/entidad/${entidad.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, version: entidad.version }),
    })

    if (res.status === 409) {
      // Conflicto detectado — otro usuario editó mientras tanto
      const { serverVersion } = await res.json()
      setConflict({ serverVersion, localVersion: entidad.version })
      return
    }

    if (!res.ok) throw new Error('Error al guardar')
    setConflict(null)
  }

  return { guardar, conflict, clearConflict: () => setConflict(null) }
}

// Banner de conflicto — mostrar cuando hay conflict !== null
export function ConflictBanner({
  conflict,
  onRecargar,
  onSobrescribir,
}: {
  conflict: ConflictData | null
  onRecargar: () => void
  onSobrescribir: () => void
}) {
  if (!conflict) return null

  return (
    <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950/30">
      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Conflicto de edición</span>
      </div>
      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
        Otro usuario modificó este registro mientras lo editabas.
      </p>
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onRecargar}>
          Recargar datos actuales
        </Button>
        <Button size="sm" variant="destructive" onClick={onSobrescribir}>
          Sobrescribir igual
        </Button>
      </div>
    </div>
  )
}
```

---

## Error Boundaries por módulo

```tsx
// components/common/ModuleErrorBoundary.tsx
'use client'
import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode; modulo: string }
type State = { hasError: boolean; errorMessage: string }

export class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Error en módulo "${this.props.modulo}":`, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-sm">Error en {this.props.modulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{this.state.errorMessage}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reintentar
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

// Uso por módulo:
// <ModuleErrorBoundary modulo="Ventas">
//   <VentasTable />
// </ModuleErrorBoundary>
//
// <ModuleErrorBoundary modulo="Catálogo">
//   <CatalogoGrid />
// </ModuleErrorBoundary>
```

---

## Indicador de conexión perdida

```tsx
// components/common/OfflineIndicator.tsx
'use client'
import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 3000)
    }
    function handleOffline() { setIsOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {(!isOnline || showReconnected) && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
            isOnline
              ? 'bg-green-600 text-white'
              : 'bg-destructive text-destructive-foreground'
          }`}
        >
          {isOnline
            ? <><Wifi className="h-4 w-4" /> Conexión restaurada</>
            : <><WifiOff className="h-4 w-4" /> Sin conexión — los cambios no se guardarán</>
          }
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

---

## Estados de error en tablas y KPIs

```tsx
// components/common/TableError.tsx
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TableError({
  mensaje = 'No se pudo cargar la información',
  onRetry,
}: {
  mensaje?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <div>
        <p className="text-sm font-medium">Error al cargar datos</p>
        <p className="text-xs text-muted-foreground mt-0.5">{mensaje}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Reintentar
        </Button>
      )}
    </div>
  )
}

// KpiError — para cards de métricas
export function KpiError({ label }: { label: string }) {
  return (
    <div className="rounded-lg border p-4 bg-card dark:bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1 mt-1 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Error</span>
      </div>
    </div>
  )
}
```

---

## Toast de error con acción de reintentar

```tsx
// Patrón de toast con acción de reintentar y copia de mensaje
import { toast } from 'sonner'
import { ClipboardCopy } from 'lucide-react'

export function showErrorToast(mensaje: string, onRetry?: () => void) {
  toast.error(mensaje, {
    duration: 6000,
    action: onRetry
      ? { label: 'Reintentar', onClick: onRetry }
      : {
          label: 'Copiar error',
          onClick: () => navigator.clipboard.writeText(mensaje),
        },
  })
}

// Uso:
// showErrorToast('Error 500: No se pudo procesar la venta', () => handleSubmit(data))
```

---

## Formulario con reset al cambiar registro

```tsx
// Problema: react-hook-form no reseta automáticamente al cambiar la entidad editada
'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

export function EditForm({ cliente }: { cliente: Cliente }) {
  const form = useForm<ClienteValues>({ defaultValues: cliente })

  // Resetear formulario cuando cambia el cliente seleccionado
  useEffect(() => {
    form.reset(cliente)
  }, [cliente.id, form]) // depender de id, no del objeto completo

  // ...
}
```

---

## Do Not

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| `console.error` como único manejo de error | Error Boundary por módulo + toast al usuario |
| `import { motion } from 'framer-motion'` | `import { motion } from 'motion/react'` |
| Error boundary global único | `ModuleErrorBoundary` por sección (ventas, catálogo, clientes) |
| Mostrar stack trace al usuario | Mensaje amigable + acción (reintentar / copiar) |
| Ignorar errores 409 del servidor | `ConflictBanner` con opciones claras para el usuario |
| Validar solo en frontend | Mapear errores del backend a campos del formulario |

---

## Quick Reference

```
Errores servidor→  form.setError(field, { type: 'server', message }) por cada error del backend
Concurrencia    →  useConcurrentEdit — detectar 409, mostrar ConflictBanner
Error Boundary  →  ModuleErrorBoundary.tsx — por módulo (ventas, catálogo, clientes)
Offline         →  OfflineIndicator.tsx — banner bottom-center con AnimatePresence
Toast + reintentar→ showErrorToast(msg, onRetry) — duración 6s, acción de reintentar
Error en tabla  →  TableError.tsx — icono + mensaje + botón reintentar
Error en KPI    →  KpiError.tsx — card con estado de error
Form reset      →  useEffect(() => form.reset(data), [data.id]) — al cambiar entidad
```
