# DB Schema Refactor — Single Role + Multi-Category

**Date:** 2026-06-10  
**Scope:** DB schema · NestJS entities/services · Sprint plan docs  
**Branch strategy:** Single PR (all changes in one pass)

---

## Motivation

Two business rule corrections:

1. **Employees have exactly one role** — the N:M `Empleado_Roles` table was over-engineered; no employee ever holds multiple roles simultaneously.
2. **Products can belong to multiple categories** — a product like "Cable USB-C 65W" can be both "Cables" and "Cargadores".

---

## Section 1 — DB Schema Changes

### 1.1 `Empleados` table

Add column:

```sql
ALTER TABLE Empleados
  ADD COLUMN id_rol INT NOT NULL REFERENCES Roles(id_rol);
```

Migrate existing data (before dropping `Empleado_Roles`):

```sql
UPDATE Empleados e
SET id_rol = (
  SELECT id_rol FROM Empleado_Roles er WHERE er.id_empleado = e.id_empleado LIMIT 1
);
```

Drop the junction table:

```sql
DROP TABLE Empleado_Roles;
```

### 1.2 `Items` table — remove `id_categoria`

```sql
ALTER TABLE Items
  DROP CONSTRAINT IF EXISTS chk_categoria_required,
  DROP COLUMN id_categoria;
```

### 1.3 New table `Item_Categorias`

```sql
CREATE TABLE Item_Categorias (
  id_item      INT NOT NULL REFERENCES Items(id_item) ON DELETE CASCADE,
  id_categoria INT NOT NULL REFERENCES Categorias(id_categoria) ON DELETE RESTRICT,
  PRIMARY KEY (id_item, id_categoria)
);

CREATE INDEX idx_item_categorias_item     ON Item_Categorias(id_item);
CREATE INDEX idx_item_categorias_categoria ON Item_Categorias(id_categoria);
```

Migrate existing data:

```sql
INSERT INTO Item_Categorias (id_item, id_categoria)
SELECT id_item, id_categoria FROM Items WHERE id_categoria IS NOT NULL;
```

### 1.4 Trigger — mínimo 1 categoría para productos

```sql
CREATE OR REPLACE FUNCTION fn_check_item_categorias()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Fires AFTER DELETE on Item_Categorias
  IF (SELECT tipo FROM Items WHERE id_item = OLD.id_item) = 'producto' THEN
    IF NOT EXISTS (
      SELECT 1 FROM Item_Categorias WHERE id_item = OLD.id_item
    ) THEN
      RAISE EXCEPTION 'Un producto debe tener al menos una categoría (id_item=%)', OLD.id_item;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_item_categorias_check
  AFTER DELETE ON Item_Categorias
  FOR EACH ROW EXECUTE FUNCTION fn_check_item_categorias();
```

> El INSERT está implícitamente cubierto: no se puede insertar un producto sin luego insertar al menos una fila en `Item_Categorias`. El servicio de backend lo enforcea al crear; el trigger lo enforcea al eliminar categorías.

### 1.5 Vistas afectadas

| Vista | Cambio requerido |
|-------|-----------------|
| `v_propietario_empleados_global` | Reemplazar `STRING_AGG(r.nombre_rol, ',')` de `Empleado_Roles JOIN Roles` por `JOIN Roles r ON e.id_rol = r.id_rol` — columna pasa de texto agregado a campo escalar |
| `v_gerente_empleados` | Mismo cambio — `rol` pasa a ser escalar, no array |
| `v_vendedor_catalogo` | Reemplazar `JOIN Categorias c ON i.id_categoria = c.id_categoria` por `LEFT JOIN Item_Categorias ic ON i.id_item = ic.id_item LEFT JOIN Categorias c ON ic.id_categoria = c.id_categoria` + `STRING_AGG(c.nombre_categoria, ', ')` |
| `v_abastecedor_stock_actual` | Mismo cambio de categorías que `v_vendedor_catalogo` |
| `v_abastecedor_stock_critico` | Mismo cambio de categorías |

---

## Section 2 — NestJS Changes

### 2.1 JWT Payload Interface

```typescript
// auth/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: number;
  id_sede: number;
  rol: string;      // era: roles: string[]
  nombre: string;
}
```

### 2.2 Entidad `Rol` (crear si no existe)

```typescript
// auth/entities/rol.entity.ts
@Entity('Roles')
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  id_rol: number;

  @Column({ name: 'nombre_rol', length: 80 })
  nombre_rol: string;
}
```

### 2.3 `empleado.entity.ts`

```typescript
// Reemplazar @ManyToMany con Empleado_Roles:
@ManyToOne(() => Rol, { eager: true })
@JoinColumn({ name: 'id_rol' })
rol: Rol;

@Column({ name: 'id_rol' })
id_rol: number;
```

### 2.4 `auth.service.ts` — login query

