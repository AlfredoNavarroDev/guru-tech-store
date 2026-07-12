import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminConfigTables1784000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS item_restricciones (
        id_item           INT PRIMARY KEY REFERENCES items(id_item) ON DELETE CASCADE,
        es_no_cambiable   BOOLEAN NOT NULL DEFAULT false,
        max_dias_garantia INT NULL CHECK (max_dias_garantia > 0),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categoria_restricciones (
        id_categoria      INT PRIMARY KEY REFERENCES categorias(id_categoria) ON DELETE CASCADE,
        es_no_cambiable   BOOLEAN NOT NULL DEFAULT false,
        max_dias_garantia INT NULL CHECK (max_dias_garantia > 0),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS config_metas_rol (
        id_rol               INT PRIMARY KEY REFERENCES roles(id_rol) ON DELETE CASCADE,
        meta_ventas_diaria   DECIMAL(12,2) NOT NULL CHECK (meta_ventas_diaria > 0),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS config_metas_rol`);
    await queryRunner.query(`DROP TABLE IF EXISTS categoria_restricciones`);
    await queryRunner.query(`DROP TABLE IF EXISTS item_restricciones`);
  }
}
