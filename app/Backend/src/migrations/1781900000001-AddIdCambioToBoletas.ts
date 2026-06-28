import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdCambioToBoletas1781900000001 implements MigrationInterface {
  name = 'AddIdCambioToBoletas1781900000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "boletas" ADD COLUMN IF NOT EXISTS "id_cambio" integer REFERENCES "cambios_producto"("id_cambio")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "boletas" DROP COLUMN IF EXISTS "id_cambio"`,
    );
  }
}
