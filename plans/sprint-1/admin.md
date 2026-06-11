# Sprint 1 — Backend · Rol Admin

**Stack:** NestJS · TypeORM · PostgreSQL · class-validator · JWT · Swagger  
**Story Points:** 15  
**Épicas:** Administrador · Seguridad  
**Dependencia:** Auth de Sprint 1 (incluyendo HU-23: `RefreshTokens` entity)

---

## Historias de Usuario

| HU    | Historia                              | Épica         | Módulo     | SP | Prioridad |
|-------|---------------------------------------|---------------|------------|----|-----------|
| HU-05 | Administrar empleados de la sede      | Administrador | Empleados  | 8  | Alta      |
| HU-24 | Revocar tokens al desactivar empleado | Administrador | Empleados  | 2  | Alta      |
| HU-26 | Interceptor audit trail (actor_id)    | Seguridad     | Common     | 5  | Alta      |

---

## Contexto del Rol

El Admin opera dentro de **una sola sede** (extraída del JWT).
- Gestiona empleados de su propia sede únicamente.
- No puede ver ni modificar datos de otras sedes.
- **No tiene** acceso a módulos de ventas, inventario o reparaciones.
- Escribe en: `Empleados`.

---

## Estructura de Módulos

```
src/
  auth/           ← compartido (Sprint 1)
  empleados/
  common/
    guards/
    filters/
    decorators/
```

---

## Módulo — Auth

Compartido con Sprint 1. Ver `sprint-1/vendedor.md`.  
El JWT incluye `rol: 'admin'`.

---

## Módulo — Empleados
**HU:** HU-05

### Endpoints
| Método | Ruta                          | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| POST   | /empleados                    | Registrar nuevo empleado (HU-05)     |
| GET    | /empleados                    | Listar empleados de la sede (HU-05)  |
| GET    | /empleados/:id                | Detalle de un empleado               |
| PATCH  | /empleados/:id                | Actualizar datos del empleado        |
| PATCH  | /empleados/:id/password       | Cambiar contraseña del empleado      |
| PATCH  | /empleados/:id/estado         | Activar / desactivar empleado        |

### DTO — Crear Empleado
```typescript
class CreateEmpleadoDto {
  tipo_documento: string;       // 'DNI' | 'CE' | 'pasaporte'
  nro_documento: string;
  nombre_completo: string;
  id_rol: number;               // FK → Roles(id_rol)
  email: string;
  telefono?: string;
  password: string;             // mínimo 8 caracteres
}
```

### DTO — Actualizar Empleado
```typescript
class UpdateEmpleadoDto {
  nombre_completo?: string;
  telefono?: string;
  email?: string;
  id_rol?: number;              // FK → Roles(id_rol)
}
```

### DTO — Cambiar Contraseña
```typescript
class UpdatePasswordEmpleadoDto {
  nueva_password: string;       // mínimo 8 caracteres
}
```

### DTO — Cambiar Estado
```typescript
class UpdateEstadoEmpleadoDto {
  activo: boolean;
}
```

### Reglas de negocio (validar en service)
1. `id_sede` extraído del JWT — el admin solo puede gestionar empleados de su sede.
2. Al crear empleado: hash de password con **bcrypt** (10 rounds) antes de persistir.
3. `id_rol` debe existir en la tabla `Roles` → validar FK antes de persistir.
4. No se puede desactivar al propio admin (evitar lock-out).
5. Filtrar en `GET /empleados` siempre por `id_sede = :sede_del_jwt`.
6. **HU-24:** Al desactivar un empleado (`activo = false`) → revocar todos sus refresh tokens activos.

### HU-24 — Revocar refresh tokens al desactivar

```typescript
// EmpleadosService.updateEstado()
async updateEstado(id: number, dto: UpdateEstadoEmpleadoDto, user: JwtPayload): Promise<void> {
  // ... validaciones existentes ...

  // HU-24: Al desactivar, revocar todos los refresh tokens del empleado
  if (!dto.activo) {
    await this.dataSource.query(
      `UPDATE RefreshTokens SET revoked = true WHERE id_empleado = $1 AND revoked = false`,
      [id],
    );
  }

  await this.empleadosRepo.update(id, { estado: dto.activo ? 'activo' : 'inactivo' });
}
```

**Dependencia:** Requiere que la tabla `RefreshTokens` esté creada (HU-23, Sprint 1). No se necesita inyectar repository — se usa `dataSource.query()` directo.

### Vista usada
- `Empleados` table directamente, filtrado por `id_sede`.

### Filtros en GET /empleados
```
?id_rol=1|2|3|4
?activo=true|false
?page=1&limit=20
```

### Hashing de contraseña al crear
```typescript
import * as bcrypt from 'bcrypt';

const password_hash = await bcrypt.hash(dto.password, 10);
const empleado = this.empleadosRepo.create({
  ...dto,
  password_hash,
  id_sede: currentUser.id_sede,
});
await this.empleadosRepo.save(empleado);
```

---

## Guards y Decoradores

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')

@Decorator('CurrentUser') → { id_empleado, id_sede, rol }
```

---

## Estructura del Módulo

```
src/empleados/
  empleados.module.ts
  empleados.controller.ts
  empleados.service.ts
  entities/
    empleado.entity.ts
  dto/
    create-empleado.dto.ts
    update-empleado.dto.ts
    update-password-empleado.dto.ts
    update-estado-empleado.dto.ts
    empleado-response.dto.ts
    query-empleados.dto.ts
```

---

## Módulo Cross-cutting — Audit Trail
**HU:** HU-26

### Contexto
La BD ya cuenta con `Logs_Sistema`, `fn_log_operacion()` y `fn_get_actor_id()` que lee `app.actor_id` de sesión. Los triggers de `Sedes` y `Empleados` ya usan `fn_get_actor_id()`. El backend solo necesita hacer `SET LOCAL app.actor_id = :id` al inicio de cada request autenticado para que los registros tengan el empleado correcto.

### AuditInterceptor

```typescript
// src/common/interceptors/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    // Solo para requests autenticados con usuario válido
    if (user?.sub) {
      await this.dataSource.query(
        `SELECT set_config('app.actor_id', $1, true)`,
        [String(user.sub)],
      );
    }

    return next.handle();
  }
}
```

> **Nota:** Se usa `set_config('app.actor_id', $1, true)` (tercer parámetro `true` = LOCAL, solo dura la transacción/request actual) en lugar de `SET LOCAL`, que requiere una transacción activa.

### Registro en AppModule

```typescript
// src/app.module.ts — en el array providers:
{
  provide: APP_INTERCEPTOR,
  useClass: AuditInterceptor,
},
```

### Archivos a crear/modificar
```
src/common/interceptors/
  audit.interceptor.ts        — nuevo
src/app.module.ts             — registrar AuditInterceptor
```

### Criterio de aceptación
- Después de `POST /empleados` (crear empleado), `Logs_Sistema` registra el `id_empleado` del admin que ejecutó la acción.
- Sin usuario autenticado (seed, migraciones), los campos quedan NULL (el `IF` del interceptor no dispara).

---

## Orden de Implementación

| Prioridad | Módulo          | HU cubierta    | Dependencias |
|-----------|-----------------|----------------|--------------|
| 1         | Auth            | —              | Sprint 1     |
| 2         | AuditInterceptor| HU-26          | Auth, DataSource |
| 3         | Empleados       | HU-05, HU-24   | Auth, HU-23  |
