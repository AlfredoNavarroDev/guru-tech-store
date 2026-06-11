# DB Schema Refactor — Single Role + Multi-Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the DB schema so each employee has exactly one role (drop `Empleado_Roles` N:M) and each product can belong to multiple categories (replace `Items.id_categoria` with `Item_Categorias` junction table).

**Architecture:** New TypeORM migration adds `id_rol` to `empleados` and creates `item_categorias`, a second migration updates the 4 affected views. Auth service switches from array-based roles to scalar `rol`. Catalogo service updates the categoria filter to join `item_categorias`.

**Tech Stack:** NestJS · TypeORM migrations (QueryRunner) · PostgreSQL · Next.js 14

---

## File Map

| Action | File |
|--------|------|
| Create | `Backend/src/migrations/1781000000001-SingleRoleMultiCategory.ts` |
| Create | `Backend/src/migrations/1781000000002-UpdateViewsForRefactor.ts` |
| Modify | `Backend/src/database/seed-02-empleados.ts` |
| Modify | `Backend/src/database/seed-04-catalogo.ts` |
| Modify | `Backend/src/auth/interfaces/jwt-payload.interface.ts` |
| Modify | `Backend/src/auth/dto/auth-response.dto.ts` |
| Modify | `Backend/src/auth/auth.service.ts` |
| Modify | `Backend/src/auth/entities/empleado.entity.ts` |
| Create | `Backend/src/auth/entities/rol.entity.ts` |
| Modify | `Backend/src/common/guards/roles.guard.ts` |
| Modify | `Backend/src/catalogo/catalogo.service.ts` |
| Modify | `Backend/src/auth/auth.service.spec.ts` |
| Modify | `Backend/src/catalogo/catalogo.service.spec.ts` |
| Modify | `DB/DB-Tables.sql` |
| Modify | `DB/DB-Views.sql` |
| Modify | `DB/DB-Triggers.sql` |
| Modify | `plans/CONTEXTO_TESIS.md` |
| Modify | `plans/sprint-1/admin.md` |
| Modify | `plans/sprint-3/frontend.md` |
| Modify | `Frontend/lib/api/auth.ts` |
| Modify | `Frontend/components/login/LoginCard.tsx` |

---

## Task 1: Update auth.service.spec.ts — write failing tests

**Files:**
- Modify: `Backend/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Find and replace the mock for `dataSource.query` in the login success test**

In the `login` describe block, find the test `'returns token and employee data on success'`. The mock currently chains two `mockResolvedValueOnce`:
```typescript
dataSource.query
  .mockResolvedValueOnce([{ nombre_rol: 'vendedor' }])  // ← getRoles call
  .mockResolvedValueOnce([{ nombre: 'Sede Central' }]);
```
Change to a single call (`getEmpleadoData` returns one row with both fields):
```typescript
dataSource.query
  .mockResolvedValueOnce([{ nombre_rol: 'vendedor', nombre_sede: 'Sede Central' }]);
