# Guru Tech Store — Plan General de Sprints

**Sistema:** sistema multi-sede para tienda de tecnología  
**Equipo:** Alfredo F. Navarro Tejeda (PO / Dev) · Christian D. Unocc Ramírez (SM / Dev)  
**Herramienta de gestión:** ClickUp · Escala Fibonacci: 1, 2, 3, 5, 8, 13, 21  
**Stack:** NestJS · TypeORM · PostgreSQL · Next.js 14 · Tailwind CSS · JWT

---

## Resumen de Sprints

| Sprint | Épica                          | SP      | HUs          |
|--------|--------------------------------|---------|--------------|
| 1      | Autenticación + Ventas + Admin | 52      | HU-01…HU-10 |
| 2      | Inventario                     | 13      | HU-11…HU-14 |
| 3      | Servicios Técnicos             | 26      | HU-15…HU-19 |
| 4      | Chatbot IA                     | 29      | HU-20…HU-22 |
| **Total** |                            | **120** |              |

---

## Épicas

| ID | Épica              | Sprint | Descripción                                       | HUs | SP |
|----|--------------------|--------|---------------------------------------------------|-----|----|
| E1 | Autenticación      | 1      | Gestión de identidad y control de acceso por roles | 4  | 17 |
| E2 | Ventas             | 1      | Registro de ventas, clientes y comprobantes        | 5  | 27 |
| E3 | Administrador      | 1      | Gestión básica de personal de la sede              | 1  | 8  |
| E4 | Inventario         | 2      | Catálogo de ítems, stock y repuestos               | 4  | 13 |
| E5 | Servicios Técnicos | 3      | Reparaciones, estados, repuestos y pagos parciales | 5  | 26 |
| E6 | Chatbot IA         | 4      | Asistente inteligente con datos en tiempo real     | 3  | 29 |

---

## Product Backlog

| ID     | Historia de usuario                               | Épica              | Sprint | SP  | Prioridad |
|--------|---------------------------------------------------|--------------------|--------|-----|-----------|
| HU-01  | Inicio de sesión con credenciales                 | E1 Autenticación   | 1      | 5   | Crítica   |
| HU-02  | Cierre de sesión                                  | E1 Autenticación   | 1      | 2   | Alta      |
| HU-03  | Control de acceso por rol                         | E1 Autenticación   | 1      | 5   | Crítica   |
| HU-04  | Renovación automática de sesión                   | E1 Autenticación   | 1      | 5   | Crítica   |
| HU-05  | Administrar empleados de la sede                  | E3 Administrador   | 1      | 8   | Alta      |
| HU-06  | Registrar una venta                               | E2 Ventas          | 1      | 13  | Crítica   |
| HU-07  | Consultar disponibilidad de stock                 | E2 Ventas          | 1      | 3   | Alta      |
| HU-08  | Generar comprobante PDF de venta                  | E2 Ventas          | 1      | 5   | Alta      |
| HU-09  | Registrar cliente en la venta                     | E2 Ventas          | 1      | 3   | Media     |
| HU-10  | Visualizar historial de ventas                    | E2 Ventas          | 1      | 3   | Media     |
| HU-11  | Registrar nuevo ítem en el catálogo               | E4 Inventario      | 2      | 5   | Alta      |
| HU-12  | Actualizar stock de ítem existente                | E4 Inventario      | 2      | 3   | Alta      |
| HU-13  | Consultar catálogo de productos                   | E4 Inventario      | 2      | 3   | Media     |
| HU-14  | Consultar repuestos disponibles                   | E4 Inventario      | 2      | 2   | Media     |
| HU-15  | Registrar ingreso de equipo al serv. técnico      | E5 Serv. Técnicos  | 3      | 8   | Alta      |
| HU-16  | Actualizar estado de reparación                   | E5 Serv. Técnicos  | 3      | 5   | Alta      |
| HU-17  | Registrar repuestos utilizados en reparación      | E5 Serv. Técnicos  | 3      | 5   | Alta      |
| HU-18  | Consultar historial de reparaciones               | E5 Serv. Técnicos  | 3      | 3   | Alta      |
| HU-19  | Registrar adelanto de pago de reparación          | E5 Serv. Técnicos  | 3      | 5   | Media     |
| HU-20  | Consultar productos en lenguaje natural           | E6 Chatbot IA      | 4      | 13  | Alta      |
| HU-21  | Respuestas con datos en tiempo real               | E6 Chatbot IA      | 4      | 8   | Alta      |
| HU-22  | Seguridad del chatbot                             | E6 Chatbot IA      | 4      | 8   | Alta      |

**Total: 120 SP**

---

## Planning Poker — Consensos

| ID    | Alfredo | Christian | ¿Consenso? | SP Final | Nota de discusión |
|-------|---------|-----------|------------|----------|-------------------|
| HU-01 | 5  | 5  | Sí | 5  | — |
| HU-02 | 2  | 2  | Sí | 2  | — |
| HU-03 | 5  | 8  | No | 5  | Guards nativos de NestJS reducen esfuerzo |
| HU-04 | 5  | 5  | Sí | 5  | — |
| HU-05 | 5  | 8  | No | 8  | Crear y listar; incluye desactivación con revocación de acceso |
| HU-06 | 13 | 8  | No | 13 | Validación stock + transacción atómica + múltiples productos |
| HU-07 | 3  | 3  | Sí | 3  | — |
| HU-08 | 5  | 5  | Sí | 5  | — |
| HU-09 | 3  | 2  | No | 3  | Flujo embebido búsqueda/creación de cliente dentro de venta |
| HU-10 | 3  | 3  | Sí | 3  | — |
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
| HU-22 | 8  | 8  | Sí | 8  | — |

**Total: 120 SP**

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
Sprint 1 — Auth + Ventas + Admin básico (base del sistema)
  │
  ├─► Sprint 2 — Inventario (requiere Auth de S1 + Items seed de BD)
  │       │
  │       └─► Sprint 3 — Serv. Técnicos (requiere Stock de S2 + Auth de S1)
  │                   │
  │                   └─► Sprint 4 — Chatbot IA (requiere todos los módulos)
```

---

## Archivos de plan por Sprint y Rol

| Sprint | Backend | Frontend |
|--------|---------|----------|
| Sprint 1 | [vendedor.md](sprint-1/vendedor.md) · [admin.md](sprint-1/admin.md) | [frontend.md](sprint-1/frontend.md) |
| Sprint 2 | [abastecedor.md](sprint-2/abastecedor.md) | [frontend.md](sprint-2/frontend.md) |
| Sprint 3 | [tecnico.md](sprint-3/tecnico.md) | [frontend.md](sprint-3/frontend.md) |
| Sprint 4 | [ia.md](sprint-4/ia.md) | (incluido en ia.md) |

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

### Usuario de solo lectura para chatbot (HU-22)
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
# Upgrade path: si gpt-4o-mini falla HU-22 en producción → migrar a claude-haiku-4-5-20251001
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
