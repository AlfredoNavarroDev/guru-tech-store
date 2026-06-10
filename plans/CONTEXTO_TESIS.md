# CONTEXTO COMPLETO — TESIS: Guru Tech Store

> Documento generado el 2026-05-31.  
> Cubre al 100% los archivos de `plans/` y `DB/`.  
> Usar como contexto inicial al retomar el proyecto en una nueva sesión.

---

## 1. IDENTIDAD DEL PROYECTO

| Campo | Valor |
|-------|-------|
| **Nombre del sistema** | Guru Tech Store — Gestion Multi-Sede |
| **Tipo** | Tesis de fin de carrera (TFC) |
| **Descripción** | Sistema de gestion para una tienda de tecnología con múltiples sedes; cubre ventas, inventario, servicio técnico, administración de personal y chatbot con IA |
| **Equipo** | Alfredo F. Navarro Torres (PO / Dev) · Christian D. Unocc Ramírez (SM / Dev) |
| **Herramienta de gestión** | ClickUp — escala Fibonacci: 1, 2, 3, 5, 8, 13, 21 |
| **Stack** | NestJS · TypeORM · PostgreSQL · Next.js 14 · Tailwind CSS · JWT |
| **Total SP** | 136 Story Points en 5 sprints |

---

## 2. RESUMEN DE SPRINTS

| Sprint | Épica | SP | HUs | Roles cubiertos |
|--------|-------|----|-----|-----------------|
| 1 | Autenticación + Ventas | 46 | HU-01 a HU-08, HU-23, HU-25 | Vendedor · Frontend (Login) |
| 2 | Administrador | 14 | HU-09, HU-10, HU-24, HU-26 | Admin · Frontend (Landing) |
| 3 | Inventario | 16 | HU-11 a HU-14, HU-25, HU-27 | Abastecedor · Frontend |
| 4 | Servicios Técnicos | 26 | HU-15 a HU-19 | Técnico · Frontend |
| 5 | Chatbot IA | 34 | HU-20 a HU-22, HU-28 | IA (Backend + Frontend) |

---

## 3. PRODUCT BACKLOG COMPLETO

| ID | Historia de Usuario | Épica | Sprint | SP | Prioridad |
|----|---------------------|-------|--------|----|-----------|
| HU-01 | Inicio de sesión con credenciales | Autenticación | 1 | 5 | Crítica |
| HU-02 | Cierre de sesión | Autenticación | 1 | 2 | Alta |
| HU-03 | Control de acceso por rol | Autenticación | 1 | 5 | Crítica |
| HU-04 | Registrar una venta | Ventas | 1 | 13 | Crítica |
| HU-05 | Consultar disponibilidad de stock | Ventas | 1 | 3 | Alta |
| HU-06 | Generar comprobante PDF de venta | Ventas | 1 | 5 | Alta |
| HU-07 | Registrar cliente en la venta | Ventas | 1 | 3 | Media |
| HU-08 | Visualizar historial de ventas | Ventas | 1 | 3 | Media |
| HU-09 | Registrar nuevo empleado | Administrador | 2 | 5 | Alta |
| HU-10 | Listar empleados de la sede | Administrador | 2 | 2 | Media |
| HU-11 | Registrar nuevo ítem en el catálogo | Inventario | 3 | 5 | Alta |
| HU-12 | Actualizar stock de ítem existente | Inventario | 3 | 3 | Alta |
| HU-13 | Consultar catálogo de productos | Inventario | 3 | 3 | Media |
| HU-14 | Consultar repuestos disponibles | Inventario | 3 | 2 | Media |
| HU-15 | Registrar ingreso de equipo al serv. técnico | Serv. Técnicos | 4 | 8 | Alta |
| HU-16 | Actualizar estado de reparación | Serv. Técnicos | 4 | 5 | Alta |
| HU-17 | Registrar repuestos utilizados en reparación | Serv. Técnicos | 4 | 5 | Alta |
| HU-18 | Consultar historial de reparaciones | Serv. Técnicos | 4 | 3 | Alta |
| HU-19 | Registrar adelanto de pago de reparación | Serv. Técnicos | 4 | 5 | Media |
| HU-20 | Consultar productos en lenguaje natural | Chatbot IA | 5 | 13 | Alta |
| HU-21 | Respuestas con datos en tiempo real | Chatbot IA | 5 | 8 | Alta |
| HU-22 | Historial de conversación del chatbot | Chatbot IA | 5 | 5 | Media |
| HU-23 | Refresh tokens + revocación JWT | Autenticación | 1 | 5 | Crítica |
| HU-24 | Revocar tokens al desactivar empleado | Administrador | 2 | 2 | Alta |
| HU-25 | Deadlock handling + orden items por id ASC | Ventas | 1+3 | 2 | Alta |
| HU-26 | Interceptor audit trail (SET LOCAL actor_id) | Seguridad | 2 | 5 | Alta |
| HU-27 | N+1 queries: QueryBuilder en listados | Inventario | 3 | 3 | Media |
| HU-28 | Chatbot seguro: RO + schema/rol + sanitiz. | Chatbot IA | 5 | 8 | Alta |

---

## 4. PLANNING POKER — CONSENSOS

