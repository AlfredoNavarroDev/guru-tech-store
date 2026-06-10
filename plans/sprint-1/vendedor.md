# Sprint 1 — Backend · Rol Vendedor

**Stack:** NestJS · TypeORM · PostgreSQL · class-validator · JWT · Swagger  
**Story Points:** 46  
**Épicas:** Autenticación · Ventas · Seguridad

---

## Historias de Usuario

| HU    | Historia                          | Épica         | Módulo(s)      | SP  | Prioridad |
|-------|-----------------------------------|---------------|----------------|-----|-----------|
| HU-01 | Inicio de sesión con credenciales | Autenticación | Auth           | 5   | Crítica   |
| HU-02 | Cierre de sesión                  | Autenticación | Auth           | 2   | Alta      |
| HU-03 | Control de acceso por rol         | Autenticación | Auth           | 5   | Crítica   |
| HU-04 | Registrar una venta               | Ventas        | Ventas + Pagos | 13  | Crítica   |
| HU-05 | Consultar disponibilidad de stock | Ventas        | Catálogo       | 3   | Alta      |
| HU-06 | Generar comprobante PDF de venta  | Ventas        | Boletas        | 5   | Alta      |
| HU-07 | Registrar cliente en la venta     | Ventas        | Clientes       | 3   | Media     |
| HU-08 | Visualizar historial de ventas    | Ventas        | Ventas         | 3   | Media     |
| HU-23 | Refresh tokens + revocación JWT  | Autenticación | Auth           | 5   | Crítica   |
| HU-25 | Deadlock handling + orden items   | Ventas        | Ventas         | 2   | Alta      |

> Excluidos del Sprint 1: Garantías (M7) y Cambios de Producto (M8) → Sprint posterior.

---

## Contexto del Rol

El Vendedor opera dentro de **una sola sede** (extraída del JWT).
- **No ve** `precio_compra_actual` ni `costo_unitario_momento` en respuestas.
- Lee datos a través de vistas `v_vendedor_*` y `v_historial_cliente_*`.
- Escribe en: `Clientes`, `Ventas`, `Detalle_Venta`, `Pagos`, `Boletas`.
- El stock se descuenta automáticamente vía trigger `trg_det_venta_insert`.

---

## Estructura de Módulos

```
src/
  auth/
  clientes/
  catalogo/
  ventas/
  pagos/
  boletas/
  common/
    guards/
    filters/
    dto/
    decorators/
```

---

## Orden de Implementación

| Prioridad | Módulo        | HU cubierta          | Dependencias             |
|-----------|---------------|----------------------|--------------------------|
| 1         | Auth          | HU-01, HU-02, HU-03  | —                        |
| 2         | Clientes      | HU-07                | Auth                     |
| 3         | Catálogo      | HU-05                | Auth                     |
| 4         | Ventas (core) | HU-04, HU-08         | Auth, Clientes, Catálogo |
| 5         | Pagos         | HU-04 (flujo pago)   | Ventas                   |
| 6         | Boletas       | HU-06                | Ventas                   |

---

## Módulo 1 — Auth
**HU:** HU-01 · HU-02 · HU-03

### Endpoints
| Método | Ruta            | Descripción                                        |
|--------|-----------------|----------------------------------------------------|
| POST   | /auth/login     | Recibe documento + contraseña → access + refresh  |
| POST   | /auth/logout    | Revoca refresh token server-side (HU-02 + HU-23)  |
| POST   | /auth/refresh   | Renueva access token usando refresh token (HU-23) |

### JWT Payload
```typescript
{
  sub: number;       // id_empleado
  id_sede: number;   // sede del empleado
  roles: string[];   // ['vendedor', ...]
  nombre: string;
}
```

### HU-23 — Refresh tokens + revocación JWT

#### Tabla en BD
```sql
CREATE TABLE RefreshTokens (
  id          BIGSERIAL PRIMARY KEY,
  id_empleado INTEGER NOT NULL REFERENCES Empleados(id_empleado) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_empleado ON RefreshTokens(id_empleado);
```

#### Flujo `POST /auth/login`
```typescript
// access_token: expira en 15 min
// refresh_token: opaco (UUID v4), almacenado como bcrypt hash con 10 rounds, expira en 7 días
return {
  access_token,
  refresh_token,  // nuevo campo en AuthResponseDto
  nombre,
  roles,
  id_sede,
  sede,
};
```

