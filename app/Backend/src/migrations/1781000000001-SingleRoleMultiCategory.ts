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
        DROP COLUMN IF EXISTS id_categoria CASCADE
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
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_item_categorias_check ON item_categorias CASCADE`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_check_item_categorias CASCADE`,
    );

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
