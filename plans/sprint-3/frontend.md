# Sprint 3 — Frontend

> **Nota de esquema (refactor multi-categoría):** El campo `categoria` en las respuestas de items/catálogo es ahora un string con formato CSV producido por `STRING_AGG` desde la tabla `Item_Categorias`. El nombre del campo no cambia, pero su fuente es multi-categoría: un producto puede pertenecer a N categorías. No hay campo tipo array — sigue siendo un string plano (`"Accesorios, Audio"`). Aplica a cualquier vista o componente que consuma el catálogo (p.ej. filtros por categoría deben separar por coma si se necesita comparación individual).

**Stack:** Next.js 14 · Tailwind CSS · Lucide React  
**Entregables:** Panel del técnico — cola de reparaciones, gestión de estados, repuestos y adelantos

---

## Páginas

| Ruta                                  | Descripción                            |
|---------------------------------------|----------------------------------------|
| `/dashboard/tecnico`                  | Cola activa de reparaciones            |
| `/dashboard/tecnico/reparaciones/:id` | Detalle de una reparación              |
| `/dashboard/tecnico/historial`        | Reparaciones completadas               |
| `/dashboard/tecnico/repuestos`        | Consulta de repuestos disponibles      |

---

## Cola Activa — `/dashboard/tecnico`

### Layout
```
┌────────────────────────────────────────────┐
│   Técnico · Sede: [nombre]                 │
├──────────────┬─────────────────────────────┤
│   Sidebar    │  Cola de Reparaciones       │
│              │  ─────────────────────────  │
│  · Cola      │  [+ Registrar ingreso]      │
│  · Historial │                             │
│  · Repuestos │  Filtros: [estado ▼] [fecha]│
│              │                             │
│              │  Tarjetas de reparación:    │
│              │  ┌─────────────────────┐    │
│              │  │ #001 · Juan Pérez   │    │
│              │  │ iPhone 13 · IMEI... │    │
│              │  │ Estado: Diagnóstico │    │
│              │  │ Ingresó: 29/05/2026 │    │
│              │  │ [Ver detalle →]     │    │
│              │  └─────────────────────┘    │
└──────────────┴─────────────────────────────┘
```

### Tarjeta de Reparación
- Badge de estado con color por etapa:
  - 🔵 Recibido
  - 🟡 Diagnóstico
  - 🟠 En reparación
  - 🟢 Listo para entrega
  - ⚫ Entregado (historial)
- Tiempo transcurrido desde ingreso
- Nombre del cliente
- Modelo del equipo

---

## Detalle de Reparación — `/dashboard/tecnico/reparaciones/:id`

### Layout
```
┌────────────────────────────────────────────────┐
│  [← Volver]  Reparación #001 · [Estado badge] │
├─────────────────────┬──────────────────────────┤
│   Info del equipo   │   Flujo de estados       │
│   ─────────────────  │   ──────────────────────  │
│   Cliente: Juan P.  │   ○ Recibido ✓           │
│   Equipo: iPhone 13 │   ○ Diagnóstico ✓        │
│   IMEI: 356...      │   ● En reparación ←      │
│   Estado encendido  │   ○ Listo para entrega   │
│   Ingreso: 29/05    │   ○ Entregado            │
│                     │                          │
│                     │   [Avanzar estado →]     │
├─────────────────────┴──────────────────────────┤
│  Diagnóstico técnico                           │
│  [Textarea + Guardar]                          │
├────────────────────────────────────────────────┤
│  Repuestos utilizados                          │
│  [+ Agregar repuesto]                          │
│  Nombre | Cantidad | Precio | [Quitar]         │
├────────────────────────────────────────────────┤
│  Cotización                                    │
│  Monto cotizado: [_____]  Descuento: [_____]  │
│  [Guardar cotización]                          │
├────────────────────────────────────────────────┤
│  Adelantos de pago                             │
│  [+ Registrar adelanto]                        │
│  Método | Monto | Fecha | Referencia           │
│  Total adelantado: S/. XXX.XX                  │
├────────────────────────────────────────────────┤
│  [Marcar como entregado]                       │
└────────────────────────────────────────────────┘
```

### Modal — Registrar Ingreso
```
Cliente: [Buscar o crear ▼]
Marca: [_______]    Modelo: [_______]
IMEI: [_______________]  (15 dígitos, opcional)
¿Está encendido? [Sí / No]

Checklist de estado:
  [ ] Pantalla   [ ] Batería   [ ] Puertos
  [ ] Cámara     [ ] Botones   [ ] Carcasa

Estado inicial: [Recibido ▼]

[Cancelar]  [Registrar ingreso]
```

### Modal — Agregar Repuesto
```
Repuesto: [Buscar repuesto ▼]
Stock disponible: XX unidades

Cantidad: [___]
Precio cobrado: S/. [_____]

[Cancelar]  [Agregar]
```

### Modal — Adelanto de Pago
```
Método: [Efectivo ▼]
Monto:  S/. [_______]
Referencia: [_____________]  (opcional)

[Cancelar]  [Registrar adelanto]
```

---

## Historial — `/dashboard/tecnico/historial`

### Layout
```
Filtros: [fecha desde ─ hasta] [cliente ▼]

Tabla:
  # | Cliente | Equipo | Ingreso | Entrega | Total | [Ver]
```

---

## Repuestos — `/dashboard/tecnico/repuestos`

### Layout
```
Buscar: [_____________]  Filtros: [marca ▼] [modelo ▼]

Grid de repuestos:
  ┌──────────────────────┐
  │ [Icono]              │
  │ Nombre repuesto      │
  │ Marca · Modelo       │
  │ Stock: XX unidades   │
  └──────────────────────┘
```

---

## Archivos a Crear

```
app/dashboard/tecnico/
  page.tsx                          — cola activa
  historial/page.tsx
  repuestos/page.tsx
  reparaciones/
    [id]/page.tsx                   — detalle

components/tecnico/
  ReparacionCard.tsx                — tarjeta en la cola
  EstadoBadge.tsx                   — badge coloreado por estado
  EstadoStepper.tsx                 — visualización del flujo de estados
  RegistrarIngresoModal.tsx
  AgregarRepuestoModal.tsx
  AdelantosPagoModal.tsx
  CotizacionForm.tsx
  DiagnosticoForm.tsx
  RepuestosGrid.tsx
  HistorialTable.tsx
```