#### Flujo `POST /auth/refresh`
```typescript
// DTO: { refresh_token: string }
// 1. Buscar tokens activos del empleado (revoked = false, expires_at > now())
// 2. Verificar bcrypt.compare(dto.refresh_token, token.token_hash)
// 3. Si válido: emitir nuevo access_token
// 4. Si no encontrado o revocado: throw UnauthorizedException
```

#### Flujo `POST /auth/logout`
```typescript
// DTO: { refresh_token: string }
// Marcar token como revoked = true en RefreshTokens
// Retorna 204 No Content
```

#### Entidades y DTOs nuevos
```
src/auth/entities/
  refresh-token.entity.ts
src/auth/dto/
  refresh-token.dto.ts      — { refresh_token: string }
  auth-response.dto.ts      — añadir campo refresh_token
```

### Notas
- `JwtAuthGuard` + `RolesGuard` aplicados globalmente.
- Contraseña validada contra `password_hash` en `Empleados` con **bcrypt**.
- HU-03: `RolesGuard` implementa control de acceso — cada endpoint declara `@Roles('vendedor')`.
- Tokens de refresh caducados se limpian con un job periódico o al login (lazy cleanup).

---

## Módulo 2 — Clientes
**HU:** HU-07

### Endpoints
| Método | Ruta          | Descripción                       |
|--------|---------------|-----------------------------------|
| GET    | /clientes     | Buscar por nombre o nro_documento |
| GET    | /clientes/:id | Detalle + total de compras        |
| POST   | /clientes     | Crear cliente                     |
| PATCH  | /clientes/:id | Actualizar datos                  |

### DTO
```typescript
class CreateClienteDto {
  tipo_documento: string;       // 'DNI' | 'CE' | 'pasaporte'
  nro_documento: string;
  nombre_completo: string;
  telefono?: string;
  direccion_completa?: string;
  es_extranjero?: boolean;
}
```

### Vista usada
- `v_vendedor_clientes` — lista con `total_compras` y `ultima_compra`.

---

## Módulo 3 — Catálogo
**HU:** HU-05

### Endpoints
| Método | Ruta      | Descripción                              |
|--------|-----------|------------------------------------------|
| GET    | /catalogo | Productos con stock disponible por sede  |

### Filtros
```
?categoria=<id>
?marca=<id>
?nombre=<texto>
?con_stock=true    // solo items con cantidad_actual > 0
```

### Vista usada
- `v_vendedor_catalogo` → filtrar por `id_sede = :sede_del_jwt`

### Notas
- Respuesta **nunca** incluye `precio_compra_actual`.
- `GET /catalogo/promociones` queda fuera del Sprint 1.

---

## Módulo 4 — Ventas
**HU:** HU-04 · HU-08

### Flujo de creación (una transacción)

```
POST /ventas
  └─ INSERT Ventas          (cabecera)
  └─ INSERT Detalle_Venta[] (trigger descuenta stock atómicamente)

Post-creación (requests separados):
  POST /ventas/:id/pagos   → registra método(s) de pago  [HU-04]
  POST /ventas/:id/boleta  → emite boleta PDF             [HU-06]
```

### Endpoints
| Método | Ruta        | Descripción                              |
|--------|-------------|------------------------------------------|
| POST   | /ventas     | Crear venta + detalles (HU-04)           |
| GET    | /ventas     | Historial de ventas del vendedor (HU-08) |
| GET    | /ventas/:id | Detalle de una venta                     |

### DTO Crear Venta
```typescript
class CreateVentaDto {
  id_cliente?: number;

  items: CreateDetalleVentaDto[];   // mínimo 1

  monto_descuento?: number;         // default 0
  tipo_descuento?: 'porcentaje' | 'monto_fijo';
  justificacion_descuento?: string; // requerido si monto_descuento > 0
}

class CreateDetalleVentaDto {
  id_item: number;
  cantidad: number;                 // > 0
  precio_unitario_momento: number;
  costo_unitario_momento: number;
  importe: number;                  // precio_unitario_momento * cantidad
}
```

### Reglas de negocio
1. `monto_descuento > 0` → `justificacion_descuento` obligatorio.
2. `importe` debe ser igual a `precio_unitario_momento * cantidad`.
3. `id_empleado` y `id_sede` se extraen del JWT (no del body).
4. Trigger lanza `Stock insuficiente...` → capturar y re-lanzar como `409 ConflictException`.

