import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeFotosEtapaLowercase1782900000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE reparaciones
      SET fotos = (
        SELECT jsonb_agg(
          jsonb_set(f, '{etapa}', to_jsonb(lower(f->>'etapa')))
        )
        FROM jsonb_array_elements(fotos) f
      )
      WHERE fotos IS NOT NULL
        AND fotos != 'null'::jsonb
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(fotos) f
          WHERE f->>'etapa' != lower(f->>'etapa')
        )
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Non-destructive — lowercase etapa values are correct, no rollback needed.
  }
}