```

- [ ] **Step 2: Update the expected result in the same test**

The test currently expects:
```typescript
expect(result).toEqual({
  access_token: 'jwt-token',
  refresh_token: 'refresh-jwt-token',
  nombre: 'Juan Perez',
  roles: ['vendedor'],
  id_sede: 2,
  sede: expect.any(String),
});
```
Change `roles: ['vendedor']` to `rol: 'vendedor'`:
```typescript
expect(result).toEqual({
  access_token: 'jwt-token',
  refresh_token: 'refresh-jwt-token',
  nombre: 'Juan Perez',
  rol: 'vendedor',
  id_sede: 2,
  sede: expect.any(String),
});
```

- [ ] **Step 3: Update the JWT payload assertion**

Find the assertion that checks what was passed to `jwtService.sign`. Change:
```typescript
expect(jwtService.sign).toHaveBeenCalledWith(
  expect.objectContaining({ roles: ['vendedor'] }),
);
```
to:
```typescript
expect(jwtService.sign).toHaveBeenCalledWith(
  expect.objectContaining({ rol: 'vendedor' }),
);
```

- [ ] **Step 4: Find and update the refresh test similarly**

In the `refresh` describe block, update any mock/expectation that references `roles: ['vendedor']` → `rol: 'vendedor'`. Apply the same dataSource mock change.

- [ ] **Step 5: Run auth service tests to confirm they fail**

```bash
cd /path/to/Backend && npx jest auth.service.spec --no-coverage 2>&1 | tail -20
```
Expected: FAIL — `roles` property not found / received `rol`.

---

## Task 2: Update catalogo.service.spec.ts — write failing test

**Files:**
- Modify: `Backend/src/catalogo/catalogo.service.spec.ts`

- [ ] **Step 1: Add a new test for categoria filter using Item_Categorias**

Find the existing test for categoria filter (something like `'appends categoria filter'`). Locate the assertion that checks the SQL. Change:
```typescript
expect(sql).toContain('i.id_categoria = $2');
```
to:
```typescript
expect(sql).toContain('ic.id_categoria = $2');
```

Also verify the JOIN changed from `JOIN Items i` to `JOIN Item_Categorias ic`:
```typescript
expect(sql).toContain('JOIN Item_Categorias ic');
```

- [ ] **Step 2: Run catalogo service tests to confirm failure**

```bash
cd /path/to/Backend && npx jest catalogo.service.spec --no-coverage 2>&1 | tail -20
```
Expected: FAIL — SQL assertion mismatch.

---

## Task 3: Create migration 1781000000001 — schema change

**Files:**
- Create: `Backend/src/migrations/1781000000001-SingleRoleMultiCategory.ts`

- [ ] **Step 1: Create the file with this exact content**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SingleRoleMultiCategory1781000000001 implements MigrationInterface {
  name = 'SingleRoleMultiCategory1781000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add id_rol column to empleados (nullable first for data migration)
    await queryRunner.query(`
      ALTER TABLE empleados
        ADD COLUMN id_rol INT REFERENCES roles(id_rol)
    `);

    // 2. Migrate data: copy role from Empleado_Roles (take first if somehow multiple)
    await queryRunner.query(`
      UPDATE empleados e
      SET id_rol = (
        SELECT id_rol FROM empleado_roles er
        WHERE er.id_empleado = e.id_empleado
        LIMIT 1
      )
    `);

    // 3. Make id_rol NOT NULL now that data is migrated
    await queryRunner.query(`
      ALTER TABLE empleados
        ALTER COLUMN id_rol SET NOT NULL
    `);

    // 4. Drop Empleado_Roles FK constraints then table
    await queryRunner.query(`DROP TABLE IF EXISTS empleado_roles CASCADE`);

    // 5. Create Item_Categorias junction table
    await queryRunner.query(`
      CREATE TABLE item_categorias (
        id_item      INT NOT NULL REFERENCES items(id_item) ON DELETE CASCADE,
        id_categoria INT NOT NULL REFERENCES categorias(id_categoria) ON DELETE RESTRICT,
        PRIMARY KEY (id_item, id_categoria)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_item_categorias_item      ON item_categorias(id_item)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_item_categorias_categoria ON item_categorias(id_categoria)
    `);

    // 6. Migrate data: copy existing id_categoria from items to item_categorias
    await queryRunner.query(`
      INSERT INTO item_categorias (id_item, id_categoria)
      SELECT id_item, id_categoria FROM items WHERE id_categoria IS NOT NULL
    `);

    // 7. Drop id_categoria FK + constraint + column from Items
    await queryRunner.query(`
      ALTER TABLE items
        DROP CONSTRAINT IF EXISTS fk_items_categoria,
        DROP CONSTRAINT IF EXISTS chk_categoria_solo_producto,
        DROP COLUMN IF EXISTS id_categoria
    `);

    // 8. Add trigger to enforce min 1 category for productos
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_check_item_categorias()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF (SELECT tipo FROM items WHERE id_item = OLD.id_item) = 'producto' THEN
          IF NOT EXISTS (
            SELECT 1 FROM item_categorias WHERE id_item = OLD.id_item
          ) THEN
            RAISE EXCEPTION 'Un producto debe tener al menos una categoría (id_item=%)', OLD.id_item;
          END IF;
        END IF;
        RETURN OLD;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_item_categorias_check
        AFTER DELETE ON item_categorias
        FOR EACH ROW EXECUTE FUNCTION fn_check_item_categorias()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove trigger + function
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_item_categorias_check ON item_categorias CASCADE`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_check_item_categorias CASCADE`);

    // Restore id_categoria on Items (nullable — can't restore constraint without data)
    await queryRunner.query(`ALTER TABLE items ADD COLUMN id_categoria INT`);
    await queryRunner.query(`
      UPDATE items i
      SET id_categoria = (
        SELECT id_categoria FROM item_categorias ic
        WHERE ic.id_item = i.id_item
        LIMIT 1
      )
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS item_categorias CASCADE`);

    // Restore Empleado_Roles
    await queryRunner.query(`
      CREATE TABLE empleado_roles (
        id_empleado INT NOT NULL,
        id_rol      INT NOT NULL,
        PRIMARY KEY (id_empleado, id_rol)
      )
    `);
    await queryRunner.query(`
      INSERT INTO empleado_roles (id_empleado, id_rol)
      SELECT id_empleado, id_rol FROM empleados WHERE id_rol IS NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE empleados DROP COLUMN id_rol`);
  }
}
```

---

## Task 4: Create migration 1781000000002 — update views

**Files:**
- Create: `Backend/src/migrations/1781000000002-UpdateViewsForRefactor.ts`

- [ ] **Step 1: Create the file with this exact content**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateViewsForRefactor1781000000002 implements MigrationInterface {
  name = 'UpdateViewsForRefactor1781000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // v_propietario_empleados_global — roles (STRING_AGG) → rol (scalar)
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_propietario_empleados_global AS
      SELECT
          e.id_empleado,
          s.id_sede,
          s.nombre                  AS sede,
          e.nombre_completo,
          e.tipo_documento,
          e.nro_documento,
          e.telefono,
          e.estado,
          e.sueldo_semanal_soles,
          e.es_extranjero,
          r.nombre_rol              AS rol,
          e.created_by,
          ec.nombre_completo        AS creado_por,
          e.created_at
      FROM Empleados e
      LEFT JOIN Sedes s      ON s.id_sede      = e.id_sede
      LEFT JOIN Roles r      ON r.id_rol       = e.id_rol
      LEFT JOIN Empleados ec ON ec.id_empleado = e.created_by
    `);

    // v_gerente_empleados — roles (STRING_AGG) → rol (scalar)
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_gerente_empleados AS
      SELECT
          e.id_empleado,
          e.id_sede,
          s.nombre                  AS sede,
          e.nombre_completo,
          e.tipo_documento,
          e.nro_documento,
          e.telefono,
          e.estado,
          e.sueldo_semanal_soles,
          r.nombre_rol              AS rol,
          e.created_by,
          ec.nombre_completo        AS creado_por,
          e.created_at
      FROM Empleados e
      JOIN  Sedes s      ON s.id_sede      = e.id_sede
      LEFT JOIN Roles r  ON r.id_rol       = e.id_rol
      LEFT JOIN Empleados ec ON ec.id_empleado = e.created_by
    `);

    // v_vendedor_catalogo — Items.id_categoria → Item_Categorias
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_catalogo AS
      WITH promo_vigente AS (
          SELECT
              COALESCE(pr.id_item_afectado, ic.id_item) AS id_item,
              pr.nombre          AS promo_nombre,
              pr.tipo_descuento  AS promo_tipo,
              pr.valor_descuento AS promo_valor
          FROM Promociones pr
          LEFT JOIN Item_Categorias ic ON ic.id_categoria = pr.id_categoria_afectada
          WHERE pr.estado = 'activa'
            AND (pr.fecha_inicio IS NULL OR pr.fecha_inicio <= CURRENT_DATE)
            AND (pr.fecha_fin    IS NULL OR pr.fecha_fin    >= CURRENT_DATE)
      ),
      categorias_por_item AS (
          SELECT ic.id_item,
                 STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria) AS categorias
          FROM Item_Categorias ic
          JOIN Categorias cat ON cat.id_categoria = ic.id_categoria
          GROUP BY ic.id_item
      )
      SELECT
          i.id_item,
          i.sku,
          i.nombre                  AS producto,
          m.nombre                  AS marca,
          ci.categorias             AS categoria,
          i.modelo,
          i.precio_venta_actual,
          inv.id_sede,
          s.nombre                  AS sede,
          inv.cantidad_actual        AS stock_disponible,
          pv.promo_nombre,
          pv.promo_tipo,
          pv.promo_valor,
          CASE
              WHEN pv.promo_tipo = 'porcentaje'
                  THEN ROUND(i.precio_venta_actual * (1 - pv.promo_valor / 100), 2)
              WHEN pv.promo_tipo = 'monto_fijo'
                  THEN GREATEST(i.precio_venta_actual - pv.promo_valor, 0)
              ELSE i.precio_venta_actual
          END                       AS precio_con_descuento
      FROM Items i
      JOIN  Inventario_Sedes inv   ON inv.id_item = i.id_item
      JOIN  Sedes s                ON s.id_sede   = inv.id_sede
      LEFT JOIN Marcas m           ON m.id_marca  = i.id_marca
      LEFT JOIN categorias_por_item ci ON ci.id_item = i.id_item
      LEFT JOIN promo_vigente pv   ON pv.id_item  = i.id_item
      WHERE i.tipo = 'producto'
    `);

    // v_abastecedor_stock_actual — Items.id_categoria → Item_Categorias
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_abastecedor_stock_actual AS
      WITH categorias_por_item AS (
          SELECT ic.id_item,
                 STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria) AS categorias
          FROM Item_Categorias ic
          JOIN Categorias cat ON cat.id_categoria = ic.id_categoria
          GROUP BY ic.id_item
      )
      SELECT
          inv.id_inventario,
          inv.id_sede,
          s.nombre                                        AS sede,
          i.id_item,
          i.sku,
          i.nombre                                        AS item,
          i.tipo,
          m.nombre                                        AS marca,
          ci.categorias                                   AS categoria,
          i.modelo,
          i.calidad,
          inv.cantidad_actual,
          inv.stock_minimo,
          (inv.cantidad_actual - inv.stock_minimo)        AS diferencia_stock,
          (inv.cantidad_actual <= inv.stock_minimo)       AS requiere_reposicion,
          i.precio_compra_actual
      FROM Inventario_Sedes inv
      JOIN  Sedes s                ON s.id_sede  = inv.id_sede
      JOIN  Items i                ON i.id_item  = inv.id_item
      LEFT JOIN Marcas m           ON m.id_marca = i.id_marca
      LEFT JOIN categorias_por_item ci ON ci.id_item = i.id_item
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore views to their pre-refactor definitions
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_propietario_empleados_global AS
      SELECT
          e.id_empleado,
          s.id_sede,
          s.nombre                                                    AS sede,
          e.nombre_completo,
          e.tipo_documento,
          e.nro_documento,
          e.telefono,
          e.estado,
          e.sueldo_semanal_soles,
          e.es_extranjero,
          STRING_AGG(r.nombre_rol, ', ' ORDER BY r.nombre_rol)        AS roles,
          e.created_by,
          ec.nombre_completo                                          AS creado_por,
          e.created_at
      FROM Empleados e
      LEFT JOIN Sedes s           ON s.id_sede      = e.id_sede
      LEFT JOIN Empleado_Roles er ON er.id_empleado = e.id_empleado
      LEFT JOIN Roles r           ON r.id_rol       = er.id_rol
      LEFT JOIN Empleados ec      ON ec.id_empleado = e.created_by
      GROUP BY e.id_empleado, s.id_sede, s.nombre,
               e.nombre_completo, e.tipo_documento, e.nro_documento,
               e.telefono, e.estado, e.sueldo_semanal_soles, e.es_extranjero,
               e.created_by, ec.nombre_completo, e.created_at
    `);
    // (other view rollbacks omitted — run down() of migration 1781000000001 first)
  }
}
```

---

## Task 5: Update seeds

**Files:**
- Modify: `Backend/src/database/seed-02-empleados.ts`
- Modify: `Backend/src/database/seed-04-catalogo.ts`

- [ ] **Step 1: In seed-02-empleados.ts, replace the Empleado_Roles INSERT**

Find:
```typescript
console.log('  Insertando Empleado_Roles...');
await qr.query(`
  INSERT INTO Empleado_Roles (id_empleado, id_rol) VALUES
  (1, 1),  -- Roberto → propietario
  (2, 3),  -- Luis    → vendedor
  (3, 3),  -- Carla   → vendedor
  (4, 3)   -- Jorge   → vendedor (suspendido, igual tiene rol asignado)
`);
console.log('  OK - roles asignados');
```
Replace with:
```typescript
console.log('  Asignando id_rol en empleados...');
await qr.query(`
  UPDATE empleados SET id_rol = 1 WHERE id_empleado = 1;  -- Roberto → propietario
  UPDATE empleados SET id_rol = 3 WHERE id_empleado = 2;  -- Luis    → vendedor
  UPDATE empleados SET id_rol = 3 WHERE id_empleado = 3;  -- Carla   → vendedor
  UPDATE empleados SET id_rol = 3 WHERE id_empleado = 4;  -- Jorge   → vendedor (suspendido)
`);
console.log('  OK - roles asignados directamente en empleados');
```

- [ ] **Step 2: In seed-04-catalogo.ts, remove id_categoria from Items INSERT**

Find the INSERT INTO Items block:
```sql
INSERT INTO Items
  (id_item, tipo, sku, nombre, id_marca, id_categoria, modelo,
   precio_compra_actual, precio_venta_actual)
