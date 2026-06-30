import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdGarantiaReclamadaToReparaciones1782800000001
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reparaciones
      ADD COLUMN id_garantia_reclamada INT NULL
      REFERENCES garantias(id_garantia) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_reparaciones_garantia_reclamada
        ON reparaciones (id_garantia_reclamada)
        WHERE id_garantia_reclamada IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_reparaciones_garantia_reclamada
    `);
    await queryRunner.query(`
      ALTER TABLE reparaciones
      DROP COLUMN id_garantia_reclamada
    `);
  }
}
