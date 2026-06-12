import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameEmpleadoSueldoPago1781300000001
  implements MigrationInterface
{
  name = 'RenameEmpleadoSueldoPago1781300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop views that reference the old column name before renaming
    await queryRunner.query(`DROP VIEW IF EXISTS v_propietario_empleados_global`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_gerente_empleados`);

    // Idempotent: only rename if old column still exists (skip on fresh installs)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'empleados' AND column_name = 'sueldo_semanal_soles'
        ) THEN
          ALTER TABLE empleados RENAME COLUMN sueldo_semanal_soles TO sueldo_soles;
        END IF;
      END$$
    `);
    // Idempotent: only add frecuencia_pago if it doesn't exist yet
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'empleados' AND column_name = 'frecuencia_pago'
        ) THEN
          ALTER TABLE empleados
            ADD COLUMN frecuencia_pago varchar(20) NOT NULL DEFAULT 'semanal';
        END IF;
      END$$
    `);
    // Idempotent: add check constraint only if absent
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'empleados'
            AND constraint_name = 'chk_empleados_frecuencia_pago'
        ) THEN
          ALTER TABLE empleados
            ADD CONSTRAINT chk_empleados_frecuencia_pago
            CHECK (frecuencia_pago IN ('semanal', 'quincenal', 'mensual'));
        END IF;
      END$$
    `);
    await this.createEmpleadoViews(queryRunner, true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.createEmpleadoViews(queryRunner, false);
    await queryRunner.query(`
      ALTER TABLE empleados
      DROP CONSTRAINT IF EXISTS chk_empleados_frecuencia_pago
    `);
    await queryRunner.query(`
      ALTER TABLE empleados
      DROP COLUMN IF EXISTS frecuencia_pago
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'empleados' AND column_name = 'sueldo_soles'
        ) THEN
          ALTER TABLE empleados RENAME COLUMN sueldo_soles TO sueldo_semanal_soles;
        END IF;
      END$$
    `);
  }

  private async createEmpleadoViews(
    queryRunner: QueryRunner,
    includeFrecuencia: boolean,
  ): Promise<void> {
    const frecuencia = includeFrecuencia ? '          e.frecuencia_pago,\n' : '';

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_propietario_empleados_global AS
      SELECT
          e.id_empleado,
          s.id_sede,
          s.nombre                  AS sede,
          e.nombre_completo,
          e.tipo_documento,
          e.nro_documento,
          e.telefono,
          e.estado,
          e.sueldo_soles,
${frecuencia}          e.es_extranjero,
          r.nombre_rol              AS rol,
          e.created_by,
          ec.nombre_completo        AS creado_por,
          e.created_at
      FROM empleados e
      LEFT JOIN sedes s      ON s.id_sede      = e.id_sede
      LEFT JOIN roles r      ON r.id_rol       = e.id_rol
      LEFT JOIN empleados ec ON ec.id_empleado = e.created_by
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_gerente_empleados AS
      SELECT
          e.id_empleado,
          e.id_sede,
          s.nombre                  AS sede,
          e.nombre_completo,
          e.tipo_documento,
          e.nro_documento,
          e.telefono,
          e.estado,
          e.sueldo_soles,
${frecuencia}          r.nombre_rol              AS rol,
          e.created_by,
          ec.nombre_completo        AS creado_por,
          e.created_at
      FROM empleados e
      JOIN  sedes s      ON s.id_sede      = e.id_sede
      LEFT JOIN roles r  ON r.id_rol       = e.id_rol
      LEFT JOIN empleados ec ON ec.id_empleado = e.created_by
    `);
  }
}
