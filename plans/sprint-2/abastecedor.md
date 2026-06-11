# Sprint 2 — Backend · Rol Abastecedor

**Stack:** NestJS · TypeORM · PostgreSQL · class-validator · JWT · Swagger  
**Story Points:** 16  
**Épicas:** Inventario · Rendimiento  
**Dependencia:** Auth de Sprint 1

---

## Historias de Usuario

| HU    | Historia                          | Épica      | Módulo   | SP | Prioridad |
|-------|-----------------------------------|------------|----------|----|-----------|
| HU-11 | Registrar nuevo ítem en catálogo  | Inventario | Items    | 5  | Alta      |
| HU-12 | Actualizar stock de ítem existente| Inventario | Items    | 3  | Alta      |
| HU-13 | Consultar catálogo de productos   | Inventario | Items    | 3  | Media     |
| HU-14 | Consultar repuestos disponibles   | Inventario  | Items   | 2  | Media     |
| HU-25 | Deadlock handling en compras      | Inventario  | Compras | 1  | Alta      |
| HU-27 | N+1 queries: QueryBuilder         | Rendimiento | Items   | 3  | Media     |

---

## Contexto del Rol

El Abastecedor opera dentro de **una sola sede** (extraída del JWT).
- **Sí ve** `precio_compra_actual` (a diferencia de Vendedor y Técnico).
- Lee datos a través de vistas `v_abastecedor_*`.
- Escribe en: `Items`, `Compras_Refill`, `Detalle_Compra_Refill`.
- Los triggers manejan stock automáticamente:
  - `trg_det_compra_insert` → incrementa stock al agregar ítems a compra.
  - `trg_det_compra_update` → ajusta stock al modificar cantidad.
  - `trg_det_compra_delete` → revierte stock al eliminar ítem de compra.
  - `trg_actualizar_precios_item` → actualiza `precio_compra_actual` y `precio_venta_actual` en `Items`.

---

## Estructura de Módulos

```
src/
  auth/           ← compartido (Sprint 1)
  items/
  stock/
  proveedores/
  compras/
  common/
    guards/
    filters/
    dto/
    decorators/
```

---

## Orden de Implementación

| Prioridad | Módulo      | HU cubierta           | Dependencias      |
|-----------|-------------|-----------------------|-------------------|
| 1         | Auth        | —                     | Sprint 1          |
| 2         | Items       | HU-11, HU-12, HU-13, HU-14 | Auth         |
| 3         | Stock       | HU-12 (vista crítico) | Auth, Items       |
| 4         | Proveedores | —                     | Auth              |
| 5         | Compras     | HU-12 (via compra)    | Auth, Proveedores |

---

## Módulo 1 — Items / Catálogo
**HU:** HU-11 · HU-12 · HU-13 · HU-14

### Endpoints
| Método | Ruta                    | Descripción                                   |
|--------|-------------------------|-----------------------------------------------|
| POST   | /items                  | Registrar nuevo ítem en catálogo (HU-11)      |
| GET    | /items                  | Consultar catálogo de productos (HU-13)       |
| GET    | /items/:id              | Detalle de un ítem                            |
| PATCH  | /items/:id              | Actualizar datos del ítem                     |
| PATCH  | /items/:id/stock        | Ajuste directo de stock (HU-12)               |

### Filtros en GET /items
```
?tipo=producto|repuesto          ← HU-14: repuestos disponibles
?marca=<id>
?nombre=<texto>
?sku=<texto>
?categoria=<id>
?con_stock=true
?page=1&limit=20
```

### DTO — Crear Ítem
```typescript
class CreateItemDto {
  nombre: string;
  sku: string;
  tipo: 'producto' | 'repuesto';
  id_categoria: number;
  id_marca: number;
  descripcion?: string;
  precio_compra_actual: number;   // >= 0
  precio_venta_actual: number;    // >= precio_compra_actual
  stock_minimo: number;           // >= 0, default 0
  cantidad_inicial?: number;      // stock inicial al crear, default 0
}
```

### DTO — Actualizar Ítem
```typescript
class UpdateItemDto {
  nombre?: string;
  descripcion?: string;
  precio_compra_actual?: number;
  precio_venta_actual?: number;
  stock_minimo?: number;
}
```

### DTO — Ajuste de Stock
```typescript
class AjusteStockDto {
  cantidad: number;          // puede ser positivo (entrada) o negativo (salida)
  motivo: string;            // 'ajuste_inventario' | 'merma' | 'devolucion' | 'otro'
  observacion?: string;
}
```

### Reglas de negocio
1. `id_sede` extraído del JWT — el item se registra para esa sede.
2. `precio_venta_actual >= precio_compra_actual` (margen no negativo).
3. Ajuste de stock negativo → validar que `cantidad_actual + cantidad >= 0`.
4. HU-14: `GET /items?tipo=repuesto` filtra solo repuestos con stock > 0.

### Vista usada
- `v_abastecedor_stock_actual` → filtrar por `id_sede = :sede_del_jwt`

---

## Módulo 2 — Stock
**HU:** HU-12 (vista crítico)

### Endpoints
| Método | Ruta           | Descripción                                    |
|--------|----------------|------------------------------------------------|
| GET    | /stock         | Stock actual de la sede (con precio de compra) |
| GET    | /stock/critico | Ítems bajo stock mínimo, ordenados por urgencia|

### Filtros en GET /stock
```
?tipo=producto|repuesto
?marca=<id>
?requiere_reposicion=true
?page=1&limit=20
```

### Vistas usadas
- `v_abastecedor_stock_actual` → filtrar por `id_sede = :sede_del_jwt`
- `v_abastecedor_stock_critico` → filtrar por `id_sede = :sede_del_jwt`

