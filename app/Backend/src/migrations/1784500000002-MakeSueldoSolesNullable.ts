import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSueldoSolesNullable1784500000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE empleados ALTER COLUMN sueldo_soles DROP NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE empleados SET sueldo_soles = 0 WHERE sueldo_soles IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE empleados ALTER COLUMN sueldo_soles SET NOT NULL`,
    );
  }
}
