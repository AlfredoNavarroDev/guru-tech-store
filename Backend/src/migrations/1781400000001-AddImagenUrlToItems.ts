import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImagenUrlToItems1781400000001 implements MigrationInterface {
  name = 'AddImagenUrlToItems1781400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE items
        ADD COLUMN imagen_url varchar(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE items
        DROP COLUMN IF EXISTS imagen_url
    `);
  }
}
