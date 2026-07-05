import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessViews1783000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Vista: reparaciones con JOINs a clientes, empleados, estados y coste de repuestos.
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_reparacion_lista AS
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

    // Vista: cabecera de compra con empleado, proveedor y coste total calculado.
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_compra_cabecera AS
      SELECT
        c.id_compra,
        c.id_empleado_refiller,
        e.nombre_completo AS empleado,
        c.id_sede_destino,
        c.id_proveedor,
        p.razon_social AS proveedor,
        c.fecha_compra,
        COALESCE(SUM(d.cantidad_comprada * d.costo_unidad), 0) AS costo_total
      FROM compras_refill c
      JOIN empleados e ON e.id_empleado = c.id_empleado_refiller
      JOIN proveedores p ON p.id_proveedor = c.id_proveedor
      LEFT JOIN detalle_compra_refill d ON d.id_compra = c.id_compra
      GROUP BY c.id_compra, c.id_empleado_refiller, e.nombre_completo,
               c.id_sede_destino, c.id_proveedor, p.razon_social, c.fecha_compra
    `);

    // Vista: cambio con nombres de ítems devuelto y entregado.
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_cambio_detalle AS
      SELECT
        cp.*,
        idev.nombre AS nombre_item_devuelto,
        idev.sku    AS sku_devuelto,
        ient.nombre AS nombre_item_entregado,
        ient.sku    AS sku_entregado
      FROM cambios_producto cp
      JOIN items idev ON idev.id_item = cp.id_item_devuelto
      JOIN items ient ON ient.id_item = cp.id_item_entregado
    `);

    // Vista: datos de reparación para boleta PDF (con repuestos usados).
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_boleta_reparacion AS
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

    // Vista: datos de cambio para boleta PDF (con sedes, empleados e ítems).
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_boleta_cambio AS
      SELECT
        cp.id_cambio, cp.id_sede, cp.id_empleado,
        cp.cantidad, cp.precio_devuelto, cp.precio_entregado,
        cp.diferencia_cobrada, cp.metodo_pago_dif,
        cp.motivo, cp.detalle, cp.fecha_cambio, cp.id_venta_origen,
        idev.nombre AS nombre_item_devuelto, idev.sku AS sku_devuelto,
        ient.nombre AS nombre_item_entregado, ient.sku AS sku_entregado,
        s.nombre    AS sede_nombre,
        s.direccion AS sede_direccion,
        s.telefono  AS sede_telefono,
        e.nombre_completo AS vendedor
      FROM cambios_producto cp
      JOIN items idev ON idev.id_item = cp.id_item_devuelto
      JOIN items ient ON ient.id_item = cp.id_item_entregado
      JOIN sedes s    ON s.id_sede     = cp.id_sede
      JOIN empleados e ON e.id_empleado = cp.id_empleado
    `);

    // Vista: garantía con datos de la reparación origen para reclamos.
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_garantia_reclamo AS
      SELECT
        g.id_garantia, g.id_venta, g.id_reparacion, g.estado,
        r.id_sede, r.id_cliente, r.marca, r.modelo, r.imei
      FROM garantias g
      LEFT JOIN reparaciones r ON r.id_reparacion = g.id_reparacion
    `);

    // Vista: datos del empleado con rol y sede para sesiones de auth.
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_empleado_sesion AS
      SELECT
        e.id_empleado,
        r.nombre_rol,
        COALESCE(s.nombre, 'Sin sede') AS nombre_sede
      FROM empleados e
      JOIN  roles r  ON r.id_rol  = e.id_rol
      LEFT JOIN sedes s ON s.id_sede = e.id_sede
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_empleado_sesion`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_garantia_reclamo`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_boleta_cambio`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_boleta_reparacion`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_cambio_detalle`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_compra_cabecera`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_reparacion_lista`);
  }
}