VALUES
  (1, 'producto', 'PRD-001', 'Cable USB-C 2m',
      3, 1, NULL,          8.50,  25.00),
  ...
```
Replace with (remove `id_categoria` column and its values):
```typescript
await qr.query(`
  INSERT INTO Items
    (id_item, tipo, sku, nombre, id_marca, modelo,
     precio_compra_actual, precio_venta_actual)
  VALUES
    (1, 'producto', 'PRD-001', 'Cable USB-C 2m',      3, NULL, 8.50,  25.00),
    (2, 'producto', 'PRD-002', 'Cargador 20W USB-C',  3, NULL, 22.00, 55.00),
    (3, 'producto', 'PRD-003', 'Funda silicona iPhone 15',  2, 'iPhone 15',  12.00, 35.00),
    (4, 'producto', 'PRD-004', 'Funda Samsung Galaxy S24',  1, 'Galaxy S24', 10.00, 30.00),
    (5, 'producto', 'PRD-005', 'Auriculares Bluetooth', 3, NULL, 35.00, 85.00),
    (6, 'producto', 'PRD-006', 'Power Bank 10000mAh',  3, NULL, 45.00, 110.00),
    (7, 'producto', 'PRD-007', 'Soporte celular para auto',  5, NULL, 10.00, 28.00),
    (8, 'producto', 'PRD-008', 'Limpiador de pantalla 100ml', 5, NULL, 5.00, 15.00),
    (9, 'producto', 'PRD-009', 'Memoria USB 32GB',      4, NULL, 8.00,  22.00)
`);
```

- [ ] **Step 3: Add Item_Categorias INSERT after the Items INSERT in seed-04-catalogo.ts**

Immediately after the Items INSERT, add:
```typescript
console.log('  Insertando Item_Categorias...');
await qr.query(`
  INSERT INTO item_categorias (id_item, id_categoria) VALUES
  -- Cables (cat 1)
  (1, 1),
  -- Cargadores (cat 1) — Cable USB-C 2m also in Cargadores
  (2, 1),
  -- Fundas (cat 2)
  (3, 2),
  (4, 2),
  -- Auriculares (cat 3)
  (5, 3),
  -- Accesorios (cat 4)
  (6, 4),
  (7, 4),
  (8, 4),
  (9, 4)
`);
console.log('  OK - item_categorias asignadas');
```

> Note: The category IDs (1=Cables/Cargadores, 2=Fundas, 3=Auriculares, 4=Accesorios) must match the Categorias seed from seed-01-master. Verify the correct IDs before running.

---

## Task 6: Update JWT payload interface + AuthResponseDto

**Files:**
- Modify: `Backend/src/auth/interfaces/jwt-payload.interface.ts`
- Modify: `Backend/src/auth/dto/auth-response.dto.ts`

- [ ] **Step 1: Update jwt-payload.interface.ts**

Replace the full file content:
```typescript
// Payload del JWT con información mínima para autorizar sin consultar BD.
export interface JwtPayload {
  // id_empleado (RFC 7519: 'sub' = subject).
  sub: number;

