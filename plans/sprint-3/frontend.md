# Sprint 3 — Frontend

**Stack:** Next.js 14 · Tailwind CSS · Lucide React  
**Entregables:** Panel de abastecedor — gestión de inventario, catálogo y compras

---

## Páginas

| Ruta                            | Descripción                           |
|---------------------------------|---------------------------------------|
| `/dashboard/abastecedor`        | Overview de stock + alertas críticas  |
| `/dashboard/abastecedor/items`  | Catálogo completo + crear/editar ítems|
| `/dashboard/abastecedor/stock`  | Stock actual + ítems críticos         |
| `/dashboard/abastecedor/compras`| Historial de compras + nueva compra   |
| `/dashboard/abastecedor/proveedores` | Directorio de proveedores        |

---

## Vista General — `/dashboard/abastecedor`

### Layout
```
┌────────────────────────────────────────────┐
│   Abastecedor · Sede: [nombre]             │
├──────────────┬─────────────────────────────┤
│   Sidebar    │  Resumen de Inventario      │
│              │  ─────────────────────────  │
│  · Overview  │  [Alerta] X ítems críticos  │
│  · Catálogo  │                             │
│  · Stock     │  ┌──────┐ ┌──────┐ ┌─────┐│
│  · Compras   │  │Total │ │Bajo  │ │Valor││
│  · Proveedores│  │ítems │ │stock │ │inv. ││
│              │  └──────┘ └──────┘ └─────┘│
│              │                             │
│              │  Tabla: Ítems críticos      │
│              │  [Nombre|Stock|Mínimo|Dif.] │
└──────────────┴─────────────────────────────┘
```

### Componentes
- Cards con métricas de inventario (`NumberTicker` animado)
- Tabla de ítems bajo stock mínimo (con badge rojo)
- Botón rápido "Crear compra de reposición"

---

## Catálogo — `/dashboard/abastecedor/items`

### Layout
```
[+ Nuevo Ítem]    [Buscador]    [Filtros: tipo | marca | categoría]

Tabla:
  SKU | Nombre | Tipo | Stock | Precio Compra | Precio Venta | [Editar]

Paginación: < 1 2 3 ... >
```

### Modal — Crear/Editar Ítem
```
Nombre: [_____________]     SKU: [_______]
Tipo:   [Producto ▼]        Categoría: [___▼]
Marca:  [___________▼]

Precio compra: [_____]      Precio venta: [______]
Stock mínimo: [____]        Stock inicial: [____]  ← solo en creación

Descripción: [________________________]

[Cancelar]          [Guardar]
```

### Integración
```typescript
// POST /items
await fetcher('/items', { method: 'POST', body: createItemDto }, token);

// GET /items?tipo=producto&page=1&limit=20
const { data, total } = await fetcher('/items?tipo=producto', token);
```

---

## Stock — `/dashboard/abastecedor/stock`

### Layout
```
[Tabs: Todo | Crítico]

Filtros: [tipo ▼] [marca ▼] [Solo reposición: ☑]

Tabla:
  Ítem | Tipo | Stock actual | Stock mín. | Estado | Precio compra

Estado badges:
  🟢 OK — sobre mínimo
  🟡 Bajo — dentro del 20% del mínimo
  🔴 Crítico — igual o bajo el mínimo
```

### Ajuste Directo de Stock (modal)
```
Ítem: [nombre del ítem]
Cantidad: [±___]   Motivo: [ajuste_inventario ▼]
Observación: [___________________]
[Confirmar ajuste]
```

---

## Compras — `/dashboard/abastecedor/compras`

### Layout
```
[+ Nueva Compra]                    [Filtros: proveedor | fecha]

Tabla historial:
  #Orden | Proveedor | Fecha | N° ítems | Total | [Ver detalle]
```

### Formulario — Nueva Compra (página separada o drawer)
```
Proveedor: [Seleccionar ▼]

Ítems de la compra:
  ┌──────────────────────────────────────────┐
  │ Ítem    | Cant. | Costo unit. | P.venta  │
  │ [___▼]  | [__]  | [_______]   | [______] │
  │ [+ Agregar ítem]                         │
  └──────────────────────────────────────────┘

Total estimado: S/. XXXX.XX

[Cancelar]          [Registrar compra]
```

### Integración
```typescript
// POST /compras
await fetcher('/compras', {
  method: 'POST',
  body: { id_proveedor, items: [...] },
}, token);
```

---

## Proveedores — `/dashboard/abastecedor/proveedores`

### Layout
```
Buscador: [_______________]

Cards de proveedores:
  ┌─────────────────────────┐
  │ [Logo/icono]            │
  │ Nombre proveedor        │
  │ Total órdenes: XX       │
  │ Última compra: DD/MM/YY │
  │ Total comprado: S/. XXX │
  └─────────────────────────┘
```

---

## Archivos a Crear

```
app/dashboard/abastecedor/
  page.tsx                    — overview
  items/page.tsx
  stock/page.tsx
  compras/
    page.tsx
    nueva/page.tsx
  proveedores/page.tsx

components/abastecedor/
  StockOverview.tsx           — cards métricas + tabla críticos
  ItemsTable.tsx              — catálogo con paginación
  ItemModal.tsx               — form crear/editar ítem
  StockAjusteModal.tsx        — ajuste directo de stock
  ComprasTable.tsx
  NuevaCompraForm.tsx
  ProveedoresGrid.tsx
  StockBadge.tsx              — badge OK/Bajo/Crítico
```

---

## Manejo de errores de concurrencia (HU-25)

`NuevaCompraForm.tsx` debe distinguir entre error de negocio y deadlock:

```typescript
// NuevaCompraForm.tsx — onSubmit
try {
  const res = await apiFetch(`${API_URL}/compras`, { method: 'POST', body: ... });

  if (!res.ok) {
    const err = await res.json();

    if (res.status === 409 && err.retry) {
      // Deadlock detectado: mostrar toast de reintento
      toast.warning('Conflicto al registrar la compra. Intente de nuevo en unos segundos.');
      return;
    }
    if (res.status === 409) {
      // Error de negocio (stock insuficiente, etc.)
      toast.error(err.message ?? 'Error al registrar la compra');
      return;
    }
    toast.error('Error inesperado');
  }
} catch {
  toast.error('Sin conexión al servidor');
}
```

> El mismo patrón aplica en `VentasForm.tsx` (Sprint 1) y `ReparacionForm.tsx` (Sprint 4) para sus respectivos 409 con `{ retry: true }`.
