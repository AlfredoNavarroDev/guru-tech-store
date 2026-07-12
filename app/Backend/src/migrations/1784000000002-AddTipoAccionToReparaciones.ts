import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipoAccionToReparaciones1784000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reparaciones
        ADD COLUMN IF NOT EXISTS tipo_accion VARCHAR(20) NOT NULL DEFAULT 'reparacion'
          CHECK (tipo_accion IN ('diagnostico', 'reparacion'))
    `);

    // Recreate v_reparacion_lista to include tipo_accion
    // Must DROP first: CREATE OR REPLACE cannot insert a column in the middle
    await queryRunner.query(`DROP VIEW IF EXISTS v_reparacion_lista`);
    await queryRunner.query(`
      CREATE VIEW v_reparacion_lista AS
      SELECT
        r.id_reparacion, r.fecha_ingreso, r.id_cliente,
        c.nombre_completo AS cliente,
        r.id_tecnico,
        e.nombre_completo AS tecnico,
        r.id_sede, r.marca, r.modelo, r.imei,
        r.esta_encendido, r.checklist_estado, r.diagnostico_tecnico,
        r.id_estado, er.nombre AS estado, er.es_final,
        r.fecha_estimada, r.fecha_terminado, r.fecha_entrega_cliente,
        r.monto_cotizado, r.monto_descuento,
        r.tipo_descuento, r.justificacion_descuento, r.tipo_servicio,
        r.tipo_accion,
        r.created_at, r.updated_at, r.fotos, r.id_garantia_reclamada,
        COALESCE((
          SELECT SUM(cantidad * precio_cobrado)
          FROM reparacion_repuestos_usados
          WHERE id_reparacion = r.id_reparacion
        ), 0) AS repuestos_cost
      FROM reparaciones r
      LEFT JOIN clientes c ON c.id_cliente = r.id_cliente
      LEFT JOIN empleados e ON e.id_empleado = r.id_tecnico
      LEFT JOIN estados_reparacion er ON er.id_estado = r.id_estado
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore view without tipo_accion; drop first to avoid column-order restrictions
    await queryRunner.query(`DROP VIEW IF EXISTS v_reparacion_lista`);
    await queryRunner.query(`
      CREATE VIEW v_reparacion_lista AS
      SELECT
        r.id_reparacion, r.fecha_ingreso, r.id_cliente,
        c.nombre_completo AS cliente,
        r.id_tecnico,
        e.nombre_completo AS tecnico,
        r.id_sede, r.marca, r.modelo, r.imei,
        r.esta_encendido, r.checklist_estado, r.diagnostico_tecnico,
        r.id_estado, er.nombre AS estado, er.es_final,
        r.fecha_estimada, r.fecha_terminado, r.fecha_entrega_cliente,
        r.monto_cotizado, r.monto_descuento,
        r.tipo_descuento, r.justificacion_descuento, r.tipo_servicio,
        r.created_at, r.updated_at, r.fotos, r.id_garantia_reclamada,
        COALESCE((
          SELECT SUM(cantidad * precio_cobrado)
          FROM reparacion_repuestos_usados
          WHERE id_reparacion = r.id_reparacion
        ), 0) AS repuestos_cost
      FROM reparaciones r
      LEFT JOIN clientes c ON c.id_cliente = r.id_cliente
      LEFT JOIN empleados e ON e.id_empleado = r.id_tecnico
      LEFT JOIN estados_reparacion er ON er.id_estado = r.id_estado
    `);
    await queryRunner.query(
      `ALTER TABLE reparaciones DROP COLUMN IF EXISTS tipo_accion`,
    );
  }
}