  // Sede del empleado para filtrado multi-sede.
  id_sede: number;

  // Rol único del empleado para guards (@Roles) sin consultar BD.
  rol: string;

  // Nombre para UI sin llamada extra.
  nombre: string;
}
```

- [ ] **Step 2: Update auth-response.dto.ts**

Replace `roles: string[]` field with `rol: string`:
```typescript
  // Rol del empleado para que el frontend renderice menú.
  @ApiProperty({ description: 'Rol del empleado' })
  rol: string;
```
Remove the line `roles: string[];` and its `@ApiProperty`.

---

## Task 7: Update AuthService

**Files:**
- Modify: `Backend/src/auth/auth.service.ts`

- [ ] **Step 1: Replace the getRoles private method with getRol**

Find:
```typescript
private async getRoles(id_empleado: number): Promise<string[]> {
  const rows = await this.dataSource.query<{ nombre_rol: string }[]>(
    `SELECT r.nombre_rol FROM Empleado_Roles er
     JOIN Roles r ON r.id_rol = er.id_rol
     WHERE er.id_empleado = $1`,
    [id_empleado],
  );
  return rows.map((r) => r.nombre_rol);
}
```
Replace with:
```typescript
private async getEmpleadoData(
  id_empleado: number,
): Promise<{ rol: string; sede: string }> {
  const rows = await this.dataSource.query<{ nombre_rol: string; nombre_sede: string }[]>(
    `SELECT r.nombre_rol, COALESCE(s.nombre, 'Sin sede') AS nombre_sede
     FROM Empleados e
     JOIN  Roles r  ON r.id_rol  = e.id_rol
     LEFT JOIN Sedes s ON s.id_sede = e.id_sede
     WHERE e.id_empleado = $1`,
    [id_empleado],
  );
  if (!rows.length) return { rol: 'desconocido', sede: 'Sin sede' };
  return { rol: rows[0].nombre_rol, sede: rows[0].nombre_sede };
}
```

- [ ] **Step 2: Update the login method to use getEmpleadoData**

Find the `login` method. Replace:
```typescript
const roles = await this.getRoles(empleado.id_empleado);