```typescript
// Antes: JOIN Empleado_Roles + Roles
// Después:
const empleado = await this.empleadoRepo
  .createQueryBuilder('e')
  .leftJoinAndSelect('e.rol', 'r')
  .where('e.nro_documento = :doc', { doc: dto.nro_documento })
  .getOne();

// JWT sign:
const payload: JwtPayload = {
  sub: empleado.id_empleado,
  id_sede: empleado.id_sede,
  rol: empleado.rol.nombre_rol,
  nombre: empleado.nombre_completo,
};
```

### 2.5 `jwt.strategy.ts`

```typescript
// validate() retorna:
return {
  id_empleado: payload.sub,
  id_sede: payload.id_sede,
  rol: payload.rol,       // era: roles: payload.roles
  nombre: payload.nombre,
};
```

### 2.6 `roles.guard.ts`

```typescript
// Antes: payload.roles.includes(requiredRole)
// Después:
const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
if (!requiredRoles) return true;
return requiredRoles.includes(request.user.rol);
```

### 2.7 `current-user.decorator.ts` — tipo actualizado

```typescript
export interface CurrentUserPayload {
  id_empleado: number;
  id_sede: number;
  rol: string;         // era: roles: string[]
  nombre: string;
}
```

### 2.8 Items entity — `@ManyToMany` categorías

```typescript
// catalogo/entities/item.entity.ts (o donde esté definida)
@ManyToMany(() => Categoria, { eager: false })
@JoinTable({
  name: 'Item_Categorias',
  joinColumn: { name: 'id_item' },
  inverseJoinColumn: { name: 'id_categoria' },
})
categorias: Categoria[];
```

Eliminar:

```typescript
// Quitar:
@ManyToOne(() => Categoria)
@JoinColumn({ name: 'id_categoria' })
categoria: Categoria;
```

### 2.9 Catalogo service — queries de items

- Agregar `.leftJoinAndSelect('item.categorias', 'cat')` donde se listen items.
- Respuesta incluye `categorias: [{ id_categoria, nombre_categoria }]` en lugar de `categoria: {...}`.
- Filtro `?categoria=<id>` cambia de `WHERE i.id_categoria = :id` a `WHERE cat.id_categoria = :id`.

### 2.10 Sprint 2 — `CreateEmpleadoDto`

```typescript
// Reemplazar campo cargo: string por:
@IsInt()
id_rol: number;
```

---

## Section 3 — Plan Document Updates

| Documento | Sección | Cambio |
|-----------|---------|--------|
| `CONTEXTO_TESIS.md` | §6 JWT Payload | `roles: string[]` → `rol: string` |
| `CONTEXTO_TESIS.md` | §7.3 Empleados | Columna `id_rol FK → Roles`; drop `Empleado_Roles` |
| `CONTEXTO_TESIS.md` | §7.4 Items | Quitar `id_categoria`; añadir tabla `Item_Categorias` |
| `CONTEXTO_TESIS.md` | §9 Triggers | Añadir `trg_item_categorias_check` |
| `CONTEXTO_TESIS.md` | §10 Vistas | Actualizar descripciones de vistas afectadas |
| `plans/sprint-1/admin.md` (Sprint 2) | `CreateEmpleadoDto` | `cargo: string` → `id_rol: number` |
| `plans/sprint-3/frontend.md` | Items en UI | `categoria: string` → `categorias: string[]` |

---

## Migration Order

```
1. DB-Tables.sql       ← ADD id_rol, DROP Empleado_Roles, DROP id_categoria, CREATE Item_Categorias
2. DB-Triggers.sql     ← ADD trg_item_categorias_check
3. DB-Views.sql        ← UPDATE vistas afectadas
4. DB-Inserts.sql      ← Seeds con id_rol directo, Item_Categorias rows
5. NestJS entities     ← empleado.entity.ts, item.entity.ts
6. NestJS auth         ← jwt-payload, strategy, guard, decorator
7. NestJS services     ← auth.service, catalogo.service
8. Plan docs           ← CONTEXTO_TESIS.md, sprint plans
```

---

## Impact on Existing Sprint 1 Code

| Módulo | Impacto |
|--------|---------|
| `auth` | Login query cambia; JWT firma `rol` no `roles`; guard cambia |
| `catalogo` | Item entity añade `@ManyToMany`; service añade join |
| `clientes` | Sin impacto |
| `ventas` | Sin impacto |
| `pagos` | Sin impacto |
| `boletas` | Sin impacto |
| Frontend `LoginCard` | `roles[0]` → `rol` para redirect post-login |

---

## Constraints Preserved

- `Promociones.id_categoria` — **sin cambio**. Las promociones siguen referenciando una sola categoría directamente.
- `precio_venta >= precio_compra` constraint en Items — sin cambio.
- `Boletas`, `Pagos`, `Garantias` XOR constraints — sin cambio.
