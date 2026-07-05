import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipoServicioToReparaciones1782500000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reparaciones
        ADD COLUMN IF NOT EXISTS tipo_servicio VARCHAR(20)
        CHECK (tipo_servicio IN ('software', 'hardware', 'mixto'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reparaciones DROP COLUMN IF EXISTS tipo_servicio
    `);
  }
}