const sedeRows = await this.dataSource.query<{ nombre: string }[]>(
  `SELECT nombre FROM Sedes WHERE id_sede = $1`,
  [empleado.id_sede],
);
const sedeNombre = sedeRows.length > 0 ? sedeRows[0].nombre : 'Sin sede';

const payload: JwtPayload = {
  sub: empleado.id_empleado,
  id_sede: empleado.id_sede!,
  roles,
  nombre: empleado.nombre_completo,
};
```
With:
```typescript
const { rol, sede: sedeNombre } = await this.getEmpleadoData(empleado.id_empleado);

const payload: JwtPayload = {
  sub: empleado.id_empleado,
  id_sede: empleado.id_sede!,
  rol,
  nombre: empleado.nombre_completo,
};
```

Then update the return:
```typescript
return {
  access_token,
  refresh_token,
  nombre: empleado.nombre_completo,
  rol,
  id_sede: empleado.id_sede!,
  sede: sedeNombre,
};
```

- [ ] **Step 3: Update the refresh method identically**

In the `refresh` method, find the same pattern and apply the same replacement:
```typescript
// Before
const roles = await this.getRoles(empleado.id_empleado);
const sedeRows = await this.dataSource.query<...>(`SELECT nombre FROM Sedes ...`, [...]);
const sedeNombre = sedeRows.length > 0 ? sedeRows[0].nombre : 'Sin sede';
const payload: JwtPayload = { sub: ..., id_sede: ..., roles, nombre: ... };
// ...
return { ..., roles, ..., sede: sedeNombre };

