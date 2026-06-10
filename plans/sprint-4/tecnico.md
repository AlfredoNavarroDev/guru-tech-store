# Sprint 4 — Backend · Rol Técnico

**Stack:** NestJS · TypeORM · PostgreSQL · class-validator · JWT · Swagger  
**Story Points:** 26  
**Épica:** Servicios Técnicos  
**Dependencias:** Auth (Sprint 1) · Stock de repuestos (Sprint 3)

---

## Historias de Usuario

| HU    | Historia                                    | Épica          | Módulo        | SP | Prioridad |
|-------|---------------------------------------------|----------------|---------------|----|-----------|
| HU-15 | Registrar ingreso de equipo al serv. técnico| Serv. Técnicos | Reparaciones  | 8  | Alta      |
| HU-16 | Actualizar estado de reparación             | Serv. Técnicos | Reparaciones  | 5  | Alta      |
| HU-17 | Registrar repuestos utilizados              | Serv. Técnicos | Reparaciones  | 5  | Alta      |
| HU-18 | Consultar historial de reparaciones         | Serv. Técnicos | Reparaciones  | 3  | Alta      |
| HU-19 | Registrar adelanto de pago de reparación    | Serv. Técnicos | Pagos         | 5  | Media     |

---

## Contexto del Rol

El Técnico opera dentro de **una sola sede** (extraída del JWT).
- **No ve** `precio_compra_actual` ni `costo_unitario_momento`.
- Lee datos a través de vistas `v_tecnico_*`, `v_historial_cliente_*`.
- Escribe en: `Reparaciones`, `Reparacion_Repuestos_Usados`, `Pagos`.
- Los triggers manejan stock de repuestos automáticamente:
  - `trg_rep_repuestos_insert` → descuenta stock al usar repuesto.
  - `trg_rep_repuestos_update` → ajusta stock al cambiar cantidad.
  - `trg_rep_repuestos_delete` → restituye stock al quitar repuesto.

---

## Estructura de Módulos

```
src/
  auth/              ← compartido (Sprint 1)
  reparaciones/
  repuestos/
  clientes/          ← compartido con Vendedor
  estados/
  pagos/             ← extendido para adelantos de reparación
  common/
    guards/
    filters/
    dto/
    decorators/
```

---

## Orden de Implementación

| Prioridad | Módulo        | HU cubierta    | Dependencias                        |
|-----------|---------------|----------------|-------------------------------------|
| 1         | Auth          | —              | Sprint 1                            |
| 2         | Estados       | —              | Auth                                |
| 3         | Repuestos     | —              | Auth, Items (Sprint 3)              |
| 4         | Clientes      | —              | Auth                                |
| 5         | Reparaciones  | HU-15, HU-16, HU-17, HU-18 | Auth, Estados, Repuestos, Clientes |
| 6         | Pagos         | HU-19          | Reparaciones                        |

---

## Módulo 1 — Reparaciones
**HU:** HU-15 · HU-16 · HU-17 · HU-18

### Endpoints
| Método | Ruta                                   | Descripción                              |
|--------|----------------------------------------|------------------------------------------|
| POST   | /reparaciones                          | Registrar ingreso de equipo (HU-15)      |
| GET    | /reparaciones                          | Cola activa del técnico (HU-18)          |
| GET    | /reparaciones/historial                | Reparaciones completadas (HU-18)         |
| GET    | /reparaciones/:id                      | Detalle de una reparación                |
| PATCH  | /reparaciones/:id/estado               | Avanzar estado (HU-16)                   |
| PATCH  | /reparaciones/:id/diagnostico          | Actualizar diagnóstico                   |
| PATCH  | /reparaciones/:id/cotizacion           | Registrar monto cotizado                 |
| PATCH  | /reparaciones/:id/entrega              | Marcar equipo entregado al cliente       |
| POST   | /reparaciones/:id/repuestos            | Agregar repuesto usado (HU-17)           |
| PATCH  | /reparaciones/:id/repuestos/:repId     | Modificar cantidad de repuesto           |
| DELETE | /reparaciones/:id/repuestos/:repId     | Quitar repuesto (restituye stock)        |

### DTO — Crear Reparación
```typescript
class CreateReparacionDto {
  id_cliente: number;

  marca?: string;
  modelo?: string;
  imei?: string;                   // exactamente 15 dígitos si se provee
  esta_encendido?: boolean;
  checklist_estado?: Record<string, string>;  // jsonb
  fotos?: string[];                // array de URLs/paths

  id_estado: number;               // estado inicial del flujo
}
```

### DTO — Cambiar Estado
```typescript
class UpdateEstadoDto {
  id_estado: number;
}
```

### DTO — Diagnóstico
```typescript
class UpdateDiagnosticoDto {
  diagnostico_tecnico: string;
}
```

### DTO — Cotización
```typescript
class UpdateCotizacionDto {
  monto_cotizado: number;          // >= 0
  monto_descuento?: number;        // default 0
  tipo_descuento?: 'porcentaje' | 'monto_fijo';
  justificacion_descuento?: string; // requerido si monto_descuento > 0
}
```

