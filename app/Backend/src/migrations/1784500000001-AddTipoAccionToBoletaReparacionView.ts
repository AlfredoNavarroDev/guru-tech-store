import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipoAccionToBoletaReparacionView1784500000001
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_boleta_reparacion`);
    await queryRunner.query(`
      CREATE VIEW v_boleta_reparacion AS
      SELECT
        r.id_reparacion, r.id_sede,
        s.nombre      AS sede_nombre,
        s.direccion   AS sede_direccion,
        s.telefono    AS sede_telefono,
        e.nombre_completo AS tecnico,
        r.fecha_ingreso, r.monto_cotizado, r.monto_descuento, r.tipo_descuento,
        r.id_cliente,
        c.nombre_completo AS cliente_nombre,
        c.tipo_documento  AS cliente_tipo_doc,
        c.nro_documento   AS cliente_nro_doc,
        r.marca, r.modelo, r.tipo_servicio, r.tipo_accion,
        r.diagnostico_tecnico, r.fecha_estimada,
        i.nombre      AS producto,
        i.sku,
        rru.cantidad,
        rru.precio_cobrado,
        (rru.cantidad * rru.precio_cobrado) AS importe
      FROM reparaciones r
      JOIN  sedes s    ON s.id_sede     = r.id_sede
      JOIN  empleados e ON e.id_empleado = r.id_tecnico
      LEFT JOIN clientes c ON c.id_cliente = r.id_cliente
      LEFT JOIN reparacion_repuestos_usados rru ON rru.id_reparacion = r.id_reparacion
      LEFT JOIN items i ON i.id_item = rru.id_item
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_boleta_reparacion`);
    await queryRunner.query(`
      CREATE VIEW v_boleta_reparacion AS
      SELECT
        r.id_reparacion, r.id_sede,
        s.nombre      AS sede_nombre,
        s.direccion   AS sede_direccion,
        s.telefono    AS sede_telefono,
        e.nombre_completo AS tecnico,
        r.fecha_ingreso, r.monto_cotizado, r.monto_descuento, r.tipo_descuento,
        r.id_cliente,
        c.nombre_completo AS cliente_nombre,
        c.tipo_documento  AS cliente_tipo_doc,
        c.nro_documento   AS cliente_nro_doc,
        r.marca, r.modelo, r.tipo_servicio, r.diagnostico_tecnico, r.fecha_estimada,
        i.nombre      AS producto,
        i.sku,
        rru.cantidad,
        rru.precio_cobrado,
        (rru.cantidad * rru.precio_cobrado) AS importe
      FROM reparaciones r
      JOIN  sedes s    ON s.id_sede     = r.id_sede
      JOIN  empleados e ON e.id_empleado = r.id_tecnico
      LEFT JOIN clientes c ON c.id_cliente = r.id_cliente
      LEFT JOIN reparacion_repuestos_usados rru ON rru.id_reparacion = r.id_reparacion
      LEFT JOIN items i ON i.id_item = rru.id_item
    `);
  }
}