// After
const { rol, sede: sedeNombre } = await this.getEmpleadoData(empleado.id_empleado);
const payload: JwtPayload = { sub: ..., id_sede: ..., rol, nombre: ... };
// ...
return { ..., rol, ..., sede: sedeNombre };
```

---

## Task 8: Update Empleado entity + create Rol entity

**Files:**
- Create: `Backend/src/auth/entities/rol.entity.ts`
- Modify: `Backend/src/auth/entities/empleado.entity.ts`

- [ ] **Step 1: Create rol.entity.ts**

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  id_rol: number;

  @Column({ name: 'nombre_rol', length: 80 })
  nombre_rol: string;
}
```

- [ ] **Step 2: Add id_rol column to empleado.entity.ts**

Add after the `estado` column:
```typescript
@Column({ name: 'id_rol', type: 'int' })
id_rol: number;
```

> **Note on Rol entity registration:** `rol.entity.ts` is created for use in Sprint 2 (EmpleadosModule). It does NOT need to be added to `AuthModule`'s `TypeOrmModule.forFeature()` now — `auth.service.ts` uses `dataSource.query()` directly. Add it to the module that injects `Repository<Rol>` (Sprint 2).

---

## Task 9: Update RolesGuard

**Files:**
- Modify: `Backend/src/common/guards/roles.guard.ts`

- [ ] **Step 1: Replace the canActivate logic**

Find:
```typescript
return required.some((role) => user?.roles?.includes(role));
```
Replace with:
```typescript
return required.includes(user?.rol);
```

The full `canActivate` body becomes:
```typescript
canActivate(context: ExecutionContext): boolean {
  const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  if (!required || required.length === 0) return true;

  const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
  return required.includes(user?.rol);
}
```

---

## Task 10: Update CatalogoService

**Files:**
- Modify: `Backend/src/catalogo/catalogo.service.ts`

- [ ] **Step 1: Replace the categoria filter branch**