| ID | Alfredo | Christian | ¿Consenso? | SP Final | Nota |
|----|---------|-----------|------------|----------|------|
| HU-01 | 5 | 5 | Sí | 5 | — |
| HU-02 | 2 | 2 | Sí | 2 | — |
| HU-03 | 5 | 8 | No | 5 | NestJS Guards nativos reducen esfuerzo |
| HU-04 | 13 | 8 | No | 13 | Validación stock + transacción atómica + múltiples productos |
| HU-05 | 3 | 3 | Sí | 3 | — |
| HU-06 | 5 | 5 | Sí | 5 | — |
| HU-07 | 3 | 2 | No | 3 | Flujo embebido búsqueda/creación cliente dentro de venta |
| HU-08 | 3 | 3 | Sí | 3 | — |
| HU-09 | 5 | 5 | Sí | 5 | — |
| HU-10 | 2 | 2 | Sí | 2 | — |
| HU-11 | 5 | 5 | Sí | 5 | — |
| HU-12 | 3 | 3 | Sí | 3 | — |
| HU-13 | 3 | 2 | No | 3 | Incluye búsqueda por nombre, SKU y categoría |
| HU-14 | 2 | 2 | Sí | 2 | — |
| HU-15 | 8 | 8 | Sí | 8 | — |
| HU-16 | 5 | 5 | Sí | 5 | — |
| HU-17 | 5 | 8 | No | 5 | Descuento stock reutiliza lógica del módulo ventas |
| HU-18 | 3 | 3 | Sí | 3 | — |
| HU-19 | 5 | 5 | Sí | 5 | — |
| HU-20 | 13 | 13 | Sí | 13 | — |
| HU-21 | 8 | 8 | Sí | 8 | — |
| HU-22 | 5 | 5 | Sí | 5 | — |
| HU-23 | 5 | 5 | Sí | 5 | Tabla `RefreshTokens` + endpoints /auth/refresh y /auth/logout |
| HU-24 | 2 | 2 | Sí | 2 | Revocar refresh tokens al desactivar — inyectar repo en EmpleadosService |
| HU-25 | 2 | 2 | Sí | 2 | Captura 40P01 + ordenar items por id_item ASC en ventas/compras |
| HU-26 | 5 | 5 | Sí | 5 | Interceptor global AuditInterceptor — BD ya tiene fn_get_actor_id() |
| HU-27 | 3 | 3 | Sí | 3 | QueryBuilder en ItemsService + ComprasService, máx 2 queries por listado |
| HU-28 | 8 | 8 | Sí | 8 | Usuario chatbot_ro + ChatbotDataSource + schema/rol + sanitización |

---

## 5. ARQUITECTURA GENERAL

```
Frontend (Next.js 14)               Backend (NestJS)                Base de Datos
────────────────────────            ──────────────────              ─────────────────
app/
  page.tsx              ──────────► (público / sin auth)           PostgreSQL
  login/page.tsx        ──────────► POST /auth/login   ──────────► Empleados
  dashboard/
    vendedor/           ──────────► /ventas                        Ventas
                                    /clientes          ──────────► Clientes
                                    /catalogo          ──────────► Items
                                    /pagos             ──────────► Pagos
                                    /boletas           ──────────► Boletas
    admin/              ──────────► /empleados         ──────────► Empleados
    abastecedor/        ──────────► /items                        Items
                                    /stock             ──────────► Items (stock)
                                    /compras           ──────────► Compras_Refill
                                    /proveedores       ──────────► Proveedores
    tecnico/            ──────────► /reparaciones      ──────────► Reparaciones
                                    /repuestos         ──────────► Items (repuestos)
                                    /pagos-reparacion  ──────────► Pagos
    chatbot/            ──────────► /chatbot           ──────────► Conversaciones
                                                                   Mensajes_Chatbot
```

### Dependencias entre Sprints

```
Sprint 1 — Auth + Ventas (base del sistema)
  │
  ├─► Sprint 2 — Admin (requiere Auth de S1)
  │
  ├─► Sprint 3 — Inventario (requiere Auth de S1 + Items seed de BD)
  │       │
  │       └─► Sprint 4 — Serv. Técnicos (requiere Stock de S3 + Auth de S1)
  │                   │
  │                   └─► Sprint 5 — Chatbot IA (requiere todos los módulos)
```

---

## 6. CONVENCIONES GLOBALES

### Timezone
```typescript
// main.ts — PRIMERA línea
process.env.TZ = 'America/Lima';
```
```sql
ALTER DATABASE guru_tech SET timezone = 'America/Lima';
```

### JWT Payload (todos los roles)
```typescript
{
  sub: number;        // id_empleado
  id_sede: number;    // sede del empleado
  roles: string[];    // ['vendedor' | 'admin' | 'abastecedor' | 'tecnico']
  nombre: string;
}
```

