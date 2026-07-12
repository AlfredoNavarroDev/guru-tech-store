import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedByToPromociones1784000000005
  implements MigrationInterface
{
  name = 'AddCreatedByToPromociones1784000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE promociones
        ADD COLUMN IF NOT EXISTS created_by INT REFERENCES empleados(id_empleado)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE promociones DROP COLUMN IF EXISTS created_by
    `);
  }
}