### Vista usada
- `v_vendedor_ventas` → filtrar por `id_empleado = :empleado_del_jwt`

### Filtros en GET /ventas
```
?fecha_desde=YYYY-MM-DD
?fecha_hasta=YYYY-MM-DD
?id_cliente=<id>
?page=1&limit=20
```

### Manejo de errores del trigger (HU-04 + HU-25)

#### HU-25 — Orden de items + deadlock handling
Antes de iterar los items, ordenarlos por `id_item ASC` para evitar deadlocks circulares:

```typescript
// Ordenar por id_item ASC antes de insertar — previene deadlock circular
const itemsOrdenados = [...dto.items].sort((a, b) => a.id_item - b.id_item);

try {
  await this.dataSource.transaction(async (manager) => {
    const venta = manager.create(Venta, { ...ventaData });
    const savedVenta = await manager.save(Venta, venta);

    for (const item of itemsOrdenados) {
      const detalle = manager.create(DetalleVenta, {
        ...item,
        id_venta: savedVenta.id_venta,
      });
      await manager.save(DetalleVenta, detalle);
    }
  });
} catch (err: unknown) {
  const error = err as { message?: string; code?: string };

  if (error.message?.includes('Stock insuficiente')) {
    throw new ConflictException(error.message);
  }
  // HU-25: capturar deadlock de PostgreSQL (código 40P01)
  if (error.code === '40P01') {
    throw new ConflictException({ message: 'Operación en conflicto, intente de nuevo', retry: true });
  }
  throw err;
}
```

**Nota:** El trigger `trg_det_venta_insert` ya adquiere row-lock implícito en `Inventario_Sedes` via `UPDATE`. El ordenamiento por `id_item ASC` elimina deadlocks circulares entre transacciones concurrentes.

---

## Módulo 5 — Pagos
**HU:** HU-04 (flujo de pago)

### Endpoints
| Método | Ruta                | Descripción                        |
|--------|---------------------|------------------------------------|
| POST   | /ventas/:id/pagos   | Registrar pago para una venta      |
| GET    | /ventas/:id/pagos   | Ver pagos registrados de una venta |

### DTO
```typescript
class CreatePagoVentaDto {
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin' | 'otro';
  monto: number;                   // > 0
  referencia_transaccion?: string;
}
```

### Notas
- `es_adelanto` siempre `false` para ventas (solo aplica a reparaciones).
- `id_venta` del path param, `id_reparacion` queda `null`.
- XOR respetado por constraint de BD.

---

## Módulo 6 — Boletas
**HU:** HU-06

### Endpoints
| Método | Ruta                 | Descripción            |
|--------|----------------------|------------------------|
| POST   | /ventas/:id/boleta   | Emitir boleta PDF      |
| GET    | /ventas/:id/boleta   | Obtener boleta emitida |

### DTO
```typescript
class CreateBoletaVentaDto {
  total: number;  // monto final de la venta
}
```

### Flujo de generación
```
1. Validar que no exista boleta para la venta
2. Calcular número correlativo (B001-XXXXXXX por sede)
3. INSERT Boletas (url_pdf = null)
4. Renderizar HTML de la boleta con datos completos
5. Generar PDF con Puppeteer (headless Chromium)
6. Subir PDF a Cloudflare R2 → obtener URL pública
7. UPDATE Boletas SET url_pdf = <url_r2>
8. Retornar boleta con url_pdf
```

### Notas
- Pasos 3–7 en una sola transacción lógica; si Puppeteer o R2 fallan → rollback del INSERT.
- Estado inicial: `'emitida'`. Solo una boleta por venta.

### Dependencias adicionales
```
@nestjs/config        — vars de entorno para R2
puppeteer             — generación PDF
@aws-sdk/client-s3    — Cloudflare R2 (compatible con S3 API)
```

### Variables de entorno
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

---

## Guards y Decoradores

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')

@Decorator('CurrentUser') → { id_empleado, id_sede, roles }
```

---

## Estructura de Módulo — Ventas (ejemplo)

```
src/ventas/
  ventas.module.ts
  ventas.controller.ts
  ventas.service.ts
  entities/
    venta.entity.ts
    detalle-venta.entity.ts
  dto/
    create-venta.dto.ts
    create-detalle-venta.dto.ts
    venta-response.dto.ts
    query-ventas.dto.ts
```