### DTO — Repuesto Usado
```typescript
class CreateRepuestoUsadoDto {
  id_item: number;
  cantidad: number;                // > 0
  precio_cobrado: number;          // >= 0
  costo_unitario_momento: number;  // snapshot del costo actual del ítem
}
```

### DTO — Modificar Repuesto
```typescript
class UpdateRepuestoUsadoDto {
  cantidad: number;                // > 0
}
```

### Reglas de negocio
1. `id_tecnico` e `id_sede` extraídos del JWT — no del body.
2. Al cambiar estado a uno con `es_final = true` → `fecha_terminado = now()`.
3. `fecha_entrega_cliente` solo se setea en `PATCH /entrega` — no antes.
4. `monto_descuento > 0` → `justificacion_descuento` obligatorio.
5. Trigger lanza `Stock insuficiente del repuesto...` → `409 ConflictException`.
6. `imei` si se envía: exactamente 15 dígitos numéricos (`@Matches(/^\d{15}$/)`).

### Vistas usadas
- `v_tecnico_reparaciones_activas` → filtrar por `id_tecnico = :empleado_del_jwt`
- `v_tecnico_historial_reparaciones` → filtrar por `id_tecnico = :empleado_del_jwt`

### Filtros en GET /reparaciones/historial
```
?fecha_desde=YYYY-MM-DD
?fecha_hasta=YYYY-MM-DD
?id_cliente=<id>
?page=1&limit=20
```

### Manejo de errores del trigger de stock (HU-25 incluido)
```typescript
try {
  await this.repuestosUsadosRepo.save(repuesto);
} catch (err: unknown) {
  const error = err as { message?: string; code?: string };
  if (error.message?.includes('Stock insuficiente del repuesto')) {
    throw new ConflictException(error.message);
  }
  // HU-25: deadlock de PostgreSQL (código 40P01)
  if (error.code === '40P01') {
    throw new ConflictException({ message: 'Operación en conflicto, intente de nuevo', retry: true });
  }
  throw err;
}
```

---

## Módulo 2 — Pagos (adelantos de reparación)
**HU:** HU-19

### Endpoints
| Método | Ruta                         | Descripción                              |
|--------|------------------------------|------------------------------------------|
| POST   | /reparaciones/:id/pagos      | Registrar adelanto de pago (HU-19)       |
| GET    | /reparaciones/:id/pagos      | Ver adelantos de una reparación          |

### DTO
```typescript
class CreatePagoReparacionDto {
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin' | 'otro';
  monto: number;                   // > 0
  referencia_transaccion?: string;
}
```

### Notas
- `es_adelanto = true` para pagos de reparación.
- `id_reparacion` del path param, `id_venta` queda `null`.
- XOR respetado por constraint de BD.
- Múltiples adelantos permitidos por reparación.

---

## Módulo 3 — Repuestos

Lectura únicamente. El técnico consulta stock disponible de su sede.

### Endpoints
| Método | Ruta       | Descripción                                  |
|--------|------------|----------------------------------------------|
| GET    | /repuestos | Repuestos disponibles en la sede (stock > 0) |

### Filtros
```
?marca=<id>
?nombre=<texto>
?modelo=<texto>
```

### Vista usada
- `v_tecnico_repuestos_disponibles` → filtrar por `id_sede = :sede_del_jwt`

### Notas
- Respuesta **nunca** incluye `precio_compra_actual`.
- Solo repuestos con `cantidad_actual > 0` (filtrado en vista).

---

## Módulo 4 — Clientes

### Endpoints
| Método | Ruta                                  | Descripción                           |
|--------|---------------------------------------|---------------------------------------|
| GET    | /clientes                             | Buscar por nombre o nro_documento     |
| GET    | /clientes/:id                         | Detalle + total de compras            |
| POST   | /clientes                             | Registrar nuevo cliente               |
| PATCH  | /clientes/:id                         | Actualizar datos del cliente          |
| GET    | /clientes/:id/historial/reparaciones  | Historial de reparaciones del cliente |
| GET    | /clientes/:id/historial/ventas        | Historial de compras del cliente      |

### Vista usada
- `v_historial_cliente_reparaciones`
- `v_historial_cliente_ventas`

---

## Módulo 5 — Estados de Reparación

### Endpoints
| Método | Ruta                | Descripción                         |
|--------|---------------------|-------------------------------------|
| GET    | /estados-reparacion | Lista ordenada de estados del flujo |

### Vista usada
- `v_tecnico_estados_reparacion` — ordenada por `orden ASC`.

---

## Guards y Decoradores

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tecnico')

@Decorator('CurrentUser') → { id_empleado, id_sede, roles }
```

---

## Estructura del Módulo — Reparaciones

```
src/reparaciones/
  reparaciones.module.ts
  reparaciones.controller.ts
  reparaciones.service.ts
  entities/
    reparacion.entity.ts
    reparacion-repuesto-usado.entity.ts
  dto/
    create-reparacion.dto.ts
    update-estado.dto.ts
    update-diagnostico.dto.ts
    update-cotizacion.dto.ts
    create-repuesto-usado.dto.ts
    update-repuesto-usado.dto.ts
    create-pago-reparacion.dto.ts
    reparacion-response.dto.ts
    query-reparaciones.dto.ts
```
