# Guru Tech Store — Plan General de Sprints

**Sistema:** sistema multi-sede para tienda de tecnología  
**Equipo:** Alfredo F. Navarro Tejeda (PO / Dev) · Christian D. Unocc Ramírez (SM / Dev)  
**Herramienta de gestión:** ClickUp · Escala Fibonacci: 1, 2, 3, 5, 8, 13, 21  
**Stack:** NestJS · TypeORM · PostgreSQL · Next.js 14 · Tailwind CSS · JWT

---

## Resumen de Sprints

| Sprint | Épica                   | SP  | HUs                          | Roles cubiertos              |
|--------|-------------------------|-----|------------------------------|------------------------------|
| 1      | Autenticación + Ventas  | 46  | HU-01 a HU-08, HU-23, HU-25 | Vendedor · Frontend (Login)  |
| 2      | Administrador           | 14  | HU-09, HU-10, HU-24, HU-26  | Admin · Frontend (Landing)   |
| 3      | Inventario              | 16  | HU-11 a HU-14, HU-25, HU-27 | Abastecedor · Frontend       |
| 4      | Serv. Técnicos          | 26  | HU-15 a HU-19                | Técnico · Frontend           |
| 5      | Chatbot IA              | 34  | HU-20 a HU-22, HU-28         | IA (Backend + Frontend)      |
| **Total** |                     | **136** |                          |                              |

---

## Product Backlog

| ID     | Historia de usuario                           | Épica          | Sprint | SP  | Prioridad |
|--------|-----------------------------------------------|----------------|--------|-----|-----------|
| HU-01  | Inicio de sesión con credenciales             | Autenticación  | 1      | 5   | Crítica   |
| HU-02  | Cierre de sesión                              | Autenticación  | 1      | 2   | Alta      |
| HU-03  | Control de acceso por rol                     | Autenticación  | 1      | 5   | Crítica   |
| HU-04  | Registrar una venta                           | Ventas         | 1      | 13  | Crítica   |
| HU-05  | Consultar disponibilidad de stock             | Ventas         | 1      | 3   | Alta      |
| HU-06  | Generar comprobante PDF de venta              | Ventas         | 1      | 5   | Alta      |
| HU-07  | Registrar cliente en la venta                 | Ventas         | 1      | 3   | Media     |
| HU-08  | Visualizar historial de ventas                | Ventas         | 1      | 3   | Media     |
| HU-09  | Registrar nuevo empleado                      | Administrador  | 2      | 5   | Alta      |
| HU-10  | Listar empleados de la sede                   | Administrador  | 2      | 2   | Media     |
| HU-11  | Registrar nuevo ítem en el catálogo           | Inventario     | 3      | 5   | Alta      |
| HU-12  | Actualizar stock de ítem existente            | Inventario     | 3      | 3   | Alta      |
| HU-13  | Consultar catálogo de productos               | Inventario     | 3      | 3   | Media     |
| HU-14  | Consultar repuestos disponibles               | Inventario     | 3      | 2   | Media     |
| HU-15  | Registrar ingreso de equipo al serv. técnico  | Serv. Técnicos | 4      | 8   | Alta      |
| HU-16  | Actualizar estado de reparación               | Serv. Técnicos | 4      | 5   | Alta      |
| HU-17  | Registrar repuestos utilizados en reparación  | Serv. Técnicos | 4      | 5   | Alta      |
| HU-18  | Consultar historial de reparaciones           | Serv. Técnicos | 4      | 3   | Alta      |
| HU-19  | Registrar adelanto de pago de reparación      | Serv. Técnicos | 4      | 5   | Media     |
| HU-20  | Consultar productos en lenguaje natural       | Chatbot IA     | 5      | 13  | Alta      |
| HU-21  | Respuestas con datos en tiempo real           | Chatbot IA     | 5      | 8   | Alta      |
| HU-22  | Historial de conversación del chatbot         | Chatbot IA     | 5      | 5   | Media     |
| HU-23  | Refresh tokens + revocación JWT              | Autenticación  | 1      | 5   | Crítica   |
| HU-24  | Revocar tokens al desactivar empleado        | Administrador  | 2      | 2   | Alta      |
| HU-25  | Deadlock handling + orden items por id ASC   | Ventas         | 1+3    | 2   | Alta      |
| HU-26  | Interceptor audit trail (SET LOCAL actor_id) | Seguridad      | 2      | 5   | Alta      |
| HU-27  | N+1 queries: QueryBuilder en listados        | Inventario     | 3      | 3   | Media     |
| HU-28  | Chatbot seguro: RO + schema/rol + sanitiz.   | Chatbot IA     | 5      | 8   | Alta      |