Find:
```typescript
if (query.categoria !== undefined) {
  // JOIN a Items necesario para filtrar por id_categoria.
  sql = `SELECT vc.* FROM v_vendedor_catalogo vc
         JOIN Items i ON i.id_item = vc.id_item
         WHERE vc.id_sede = $1 AND i.id_categoria = $${idx++}`;
  params.push(query.categoria);
  if (query.marca !== undefined) {
    sql += ` AND i.id_marca = $${idx++}`;
    params.push(query.marca);
  }
```
Replace with:
```typescript
if (query.categoria !== undefined) {
  // JOIN a Item_Categorias para filtrar por categoría (relación N:M ahora).
  sql = `SELECT vc.* FROM v_vendedor_catalogo vc
         JOIN Item_Categorias ic ON ic.id_item = vc.id_item AND ic.id_categoria = $${idx++}
         WHERE vc.id_sede = $1`;
  params.push(query.categoria);
  if (query.marca !== undefined) {
    sql += ` AND EXISTS (
      SELECT 1 FROM Items __i WHERE __i.id_item = vc.id_item AND __i.id_marca = $${idx++}
    )`;
    params.push(query.marca);
  }
```

---

## Task 11: Run all backend tests

- [ ] **Step 1: Run the full test suite**

```bash
cd Backend && npx jest --no-coverage 2>&1 | tail -30
```
Expected: All tests PASS. If auth.service.spec or catalogo.service.spec still fail, diagnose from the error message.

---

## Task 12: Update DB SQL files

**Files:**
- Modify: `DB/DB-Tables.sql`
- Modify: `DB/DB-Views.sql`
- Modify: `DB/DB-Triggers.sql`

These files are the source-of-truth for manual DB recreation. Sync them with the migration changes.

- [ ] **Step 1: Update DB-Tables.sql**

Find the `Empleado_Roles` table block:
```sql
CREATE TABLE Empleado_Roles (
  id_empleado int NOT NULL,
  id_rol int NOT NULL,
  PRIMARY KEY (id_empleado, id_rol)
);
```
Delete this block entirely.

Find the `Empleados` table CREATE and add `id_rol` column:
```sql
id_rol INT NOT NULL REFERENCES Roles(id_rol),
```
Add it after the `estado` column definition.

Find the `Items` CREATE TABLE and remove:
```sql
id_categoria int,
```
and the constraint:
```sql
CONSTRAINT chk_categoria_solo_producto CHECK (id_categoria IS NOT NULL OR tipo = 'repuesto')
```

Add the new `Item_Categorias` table after the `Items` table:
```sql
CREATE TABLE Item_Categorias (
  id_item      INT NOT NULL REFERENCES Items(id_item) ON DELETE CASCADE,
  id_categoria INT NOT NULL REFERENCES Categorias(id_categoria) ON DELETE RESTRICT,
  PRIMARY KEY (id_item, id_categoria)
);

CREATE INDEX idx_item_categorias_item      ON Item_Categorias(id_item);
CREATE INDEX idx_item_categorias_categoria ON Item_Categorias(id_categoria);
```

Find and remove the FK for `Items.id_categoria`:
```sql
ALTER TABLE Items ADD FOREIGN KEY (id_categoria) REFERENCES Categorias (id_categoria);
```

Find and remove the FK blocks for `Empleado_Roles`:
```sql
ALTER TABLE Empleado_Roles ADD CONSTRAINT fk_emproles_empleado ...
ALTER TABLE Empleado_Roles ADD CONSTRAINT fk_emproles_rol ...
```

Add FK for `Empleados.id_rol`:
```sql
ALTER TABLE Empleados ADD CONSTRAINT fk_empleados_rol FOREIGN KEY (id_rol) REFERENCES Roles(id_rol);
```

- [ ] **Step 2: Update DB-Views.sql**

Apply the same 4 view replacements from migration 1781000000002:
- `v_propietario_empleados_global` — remove GROUP BY, remove `Empleado_Roles` join, replace `STRING_AGG(roles)` with `r.nombre_rol AS rol`
- `v_gerente_empleados` — same
- `v_vendedor_catalogo` — add `categorias_por_item` CTE, replace direct `id_categoria` join
- `v_abastecedor_stock_actual` — add `categorias_por_item` CTE

- [ ] **Step 3: Update DB-Triggers.sql**

Add the trigger function + trigger from migration step 8:
```sql
CREATE OR REPLACE FUNCTION fn_check_item_categorias()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT tipo FROM items WHERE id_item = OLD.id_item) = 'producto' THEN
    IF NOT EXISTS (
      SELECT 1 FROM item_categorias WHERE id_item = OLD.id_item
    ) THEN
      RAISE EXCEPTION 'Un producto debe tener al menos una categoría (id_item=%)', OLD.id_item;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_item_categorias_check
  AFTER DELETE ON item_categorias
  FOR EACH ROW EXECUTE FUNCTION fn_check_item_categorias();
```

