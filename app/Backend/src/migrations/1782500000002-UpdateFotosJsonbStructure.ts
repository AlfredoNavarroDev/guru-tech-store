import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFotosJsonbStructure1782500000002
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Convierte cada elemento string[] a {url, etapa, created_at}
    await queryRunner.query(`
      UPDATE reparaciones
      SET fotos = (
        SELECT jsonb_agg(
          jsonb_build_object(
            'url',        elem,
            'etapa',      'Pendiente',
            'created_at', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
        )
        FROM jsonb_array_elements_text(fotos) AS elem
      )
      WHERE fotos IS NOT NULL
        AND jsonb_typeof(fotos) = 'array'
        AND jsonb_array_length(fotos) > 0
        AND jsonb_typeof(fotos->0) = 'string'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Revierte objetos a strings (solo la url)
    await queryRunner.query(`
      UPDATE reparaciones
      SET fotos = (
        SELECT jsonb_agg(elem->>'url')
        FROM jsonb_array_elements(fotos) AS elem
      )
      WHERE fotos IS NOT NULL
        AND jsonb_typeof(fotos) = 'array'
        AND jsonb_array_length(fotos) > 0
        AND jsonb_typeof(fotos->0) = 'object'
    `);
  }
}
