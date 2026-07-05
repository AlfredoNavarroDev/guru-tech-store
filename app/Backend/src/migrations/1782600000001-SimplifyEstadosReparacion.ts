import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyEstadosReparacion1782600000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Remap existing reparaciones to the new 4-state IDs:
    //   old 1 (pendiente)           → new 1 (pendiente)
    //   old 2 (diagnostico)         → new 2 (reparacion)
    //   old 3 (reparacion)          → new 2 (reparacion)
    //   old 4 (esperando repuestos) → new 2 (reparacion)
    //   old 5 (listo)               → new 3 (listo)
    //   old 6 (entregado)           → new 4 (entregado)

    // Also remap etapa in fotos JSONB to new state names
    await queryRunner.query(`
      UPDATE reparaciones
      SET fotos = (
        SELECT jsonb_agg(
          jsonb_set(elem, '{etapa}',
            to_jsonb(
              CASE elem->>'etapa'
                WHEN 'diagnostico'         THEN 'reparacion'
                WHEN 'esperando repuestos' THEN 'reparacion'
                ELSE elem->>'etapa'
              END
            )
          )
        )
        FROM jsonb_array_elements(fotos) AS elem
      )
      WHERE fotos IS NOT NULL
        AND jsonb_typeof(fotos) = 'array'
        AND jsonb_array_length(fotos) > 0
    `);

    // Temporarily drop all FKs on id_estado to allow state remapping
    await queryRunner.query(
      `ALTER TABLE reparaciones DROP CONSTRAINT IF EXISTS fk_rep_estado`,
    );
    await queryRunner.query(
      `ALTER TABLE reparaciones DROP CONSTRAINT IF EXISTS reparaciones_id_estado_fkey`,
    );

    // Remap estado IDs on reparaciones
    await queryRunner.query(`
      UPDATE reparaciones SET id_estado = CASE id_estado
        WHEN 1 THEN 1
        WHEN 2 THEN 2
        WHEN 3 THEN 2
        WHEN 4 THEN 2
        WHEN 5 THEN 3
        WHEN 6 THEN 4
        ELSE id_estado
      END
    `);

    // Replace all estados_reparacion rows
    await queryRunner.query(`DELETE FROM estados_reparacion`);
    await queryRunner.query(`
      INSERT INTO estados_reparacion (id_estado, nombre, descripcion, orden, es_final) VALUES
      (1, 'pendiente',   'Equipo recibido, pendiente de reparación', 1, false),
      (2, 'reparacion',  'En proceso de reparación',                 2, false),
      (3, 'listo',       'Reparación terminada, lista para entrega', 3, true),
      (4, 'entregado',   'Equipo entregado al cliente',              4, true)
    `);

    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('estados_reparacion', 'id_estado'), 4)`,
    );

    // Re-add FK
    await queryRunner.query(
      `ALTER TABLE reparaciones ADD CONSTRAINT fk_rep_estado FOREIGN KEY (id_estado) REFERENCES estados_reparacion (id_estado)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE reparaciones DROP CONSTRAINT IF EXISTS fk_rep_estado`,
    );
    await queryRunner.query(
      `ALTER TABLE reparaciones DROP CONSTRAINT IF EXISTS reparaciones_id_estado_fkey`,
    );

    await queryRunner.query(`DELETE FROM estados_reparacion`);
    await queryRunner.query(`
      INSERT INTO estados_reparacion (id_estado, nombre, descripcion, orden, es_final) VALUES
      (1, 'pendiente',           'Equipo recibido, sin diagnóstico',           1, false),
      (2, 'diagnostico',         'En proceso de diagnóstico',                  2, false),
      (3, 'reparacion',          'En proceso de reparación',                   3, false),
      (4, 'esperando repuestos', 'Esperando llegada de repuestos',             4, false),
      (5, 'listo',               'Reparación terminada, lista para entrega',   5, true),
      (6, 'entregado',           'Equipo entregado al cliente',                6, true)
    `);

    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('estados_reparacion', 'id_estado'), 6)`,
    );

    await queryRunner.query(
      `ALTER TABLE reparaciones ADD CONSTRAINT fk_rep_estado FOREIGN KEY (id_estado) REFERENCES estados_reparacion (id_estado)`,
    );
  }
}