---

## Task 13: Update plan docs

**Files:**
- Modify: `plans/CONTEXTO_TESIS.md`
- Modify: `plans/sprint-1/admin.md`
- Modify: `plans/sprint-3/frontend.md`

- [ ] **Step 1: Update CONTEXTO_TESIS.md §6 — JWT payload**

Find:
```typescript
{
  sub: number;        // id_empleado
  id_sede: number;    // sede del empleado
  roles: string[];    // ['vendedor' | 'admin' | 'abastecedor' | 'tecnico']
  nombre: string;
}
```
Replace with:
```typescript
{
  sub: number;        // id_empleado
  id_sede: number;    // sede del empleado
  rol: string;        // 'vendedor' | 'admin' | 'abastecedor' | 'tecnico'
  nombre: string;
}
```

Find the Guards section:
```typescript
@Decorator('CurrentUser') → { id_empleado, id_sede, roles }
```
Replace with:
```typescript
@Decorator('CurrentUser') → { id_empleado, id_sede, rol }
```

- [ ] **Step 2: Update CONTEXTO_TESIS.md §7.3 — Empleados table**

Find the `Empleado_Roles` section:
```
#### `Empleado_Roles`
PK compuesta: `(id_empleado, id_rol)` — relación N:M entre Empleados y Roles.
```
Replace with:
```
> `Empleados` incluye columna `id_rol INT NOT NULL FK → Roles`. Un empleado tiene exactamente un rol. La tabla `Empleado_Roles` fue eliminada.
```

- [ ] **Step 3: Update CONTEXTO_TESIS.md §7.4 — Items table**

Find:
```
| `id_categoria` | FK → Categorias |
| CONSTRAINT | id_categoria NOT NULL si tipo='producto' |
```
Remove these rows and add:

```
> La columna `id_categoria` fue eliminada. Usar tabla `Item_Categorias(id_item FK, id_categoria FK, PK compuesta)`. Un producto puede tener N categorías (mínimo 1 — enforceado por trigger `trg_item_categorias_check`).
```

- [ ] **Step 4: Update CONTEXTO_TESIS.md §9 — add trigger entry**

Add to the triggers section:
```
| `trg_item_categorias_check` | AFTER DELETE Item_Categorias | Lanza EXCEPTION si id_item es tipo='producto' y quedaría sin categorías |
```

- [ ] **Step 5: Update plans/sprint-1/admin.md — CreateEmpleadoDto**

Find `cargo: string;` in `CreateEmpleadoDto` and replace with:
```typescript
id_rol: number;            // FK → Roles(id_rol)
```
Remove the comment `// 'vendedor' | 'tecnico' | 'abastecedor' | 'admin'` and update related business rule:
```
3. `id_rol` determina el rol JWT del empleado → validar que exista en tabla Roles.
```

- [ ] **Step 6: Update plans/sprint-3/frontend.md**

Find any reference to `categoria: string` in item response shapes and change to `categoria: string` (comma-separated if multiple, or `categorias: string[]` — the view returns a STRING_AGG so the API still returns a single string).

---

## Task 14: Update Frontend

**Files:**
- Modify: `Frontend/lib/api/auth.ts`
- Modify: `Frontend/components/login/LoginCard.tsx`

- [ ] **Step 1: Update AuthSession interface in lib/api/auth.ts**

Find:
```typescript
export interface AuthSession {
  access_token: string
  nombre: string
  roles: string[]
  id_sede: number
  sede: string
}
```
Replace with:
```typescript
export interface AuthSession {
  access_token: string
  nombre: string
  rol: string
  id_sede: number
  sede: string
}
```

- [ ] **Step 2: Update LoginCard.tsx — add role-based redirect**

Find in `handleSubmit`:
```typescript
saveSession(session, session.refresh_token)
router.push("/dashboard")
```
Replace with:
```typescript
saveSession(session, session.refresh_token)
const roleRoutes: Record<string, string> = {
  vendedor:    '/dashboard',
  admin:       '/dashboard/admin',
  abastecedor: '/dashboard/abastecedor',
  tecnico:     '/dashboard/tecnico',
  propietario: '/dashboard',
  gerente:     '/dashboard',
}
router.push(roleRoutes[session.rol] ?? '/dashboard')
```

- [ ] **Step 3: Verify TypeScript compiles without errors**

```bash
cd Frontend && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```
Expected: no output (zero errors).