### Guards globales
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('<rol>')
@Decorator('CurrentUser') → { id_empleado, id_sede, roles }
```

### Manejo de errores de trigger
```typescript
try {
  await this.dataSource.transaction(async (manager) => { ... });
} catch (err) {
  if (err.message?.includes('Stock insuficiente')) {
    throw new ConflictException(err.message);
  }
  throw err;
}
```

### Paginación estándar
```
?page=1&limit=20
```
Respuesta: `{ data: [...], total: number, page: number, limit: number }`

---

## 7. BASE DE DATOS — ESQUEMA COMPLETO

### 7.1 Reglas generales
- **Dialecto:** PostgreSQL 15+
- **Timezone:** `America/Lima` (seteado a nivel de base de datos)
- **PKs:** `GENERATED BY DEFAULT AS IDENTITY` (excepto tablas de audit)
- **Timestamps:** `timestamptz NOT NULL DEFAULT now()`
- **Convención visibilidad de costos:**
  - Propietario, Gerente, Abastecedor → ven `precio_compra_actual` y `costo_unitario_momento`
  - Vendedor, Técnico → solo ven precios de venta

### 7.2 Tablas maestras (lookup)

#### `Sedes`
| Columna | Tipo | Restricción |
|---------|------|-------------|
| `id_sede` | INT IDENTITY PK | — |
| `nombre` | varchar(100) | NOT NULL |
| `direccion` | text | — |
| `telefono` | varchar(20) | — |
| `hora_apertura` / `hora_cierre` | time | CHECK hora_cierre != hora_apertura |
| `esta_habilitada` | boolean | NOT NULL DEFAULT true |
| `created_by` | int | FK → Empleados (ON DELETE SET NULL) |
| `updated_at` / `created_at` | timestamptz | — |

> Los triggers bloquean INSERT en Ventas, Reparaciones y Compras si `esta_habilitada = false`.

#### `Roles`
| Columna | Tipo |
|---------|------|
| `id_rol` | INT IDENTITY PK |
| `nombre_rol` | varchar(80) UNIQUE |

Roles del sistema: `propietario`, `gerente`, `vendedor`, `tecnico`, `abastecedor`

#### `Marcas`
`id_marca` · `nombre` (varchar(100) UNIQUE)

#### `Categorias`
`id_categoria` · `nombre_categoria` (varchar(100) UNIQUE)

#### `Estados_Reparacion`
| Columna | Descripción |
|---------|-------------|
| `id_estado` | PK |
| `nombre` | varchar(30) UNIQUE |
| `descripcion` | text |
| `orden` | int — define el flujo |
| `es_final` | boolean — si true, al llegar aquí se sella `fecha_terminado` |

Datos seed: Recibido(1) → En Diagnóstico(2) → Esperando Repuesto(3) → En Reparación(4) → Listo para Entrega(5) → Entregado(6,final) · Cancelado(7,final)

#### `Proveedores`
`id_proveedor` · `ruc` (varchar(15) UNIQUE) · `razon_social` · `contacto_nombre` · `telefono` · `created_at` · `updated_at`

### 7.3 Personas

#### `Empleados`
| Columna | Tipo | Restricción |
|---------|------|-------------|
| `id_empleado` | INT IDENTITY PK | — |
| `id_sede` | int | FK → Sedes |
| `tipo_documento` | varchar(20) | NOT NULL |
| `nro_documento` | varchar(30) | NOT NULL |
| `nombre_completo` | varchar(150) | NOT NULL |
| `telefono` | varchar(20) | — |
| `sueldo_semanal_soles` | decimal(10,2) | CHECK >= 0 |
| `estado` | varchar(20) | CHECK IN ('activo','inactivo','suspendido') DEFAULT 'activo' |
| `es_extranjero` | boolean | DEFAULT false |
| `direccion_completa` | text | — |
| `password_hash` | varchar(255) | NOT NULL |
| `created_by` | int | FK → Empleados self-ref (ON DELETE SET NULL) |
| UNIQUE | (tipo_documento, nro_documento) | — |

#### `Empleado_Roles`
PK compuesta: `(id_empleado, id_rol)` — relación N:M entre Empleados y Roles.

#### `Clientes`
Columnas análogas a Empleados: `id_cliente` · `tipo_documento` · `nro_documento` (UNIQUE pair) · `nombre_completo` · `telefono` · `direccion_completa` · `es_extranjero` · `created_at` · `updated_at`

### 7.4 Catálogo e Inventario

#### `Items`
| Columna | Restricción clave |
|---------|-------------------|
| `tipo` | CHECK IN ('producto', 'repuesto') |
| `sku` | varchar(50) UNIQUE |
| `id_marca` | FK → Marcas |
| `id_categoria` | FK → Categorias |
| `calidad` | solo si tipo='repuesto' (`chk_calidad_solo_repuesto`) |
| `especificaciones` | jsonb — para búsquedas GIN |
| `precio_compra_actual` | decimal(12,2) CHECK >= 0 |
| `precio_venta_actual` | decimal(12,2) CHECK >= precio_compra_actual |
| CONSTRAINT | precio_venta >= precio_compra |
| CONSTRAINT | id_categoria NOT NULL si tipo='producto' |

#### `Inventario_Sedes`
| Columna | Restricción |
|---------|-------------|
| `id_inventario` | INT IDENTITY PK |
| `id_sede` | FK → Sedes |
| `id_item` | FK → Items |
| `cantidad_actual` | int CHECK >= 0 |
| `stock_minimo` | int DEFAULT 0 CHECK >= 0 |
| UNIQUE | (id_sede, id_item) |

#### `Movimientos_Inventario`
Registra todos los movimientos de stock: compra, venta, ajuste_manual, transferencia, reparacion, cambio.
- `cantidad` puede ser positivo (entrada) o negativo (salida).
- `id_referencia` apunta al id del origen (id_venta, id_compra, id_reparacion, etc.).

### 7.5 Compras (reposición de stock)

#### `Compras_Refill`
Cabecera de orden de compra: `id_empleado_refiller` · `id_sede_destino` · `id_proveedor` · `fecha_compra`

#### `Detalle_Compra_Refill`
| Columna | Restricción |
|---------|-------------|
| `id_compra` | FK → Compras_Refill (ON DELETE CASCADE) |
| `id_item` | FK → Items |
| `cantidad_comprada` | int CHECK > 0 |
| `costo_unidad` | decimal(12,2) CHECK >= 0 |
| `precio_venta_sugerido` | decimal(12,2) CHECK >= 0 |

> Al insertar un detalle, el trigger `trg_det_compra_insert` incrementa stock y actualiza `precio_compra_actual` / `precio_venta_actual` en Items.

### 7.6 Promociones

#### `Promociones`
- Aplica a una categoría **o** a un ítem específico (constraint XOR).
- `tipo_descuento`: 'porcentaje' | 'monto_fijo'
- `estado`: 'activa' | 'pausada' | 'vencida' | 'cancelada'
- `dia_semana` (1-7) para promos de día específico.
- Constraint: si porcentaje → valor_descuento <= 100.
- Constraint: fecha_fin > fecha_inicio.

### 7.7 Ventas

#### `Ventas`
| Columna | Nota |
|---------|------|
| `id_cliente` | FK con ON DELETE SET NULL (preserva la venta) |
| `id_empleado` | FK → Empleados (vendedor) |
| `id_sede` | FK → Sedes |
| `monto_descuento` | decimal(12,2) DEFAULT 0 |
| `tipo_descuento` | 'porcentaje' o 'monto_fijo' |
| `justificacion_descuento` | requerido en backend si monto_descuento > 0 |

#### `Detalle_Venta`
- UNIQUE(id_venta, id_item) — no se repite el mismo ítem en una venta.
- `precio_unitario_momento` / `costo_unitario_momento` — snapshot al momento de la venta.
- `importe` = precio_unitario * cantidad.
- Trigger `trg_det_venta_insert` descuenta stock atómicamente (con validación concurrencia).

### 7.8 Cambios de Producto

#### `Cambios_Producto`
Gestión de devoluciones/cambios post-venta:
- `id_venta_origen` → venta de referencia.
- `id_garantia` → garantía asociada (opcional, ON DELETE SET NULL).
- `id_item_devuelto` / `id_item_entregado` — deben ser distintos.
- `diferencia_cobrada` → si > 0, `metodo_pago_dif` obligatorio.
- `motivo`: 'defecto' | 'garantia' | 'otro'
- Trigger devuelve item_devuelto al stock y descuenta item_entregado atómicamente.

### 7.9 Reparaciones

#### `Reparaciones`
| Columna clave | Nota |
|---------------|------|
| `id_cliente` | NOT NULL — siempre se requiere cliente |
| `id_tecnico` | FK → Empleados |
| `imei` | CHECK `^[0-9]{15}$` |
| `checklist_estado` | jsonb — estado de componentes al ingreso |
| `fotos` | jsonb — array de URLs |
| `id_estado` | FK → Estados_Reparacion |
| `fecha_terminado` | seteado por trigger/backend cuando es_final = true |
| `fecha_entrega_cliente` | solo en PATCH /entrega |
| Constraint fechas | terminado >= ingreso; entrega >= terminado |

#### `Reparacion_Repuestos_Usados`
Repuestos consumidos en la reparación. Trigger descuenta stock automáticamente.

### 7.10 Garantías

#### `Garantias`
- Aplica a una venta **o** a una reparación (constraint XOR).
- `estado`: 'activa' | 'vencida' | 'invalidada'
- `fecha_fin > fecha_inicio` (constraint).

### 7.11 Pagos

#### `Pagos`
- Aplica a una venta **o** a una reparación (constraint XOR).
- `metodo_pago`: efectivo | tarjeta | transferencia | yape | plin | otro
- `es_adelanto`: true solo para reparaciones (constraint `chk_adelanto_solo_reparacion`).

### 7.12 Boletas

#### `Boletas`
- Aplica a una venta **o** a una reparación (constraint XOR).
- `numero` UNIQUE — formato B{sede}-{correlativo}.
- `estado` = 'emitida' (único valor permitido actualmente).
- `url_pdf` → URL en Cloudflare R2.

### 7.13 Auditoría

#### `Logs_Sistema`
Registro central de auditoría. Tipos de acción: creacion, actualizacion, eliminacion, cambio_estado, cambio_precio, login, logout, error, anulacion.

#### `RefreshTokens`
| Columna | Tipo | Nota |
|---------|------|------|
| `id` | BIGSERIAL PK | — |
| `id_empleado` | INTEGER | FK → Empleados (ON DELETE CASCADE) |
| `token_hash` | TEXT | bcrypt hash del token opaco |
| `expires_at` | TIMESTAMPTZ | 7 días |
| `revoked` | BOOLEAN DEFAULT false | — |

### 7.14 Chatbot (tablas Sprint 5)

```sql
CREATE TABLE Conversaciones (
  id_conversacion SERIAL PRIMARY KEY,
  id_empleado     INTEGER NOT NULL REFERENCES Empleados(id_empleado),
  id_sede         INTEGER NOT NULL REFERENCES Sedes(id_sede),
  titulo          VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE Mensajes_Chatbot (
  id_mensaje      SERIAL PRIMARY KEY,
  id_conversacion INTEGER NOT NULL REFERENCES Conversaciones(id_conversacion),
  rol             VARCHAR(20) NOT NULL,  -- 'user' | 'assistant' | 'tool_result'
  contenido       TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. ÍNDICES

| Índice | Tabla | Propósito |
|--------|-------|-----------|
| `idx_ventas_sede_fecha` | Ventas(id_sede, fecha_emision) | Reportes diarios por sede |
| `idx_ventas_cliente` | Ventas(id_cliente) | Joins desde boletas/pagos/garantías |
| `idx_detalle_venta_venta` | Detalle_Venta(id_venta) | Líneas de una venta |
| `idx_det_venta_item` | Detalle_Venta(id_item) | Análisis rotación |
| `idx_inv_item` | Inventario_Sedes(id_item) | Stock por item en todas las sedes |
| `idx_reparaciones_sede_fecha` | Reparaciones(id_sede, fecha_ingreso) | Reportes por sede |
| `idx_reparaciones_estado` | Reparaciones(id_estado) | Dashboard por estado |
| `idx_reparaciones_cliente` | Reparaciones(id_cliente) | Historial por cliente |
| `idx_reparaciones_tecnico` | Reparaciones(id_tecnico) | Carga de trabajo |
| `idx_logs_fecha_hora` | Logs_Sistema(fecha_hora) | Auditoría por fechas |
| `idx_logs_ref` | Logs_Sistema(tipo_referencia, id_referencia) | Trazabilidad por entidad |
| `idx_item_espec_modelo` | Items((especificaciones->>'modelo')) | Búsqueda GIN en jsonb |
| `idx_pagos_venta` | Pagos(id_venta) WHERE NOT NULL | Partial index |
| `idx_pagos_reparacion` | Pagos(id_reparacion) WHERE NOT NULL | Partial index |
| `idx_garantias_venta` | Garantias(id_venta) WHERE NOT NULL | Partial index |
| `idx_garantias_reparacion` | Garantias(id_reparacion) WHERE NOT NULL | Partial index |
| `idx_boletas_venta` | Boletas(id_venta) WHERE NOT NULL | Partial index |
| `idx_boletas_reparacion` | Boletas(id_reparacion) WHERE NOT NULL | Partial index |
| `idx_refresh_tokens_empleado` | RefreshTokens(id_empleado) | Login/logout/refresh |
| `idx_refresh_tokens_expiry` | RefreshTokens(expires_at) WHERE revoked=false | Limpieza periódica |
| `idx_cambios_venta_origen` | Cambios_Producto(id_venta_origen) | — |

---

## 9. TRIGGERS — CATÁLOGO COMPLETO

### 9.1 Funciones helper

| Función | Propósito |
|---------|-----------|
| `fn_set_updated_at()` | Auto-asigna `updated_at = now()` en cualquier BEFORE UPDATE |
| `fn_log_operacion(...)` | INSERT en Logs_Sistema con tipo_accion genérico |
| `fn_log_cambio_estado(...)` | INSERT con tipo_accion='cambio_estado', formato "estado: anterior → nuevo" |
| `fn_get_actor_id()` | Lee `app.actor_id` de sesión (seteado por AuditInterceptor); retorna NULL si no hay |
| `fn_get_id_inventario(sede, item)` | Retorna id_inventario para par (sede, item) o NULL |

### 9.2 Triggers `updated_at`
Aplican en: Sedes, Empleados, Clientes, Items, Proveedores, Compras_Refill, Promociones, Ventas, Reparaciones, Garantias.

### 9.3 Triggers de Inventario — Compras

| Trigger | Evento | Efecto |
|---------|--------|--------|
| `trg_det_compra_insert` | AFTER INSERT Detalle_Compra_Refill | Crea Inventario_Sedes si no existe (ON CONFLICT DO NOTHING); incrementa stock; INSERT en Movimientos_Inventario; log de creacion |
| `trg_det_compra_update` | AFTER UPDATE OF cantidad_comprada | Ajusta stock por delta; si delta<0 valida que stock no quede negativo; log de actualizacion |
| `trg_det_compra_delete` | AFTER DELETE Detalle_Compra_Refill | Resta stock; movimiento inverso negativo; log de eliminacion |
| `trg_actualizar_precios_item` | AFTER INSERT Detalle_Compra_Refill | UPDATE Items SET precio_compra_actual = costo_unidad, precio_venta_actual = precio_venta_sugerido |

### 9.4 Triggers de Inventario — Ventas

| Trigger | Evento | Mecánica clave |
|---------|--------|----------------|
| `trg_det_venta_insert` | BEFORE INSERT Detalle_Venta | UPDATE con `WHERE cantidad_actual >= NEW.cantidad` — validación+descuento en un solo UPDATE atómico (antirace condition); lanza `Stock insuficiente...` si NOT FOUND |
| `trg_det_venta_update` | BEFORE UPDATE OF cantidad | Ajusta por delta; si aumenta → validación atómica; si disminuye → devolución |
| `trg_det_venta_delete` | AFTER DELETE Detalle_Venta | Devuelve stock; movimiento positivo |

### 9.5 Triggers de Inventario — Reparaciones

Misma lógica que ventas pero sobre `Reparacion_Repuestos_Usados`:
- `trg_rep_repuestos_insert` — descuento atómico, error `Stock insuficiente del repuesto...`
- `trg_rep_repuestos_update` — ajuste por delta
- `trg_rep_repuestos_delete` — restitución

### 9.6 Triggers de Cambios de Producto

`trg_cambio_producto_insert` (AFTER INSERT Cambios_Producto):
1. Incrementa stock del item devuelto (crea Inventario_Sedes si no existe).
2. Descuenta stock del item entregado atómicamente.
3. Registra 2 movimientos en Movimientos_Inventario.
4. Log de creacion en Logs_Sistema.

### 9.7 Triggers de Log de Estados

| Trigger | Tabla | Descripción |
|---------|-------|-------------|
| `trg_reparaciones_log_estado` | Reparaciones | Loguea transiciones de id_estado con nombres legibles |
| `trg_promociones_log_estado` | Promociones | Loguea cambios activa↔pausada↔vencida |
| `trg_garantias_log_estado` | Garantias | Loguea con contexto de venta o reparación |

### 9.8 Trigger de Cambio de Precio

`trg_items_log_precio` (AFTER UPDATE OF precio_compra_actual, precio_venta_actual ON Items): loguea con tipo_accion='cambio_precio' cuando algún precio cambia (sea por compra o edición manual).

### 9.9 Triggers de Auditoría — Sedes

| Trigger | Evento |
|---------|--------|
| `trg_sedes_log_insert` | Loguea creación |
| `trg_sedes_log_update` | Loguea cambios en nombre, dirección, teléfono, horario |
| `trg_sedes_log_habilitada` | Loguea cambio esta_habilitada con tipo='cambio_estado' |
| `trg_sedes_log_delete` | Loguea eliminación |

### 9.10 Triggers de Auditoría — Empleados

| Trigger | Evento |
|---------|--------|
| `trg_empleados_log_insert` | Loguea creación con nombre y documento |
| `trg_empleados_log_update` | Loguea cambios en estado, id_sede, sueldo, nombre |
| `trg_empleados_log_delete` | Loguea eliminación |

### 9.11 Guards de Sede Habilitada (BEFORE INSERT)

- `trg_ventas_check_sede_habilitada` — lanza EXCEPTION si sede deshabilitada.
- `trg_reparaciones_check_sede_habilitada` — idem.
- `trg_compras_check_sede_habilitada` — idem.

---

## 10. VISTAS SQL — CATÁLOGO COMPLETO

### 10.1 Sección Propietario (sin filtro de sede)

| Vista | Descripción |
|-------|-------------|
| `v_propietario_resumen_sedes` | KPIs por sede: empleados activos, total ventas, ingresos ventas, total reparaciones, ingresos reparaciones, ingresos totales |
| `v_propietario_ventas_global` | Detalle de ventas de todas las sedes con costos |
| `v_propietario_reparaciones_global` | Detalle de reparaciones de todas las sedes con costos |
| `v_propietario_inventario_global` | Inventario global con margen unitario y alerta stock crítico |
| `v_propietario_empleados_global` | Todos los empleados con roles (STRING_AGG) |
| `v_propietario_sedes` | Listado plano de sedes para CRUD global |

### 10.2 Sección Propietario + Gerente (filtrar por `WHERE id_sede = <sede>` para gerente)

| Vista | Descripción |
|-------|-------------|
| `v_gerente_ventas` | Ventas por sede con totales y boleta |
| `v_gerente_reparaciones` | Reparaciones con costo_real calculado (SUM precio_cobrado * cantidad - descuento) |
| `v_gerente_inventario` | Stock con alertas y precios de compra |
| `v_gerente_empleados` | Empleados con roles, por sede |
| `v_gerente_compras` | Historial de compras con costo_total_linea |
| `v_gerente_cambios` | Historial de cambios de producto con contexto garantía |

### 10.3 Sección Vendedor

| Vista | Descripción |
|-------|-------------|
| `v_vendedor_catalogo` | Productos con stock, promoción vigente y `precio_con_descuento` calculado; SIN precio_compra |
| `v_vendedor_promociones_activas` | Promociones vigentes hoy |
| `v_vendedor_ventas` | Historial del vendedor (filtrar por id_empleado); SIN costos |
| `v_vendedor_clientes` | Directorio con `total_compras` y `ultima_compra` |

### 10.4 Sección Vendedor + Técnico (historial del cliente)

| Vista | Descripción |
|-------|-------------|
| `v_historial_cliente_ventas` | Compras pasadas del cliente con garantía |
| `v_historial_cliente_reparaciones` | Reparaciones pasadas del cliente con repuestos y garantía |

### 10.5 Sección Técnico

| Vista | Descripción |
|-------|-------------|
| `v_tecnico_reparaciones_activas` | Cola activa (es_final = false); filtrar por id_tecnico |
| `v_tecnico_historial_reparaciones` | Historial completo; SIN precio_compra |
| `v_tecnico_repuestos_disponibles` | Repuestos con stock > 0; SIN precio_compra |
| `v_tecnico_estados_reparacion` | Lista ordenada de estados (ORDER BY orden) |

### 10.6 Sección Abastecedor

| Vista | Descripción |
|-------|-------------|
| `v_abastecedor_stock_actual` | Stock con `diferencia_stock`, `requiere_reposicion`, `precio_compra_actual` |
| `v_abastecedor_stock_critico` | Solo ítems bajo mínimo; ordenados por `unidades_faltantes DESC` |
| `v_abastecedor_historial_compras` | Historial completo de órdenes de compra con costos |
| `v_abastecedor_proveedores` | Directorio con `total_ordenes`, `ultima_compra`, `total_comprado` |

---

## 11. SEGURIDAD DE BASE DE DATOS

### Usuario de solo lectura para chatbot (HU-28)
```sql
CREATE USER chatbot_ro WITH PASSWORD '<password_seguro>';
GRANT CONNECT ON DATABASE gurutech TO chatbot_ro;
GRANT USAGE ON SCHEMA public TO chatbot_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO chatbot_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO chatbot_ro;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM chatbot_ro;
```

Variable de entorno: `DB_URL_CHATBOT_RO`

---

## 12. DATOS DE PRUEBA (seed)

### Sedes
| id | nombre | dirección |
|----|--------|-----------|
| 1 | TechStore Lima Centro | Jr. de la Unión 620, Lima |
| 2 | TechStore Miraflores | Av. Larco 345, Miraflores |
| 3 | TechStore San Isidro | Calle Las Flores 210, San Isidro |

### Empleados (13 registros)
- 1 Propietario (sin sede)
- 3 Gerentes (uno por sede)
- 3 Vendedores (uno por sede + 1 suspendido)
- 3 Técnicos
- 2 Abastecedores
- Password hash placeholder para dev: `$2b$10$test.placeholder.hash.dev.only.xx`

### Catálogo (14 items)
- 8 productos (cables, cargadores, fundas, auriculares, accesorios)
- 6 repuestos (pantallas y baterías Samsung/Apple/Xiaomi/Huawei)

### Datos transaccionales
- 6 compras de reposición (3 sedes × 2: productos y repuestos)
- 10 ventas con detalles
- 8 reparaciones en distintos estados
- 6 garantías (vencidas y activas)
- Pagos de ventas y reparaciones (adelantos y finales)
- 13 boletas emitidas
- 2 cambios de producto

---

## 13. SPRINT 1 — BACKEND (Vendedor)

### Módulos: Auth · Clientes · Catálogo · Ventas · Pagos · Boletas

### Auth (HU-01, HU-02, HU-03, HU-23)

**Endpoints:**
- `POST /auth/login` → access_token (15 min) + refresh_token (UUID v4, hash bcrypt, 7 días)
- `POST /auth/logout` → revoca refresh token; retorna 204
- `POST /auth/refresh` → renueva access_token con refresh_token válido

**Flujo refresh:**
1. Buscar tokens activos del empleado (revoked=false, expires_at > now())
2. `bcrypt.compare(dto.refresh_token, token.token_hash)`
3. Si válido → emitir nuevo access_token
4. Si no → `UnauthorizedException`

### Ventas (HU-04, HU-08, HU-25)

**DTO CreateVentaDto:**
```typescript
{
  id_cliente?: number;
  items: { id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe }[];
  monto_descuento?: number;
  tipo_descuento?: 'porcentaje' | 'monto_fijo';
  justificacion_descuento?: string; // requerido si monto_descuento > 0
}
```

**HU-25 — Deadlock prevention:**
```typescript
const itemsOrdenados = [...dto.items].sort((a, b) => a.id_item - b.id_item);
// Captura código PostgreSQL 40P01 → ConflictException con { retry: true }
```

### Boletas (HU-06)

**Flujo:**
1. INSERT Boletas (url_pdf = null)
2. Renderizar HTML → Puppeteer → PDF
3. Subir a Cloudflare R2
4. UPDATE Boletas SET url_pdf = <url>

**Variables de entorno:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

---

## 14. SPRINT 1 — FRONTEND (Login)

### Página `/login`

**Layout desktop (≥1024px):** Split-screen 50/50
- Panel izquierdo: `AnimatedGridPattern` + logo + 3 feature bullets
- Panel derecho: `MagicCard` + `BorderBeam` + formulario

**Componentes Magic UI:**
`MagicCard` · `BorderBeam` · `AnimatedGradientText` · `AnimatedGridPattern` · `DotPattern` · `ShimmerButton`

**Navegación post-login:**
```typescript
switch (roles[0]) {
  case 'vendedor':      redirect('/dashboard/vendedor');
  case 'admin':         redirect('/dashboard/admin');
  case 'abastecedor':   redirect('/dashboard/abastecedor');
  case 'tecnico':       redirect('/dashboard/tecnico');
}
```

**Auto-refresh ante 401 (`lib/api.ts`):**
Wrapper `apiFetch` que reintenta con refresh_token si recibe 401; redirige a /login si refresh falla.

---

## 15. SPRINT 2 — BACKEND (Admin)

### Módulo: Empleados (HU-09, HU-10, HU-24) + AuditInterceptor (HU-26)

**Admin solo gestiona empleados de su propia sede (id_sede del JWT).**

**HU-24 — Revocar tokens al desactivar:**
```typescript
// Al desactivar empleado:
await this.dataSource.query(
  `UPDATE RefreshTokens SET revoked = true WHERE id_empleado = $1 AND revoked = false`,
  [id],
);
```

**HU-26 — AuditInterceptor:**
```typescript
await this.dataSource.query(
  `SELECT set_config('app.actor_id', $1, true)`,
  [String(user.sub)],
);
```
Registrado globalmente como `APP_INTERCEPTOR` en AppModule.

---

## 16. SPRINT 2 — FRONTEND (Landing + Panel Admin)

### Landing Page (`/`)

**Secciones:** Navbar sticky · Hero con `Meteors` + `WordRotate` · Stats Bar con `NumberTicker` · Features `BentoGrid` · Dark Section con `WarpBackground` · Meet Guru AI · CTA Final · Footer

### Panel Admin (`/dashboard/admin`)
Tabla de empleados + modales crear/editar + toggle estado.

---

## 17. SPRINT 3 — BACKEND (Abastecedor)

### Módulos: Items · Stock · Proveedores · Compras (HU-11 a HU-14, HU-25, HU-27)

**Abastecedor SÍ ve `precio_compra_actual`.**

**HU-27 — QueryBuilder (máx 2 queries por listado):**
```typescript
// Prohibido .find({ relations: [...] }) en bucle
// Usar createQueryBuilder con leftJoin y addSelect
```

**Endpoints clave:**
- `GET /items?tipo=repuesto` — repuestos disponibles (HU-14)
- `GET /stock/critico` — usa `v_abastecedor_stock_critico` ordenada por urgencia
- `PATCH /compras/:id/items/:itemId` — modifica cantidad (trigger ajusta stock)
- `DELETE /compras/:id/items/:itemId` — revierte stock

---

## 18. SPRINT 3 — FRONTEND (Abastecedor)

**Páginas:**
- `/dashboard/abastecedor` — overview con cards métricas
- `/dashboard/abastecedor/items` — catálogo + crear/editar
- `/dashboard/abastecedor/stock` — tabs Todo/Crítico con badges OK/Bajo/Crítico
- `/dashboard/abastecedor/compras` — historial + nueva compra
- `/dashboard/abastecedor/proveedores` — directorio en cards

---

## 19. SPRINT 4 — BACKEND (Técnico)

### Módulos: Reparaciones · Pagos (adelantos) · Repuestos · Clientes · Estados (HU-15 a HU-19)

**Técnico NO ve `precio_compra_actual`.**

**Endpoints clave de Reparaciones:**
- `POST /reparaciones` — registrar ingreso de equipo
- `PATCH /reparaciones/:id/estado` — avanzar estado (trigger loguea transición)
- `PATCH /reparaciones/:id/entrega` — marca `fecha_entrega_cliente`
- `POST /reparaciones/:id/repuestos` — agrega repuesto, trigger descuenta stock
- `POST /reparaciones/:id/pagos` — adelanto con `es_adelanto = true`

**Regla clave:** Al cambiar a estado con `es_final = true` → backend setea `fecha_terminado = now()`.

---

## 20. SPRINT 4 — FRONTEND (Técnico)

**Páginas:**
- `/dashboard/tecnico` — cola activa con tarjetas por estado (badges coloreados)
- `/dashboard/tecnico/reparaciones/:id` — detalle completo (stepper de estados + diagnóstico + repuestos + cotización + adelantos + entrega)
- `/dashboard/tecnico/historial` — reparaciones completadas
- `/dashboard/tecnico/repuestos` — grid de repuestos disponibles

---

## 21. SPRINT 5 — CHATBOT IA (Backend + Frontend)

### Stack adicional: `ai` (Vercel AI SDK Core) · `@ai-sdk/openai` · `zod` · SSE streaming

> **Decisión de diseño:** Se usa Vercel AI SDK Core en lugar de `@anthropic-ai/sdk` directamente.
> Motivos: Zod integrado en tool parameters (type-safe, elimina validación manual), `maxSteps` maneja el loop de tool use automáticamente, swap de proveedor en una línea si se necesita.
>
> **Modelo:** `gpt-4o-mini` (OpenAI) — producción real con datos reales.
> Upgrade path: migrar a `claude-haiku-4-5-20251001` si `gpt-4o-mini` no respeta restricciones HU-28 en producción.
>
> **Por qué no LangChain:** DI de NestJS incompatible, difícil de depurar, overkill para tool calling simple.

### HU-20, HU-21 — Tool Use con datos en tiempo real

**Herramientas disponibles (Zod-validated):**
- `buscar_productos(query, tipo?, con_stock?)` — catálogo de la sede
- `consultar_stock(id_item)` — stock actual
- `obtener_promociones()` — promos activas del día
- `estado_reparacion(id_reparacion?, nro_documento_cliente?)` — estado

**Flujo con Vercel AI SDK:**
1. Cargar historial de conversación
2. `generateText()` con `model: openai('gpt-4o-mini')`, tools con Zod schemas, `maxSteps: 5`
3. SDK maneja loop tool use automáticamente (sin while manual)
4. Persistir mensajes y retornar respuesta final

```typescript
import { generateText, streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const result = await generateText({
  model: openai('gpt-4o-mini'),
  system: buildSystemPrompt(user.roles, user.id_sede),
  tools: {
    buscar_productos: tool({
      description: 'Busca productos en el catálogo de la sede',
      parameters: z.object({
        query: z.string().describe('Texto de búsqueda'),
        tipo: z.enum(['producto', 'repuesto', 'todos']).optional(),
        con_stock: z.boolean().optional(),
      }),
      execute: async ({ query, tipo, con_stock }) =>
        this.itemsService.buscarParaChatbot({ query, tipo, con_stock, id_sede: user.id_sede }),
    }),
    // ... resto de tools
  },
  messages: historial,
  prompt: sanitizedInput,
  maxSteps: 5,  // reemplaza el while(stop_reason === 'tool_use') manual
});
```

**Streaming SSE:** usar `streamText` en lugar de `generateText`; retorna `ReadableStream` compatible con SSE de NestJS.

### HU-28 — Seguridad del chatbot

**Capas de seguridad:**
1. **Usuario RO en PostgreSQL** — `chatbot_ro` solo puede SELECT
2. **DataSource dedicada** — `ChatbotDataSource` usa `DB_URL_CHATBOT_RO`, sin entidades, `synchronize: false`
3. **Schema por rol** — `buildSystemPrompt()` limita tablas accesibles y columnas prohibidas según rol JWT
4. **Sanitización de input** — regex antiinyección: `ignora tus instrucciones`, `act as`, `pretend to be`, etc.; límite 2000 chars
5. **Validación de SQL generado** — rechaza cualquier query que no empiece con SELECT; detecta INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT/REVOKE

**Tablas por rol:**
| Rol | Tablas accesibles |
|-----|-------------------|
| propietario | Items, Inventario_Sedes, Ventas, Detalle_Venta, Reparaciones, Compras_Refill, Empleados, Sedes |
| administrador | Items, Inventario_Sedes, Ventas, Detalle_Venta, Empleados |
| vendedor | Items, Inventario_Sedes, Ventas, Detalle_Venta, Clientes |
| tecnico | Items, Reparaciones, Reparacion_Repuestos_Usados, Clientes |
| abastecedor | Items, Inventario_Sedes, Compras_Refill, Detalle_Compra_Refill, Proveedores |

**Columnas prohibidas:** vendedor y tecnico nunca pueden ver `precio_compra_actual` ni `costo_unitario_momento`.

### Frontend chatbot (`/dashboard/chatbot`)
Layout: sidebar de historial de conversaciones + área de chat con streaming (cursor parpadeante), input con Enter para enviar / Shift+Enter para nueva línea.

---

## 22. VARIABLES DE ENTORNO REQUERIDAS

```env
# Base de datos principal
DATABASE_URL=postgresql://user:pass@localhost:5432/gurutech

# Chatbot (read-only)
DB_URL_CHATBOT_RO=postgresql://chatbot_ro:<password>@localhost:5432/gurutech

# JWT
JWT_SECRET=...
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Cloudflare R2 (PDFs de boletas)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# OpenAI (Chatbot IA) — gpt-4o-mini
# Upgrade path: si gpt-4o-mini falla HU-28 en producción → migrar a claude-haiku-4-5-20251001
# y cambiar a @ai-sdk/anthropic (una línea en chatbot.service.ts)
OPENAI_API_KEY=sk-...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 23. ESTRUCTURA DE ARCHIVOS BACKEND (src/)

```
src/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    entities/
      empleado.entity.ts
      refresh-token.entity.ts
    dto/
      auth-response.dto.ts
      refresh-token.dto.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    strategies/
      jwt.strategy.ts
  clientes/
  catalogo/
  ventas/
    entities/
      venta.entity.ts
      detalle-venta.entity.ts
    dto/
      create-venta.dto.ts
      create-detalle-venta.dto.ts
  pagos/
  boletas/
  empleados/
  items/
  stock/
  proveedores/
  compras/
    entities/
      compra-refill.entity.ts
      detalle-compra-refill.entity.ts
  reparaciones/
    entities/
      reparacion.entity.ts
      reparacion-repuesto-usado.entity.ts
  repuestos/
  estados/
  chatbot/
    chatbot.tools.ts
    entities/
      conversacion.entity.ts
      mensaje-chatbot.entity.ts
  database/
    chatbot-datasource.ts
  common/
    guards/
    filters/
    decorators/
      current-user.decorator.ts
    interceptors/
      audit.interceptor.ts
    exceptions/
    dto/
```

---

## 24. ESTRUCTURA DE ARCHIVOS FRONTEND (app/ y components/)

```
app/
  page.tsx                          ← Landing pública
  login/
    page.tsx
  dashboard/
    vendedor/page.tsx
    admin/page.tsx
    abastecedor/
      page.tsx
      items/page.tsx
      stock/page.tsx
      compras/
        page.tsx
        nueva/page.tsx
      proveedores/page.tsx
    tecnico/
      page.tsx
      historial/page.tsx
      repuestos/page.tsx
      reparaciones/[id]/page.tsx
    chatbot/page.tsx

components/
  login/
    LoginCard.tsx
    LoginForm.tsx
    DecorativePanel.tsx
  landing/
    Navbar.tsx · HeroSection.tsx · StatsSection.tsx · FeaturesSection.tsx
    DarkOptimizeSection.tsx · AISection.tsx · CTASection.tsx · Footer.tsx
  admin/
    EmpleadosTable.tsx · CreateEmpleadoModal.tsx · EditEmpleadoModal.tsx · CargoBadge.tsx
  abastecedor/
    StockOverview.tsx · ItemsTable.tsx · ItemModal.tsx · StockAjusteModal.tsx
    ComprasTable.tsx · NuevaCompraForm.tsx · ProveedoresGrid.tsx · StockBadge.tsx
  tecnico/
    ReparacionCard.tsx · EstadoBadge.tsx · EstadoStepper.tsx
    RegistrarIngresoModal.tsx · AgregarRepuestoModal.tsx · AdelantosPagoModal.tsx
    CotizacionForm.tsx · DiagnosticoForm.tsx · RepuestosGrid.tsx · HistorialTable.tsx
  chatbot/
    ChatWindow.tsx · ChatInput.tsx · MessageBubble.tsx
    StreamingCursor.tsx · ConversationSidebar.tsx · ConversationItem.tsx

lib/
  auth.ts         ← decode JWT, store/refresh tokens, logout real
  api.ts          ← fetch wrapper con interceptor de refresh ante 401
```

---

## 25. ORDEN DE EJECUCIÓN DE SCRIPTS SQL

```
1. DB-Tables.sql      ← tablas + FKs + índices + RefreshTokens
2. DB-Triggers.sql    ← funciones helper + triggers (depende de tablas)
3. DB-Security.sql    ← usuario chatbot_ro (ejecutar UNA SOLA VEZ)
4. DB-Inserts.sql     ← datos seed (respeta orden de triggers)
5. DB-Views.sql       ← vistas (pueden recrearse en cualquier momento)
```

---

*Fin del documento de contexto. Total de archivos cubiertos: 11 (6 SQL + 5 sprints backend + 5 sprints frontend + 1 general).*
