import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFechaEstimadaToReparaciones1781700000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE reparaciones ADD COLUMN IF NOT EXISTS fecha_estimada date`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE reparaciones DROP COLUMN IF EXISTS fecha_estimada`,
    );
  }
}