### Notas
- Respuesta incluye `precio_compra_actual` y `requiere_reposicion`.
- `v_abastecedor_stock_critico` ya viene ordenada por `unidades_faltantes DESC`.

---

## Módulo 3 — Proveedores

Lectura únicamente. El abastecedor no crea ni edita proveedores.

### Endpoints
| Método | Ruta             | Descripción                            |
|--------|------------------|----------------------------------------|
| GET    | /proveedores     | Directorio con métricas de compra      |
| GET    | /proveedores/:id | Detalle de un proveedor                |

### Vista usada
- `v_abastecedor_proveedores` — incluye `total_ordenes`, `ultima_compra`, `total_comprado`.

---

## Módulo 4 — Compras
**HU:** HU-12 (incremento de stock via compra)

### Flujo de creación (una transacción)
```
POST /compras
  └─ INSERT Compras_Refill           (cabecera)
  └─ INSERT Detalle_Compra_Refill[]  (triggers incrementan stock y actualizan precios)
```

### Endpoints
| Método | Ruta                       | Descripción                              |
|--------|----------------------------|------------------------------------------|
| POST   | /compras                   | Crear orden de compra + detalles         |
| GET    | /compras                   | Historial de compras de la sede          |
| GET    | /compras/:id               | Detalle de una orden de compra           |
| PATCH  | /compras/:id/items/:itemId | Modificar cantidad de ítem en la orden   |
| DELETE | /compras/:id/items/:itemId | Eliminar ítem de la orden (revierte stock)|

### DTO — Crear Compra
```typescript
class CreateCompraDto {
  id_proveedor: number;
  items: CreateDetalleCompraDto[];  // mínimo 1
}

class CreateDetalleCompraDto {
  id_item: number;
  cantidad_comprada: number;          // > 0
  costo_unidad: number;              // >= 0
  precio_venta_sugerido: number;     // >= costo_unidad
}
```

### DTO — Modificar Ítem en Compra
```typescript
class UpdateDetalleCompraDto {
  cantidad_comprada: number;   // > 0
}
```

### Reglas de negocio
1. `id_empleado_refiller` y `id_sede_destino` se extraen del JWT.
2. `precio_venta_sugerido >= costo_unidad` (margen no negativo).
3. Trigger lanza `No se puede reducir la cantidad comprada...` → `409 ConflictException`.

### Vista usada
- `v_abastecedor_historial_compras` → filtrar por `id_sede = :sede_del_jwt`

### Filtros en GET /compras
```
?fecha_desde=YYYY-MM-DD
?fecha_hasta=YYYY-MM-DD
?id_proveedor=<id>
?page=1&limit=20
```

### Manejo de errores del trigger (HU-25 incluido)

```typescript
// HU-25: ordenar items por id_item ASC antes de insertar para evitar deadlocks
const itemsOrdenados = [...dto.items].sort((a, b) => a.id_item - b.id_item);

try {
  await this.dataSource.transaction(async (manager) => {
    const compra = await manager.save(CompraRefill, cabecera);
    for (const item of itemsOrdenados) {
      await manager.save(DetalleCompraRefill, { ...item, id_compra: compra.id_compra });
    }
  });
} catch (err: unknown) {
  const error = err as { message?: string; code?: string };

  if (error.message?.includes('No se puede reducir la cantidad comprada')) {
    throw new ConflictException(error.message);
  }
  // HU-25: capturar deadlock de PostgreSQL (código 40P01)
  if (error.code === '40P01') {
    throw new ConflictException({ message: 'Operación en conflicto, intente de nuevo', retry: true });
  }
  throw err;
}
```

---

## Reglas de rendimiento — QueryBuilder (HU-27)

Toda query que cargue relaciones 1:N usa `QueryBuilder` o vista SQL. Prohibido `.find({ relations: [...] })` en bucle.

### Items con relaciones
```typescript
// ItemsService.findAll() — una sola query con JOIN
const items = await this.dataSource
  .createQueryBuilder('item', 'i')
  .leftJoin('i.categoria', 'cat')
  .leftJoin('i.marca', 'mar')
  .leftJoin('i.inventarios', 'inv', 'inv.id_sede = :sedeId', { sedeId: user.id_sede })
  .addSelect(['cat.nombre', 'mar.nombre', 'inv.cantidad_actual'])
  .where('inv.id_sede = :sedeId', { sedeId: user.id_sede })
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();
// Resultado: 2 queries máximo (datos + count), nunca N+20
```

### Compras con detalles
```typescript
// ComprasService.findAll() — una sola query con JOIN
const compras = await this.dataSource
  .createQueryBuilder('compra', 'c')
  .leftJoinAndSelect('c.detalles', 'det')
  .leftJoin('det.item', 'i')
  .addSelect(['i.nombre', 'i.sku'])
  .where('c.id_sede_destino = :sedeId', { sedeId: user.id_sede })
  .orderBy('c.fecha_compra', 'DESC')
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();
```

**Criterio de aceptación:** `GET /items?page=1&limit=20` genera máximo 2 queries SQL.

---

## Guards y Decoradores

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')

@Decorator('CurrentUser') → { id_empleado, id_sede, roles }
```

---

## Estructura de Módulo — Compras (ejemplo)

```
src/compras/
  compras.module.ts
  compras.controller.ts
  compras.service.ts
  entities/
    compra-refill.entity.ts
    detalle-compra-refill.entity.ts
  dto/
    create-compra.dto.ts
    create-detalle-compra.dto.ts
    update-detalle-compra.dto.ts
    compra-response.dto.ts
    query-compras.dto.ts
```