---

## Planning Poker — Consensos

| ID    | Alfredo | Christian | ¿Consenso? | SP Final | Nota de discusión |
|-------|---------|-----------|------------|----------|-------------------|
| HU-01 | 5  | 5  | Sí | 5  | — |
| HU-02 | 2  | 2  | Sí | 2  | — |
| HU-03 | 5  | 8  | No | 5  | NestJS Guards nativos reducen esfuerzo de implementación |
| HU-04 | 13 | 8  | No | 13 | Validación de stock + transacción atómica + múltiples productos |
| HU-05 | 3  | 3  | Sí | 3  | — |
| HU-06 | 5  | 5  | Sí | 5  | — |
| HU-07 | 3  | 2  | No | 3  | Flujo embebido búsqueda/creación de cliente dentro de venta |
| HU-08 | 3  | 3  | Sí | 3  | — |
| HU-09 | 5  | 5  | Sí | 5  | — |
| HU-10 | 2  | 2  | Sí | 2  | — |
| HU-11 | 5  | 5  | Sí | 5  | — |
| HU-12 | 3  | 3  | Sí | 3  | — |
| HU-13 | 3  | 2  | No | 3  | Incluye búsqueda por nombre, SKU y categoría |
| HU-14 | 2  | 2  | Sí | 2  | — |
| HU-15 | 8  | 8  | Sí | 8  | — |
| HU-16 | 5  | 5  | Sí | 5  | — |
| HU-17 | 5  | 8  | No | 5  | Descuento de stock reutiliza lógica del módulo ventas |
| HU-18 | 3  | 3  | Sí | 3  | — |
| HU-19 | 5  | 5  | Sí | 5  | — |
| HU-20 | 13 | 13 | Sí | 13 | — |
| HU-21 | 8  | 8  | Sí | 8  | — |
| HU-22 | 5  | 5  | Sí | 5  | — |
| HU-23 | 5  | 5  | Sí | 5  | Tabla `RefreshTokens` + endpoints `/auth/refresh` y `/auth/logout` real |
| HU-24 | 2  | 2  | Sí | 2  | Revocar refresh tokens al desactivar — inyectar repo en `EmpleadosService` |
| HU-25 | 2  | 2  | Sí | 2  | Captura `40P01` + ordenar items por `id_item ASC` en ventas/compras |
| HU-26 | 5  | 5  | Sí | 5  | Interceptor global `AuditInterceptor` — BD ya tiene `fn_get_actor_id()` |
| HU-27 | 3  | 3  | Sí | 3  | QueryBuilder en `ItemsService` + `ComprasService`, máx 2 queries por listado |
| HU-28 | 8  | 8  | Sí | 8  | Usuario `chatbot_ro` + `ChatbotDataSource` + schema/rol + sanitización |

**Total: 136 SP**

---

## Arquitectura General

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

---

## Dependencias entre Sprints

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

## Archivos de plan por Sprint y Rol

| Sprint | Backend | Frontend |
|--------|---------|----------|
| Sprint 1 | [vendedor.md](sprint-1/vendedor.md) | [frontend.md](sprint-1/frontend.md) |
| Sprint 2 | [admin.md](sprint-2/admin.md) | [frontend.md](sprint-2/frontend.md) |
| Sprint 3 | [abastecedor.md](sprint-3/abastecedor.md) | [frontend.md](sprint-3/frontend.md) |
| Sprint 4 | [tecnico.md](sprint-4/tecnico.md) | [frontend.md](sprint-4/frontend.md) |
| Sprint 5 | [ia.md](sprint-5/ia.md) | (incluido en ia.md) |

---

## Convenciones Globales

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

## Seguridad de Base de Datos

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

## Variables de Entorno Requeridas

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

## Estructura de Archivos Backend (`src/`)

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

## Estructura de Archivos Frontend (`app/` y `components/`)

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

## Orden de Ejecución de Scripts SQL

```
1. DB-Tables.sql      ← tablas + FKs + índices + RefreshTokens
2. DB-Triggers.sql    ← funciones helper + triggers (depende de tablas)
3. DB-Security.sql    ← usuario chatbot_ro (ejecutar UNA SOLA VEZ)
4. DB-Inserts.sql     ← datos seed (respeta orden de triggers)
5. DB-Views.sql       ← vistas (pueden recrearse en cualquier momento)
```
