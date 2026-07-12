import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameBoletasToNotasVenta1784000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE boletas RENAME TO notas_venta`);

    // CASCADE drops v_vendedor_resumen_diario which depends on v_vendedor_ventas
    await queryRunner.query(`DROP VIEW IF EXISTS v_vendedor_ventas CASCADE`);

    // Recreate v_vendedor_ventas replacing LEFT JOIN Boletas → notas_venta
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_ventas AS
      SELECT
          v.id_venta,
          v.id_sede,
          s.nombre                                                          AS sede,
          v.id_empleado,
          e.nombre_completo                                                 AS vendedor,
          v.fecha_emision,
          c.nombre_completo                                                 AS cliente,
          i.nombre                                                          AS producto,
          i.sku,
          dv.cantidad,
          dv.precio_unitario_momento,
          dv.precio_normal_momento,
          dv.importe,
          v.monto_descuento,
          SUM(dv.importe) OVER (PARTITION BY v.id_venta) - v.monto_descuento AS total_venta_cabecera,
          b.numero                                                          AS nro_boleta
      FROM Ventas v
      JOIN  Sedes s             ON s.id_sede      = v.id_sede
      JOIN  Empleados e         ON e.id_empleado  = v.id_empleado
      LEFT JOIN Clientes c      ON c.id_cliente   = v.id_cliente
      JOIN  Detalle_Venta dv    ON dv.id_venta    = v.id_venta
      JOIN  Items i             ON i.id_item      = dv.id_item
      LEFT JOIN notas_venta b   ON b.id_venta     = v.id_venta
    `);

    // Recreate v_vendedor_resumen_diario which was dropped by CASCADE
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_resumen_diario AS
      WITH ventas_dedup AS (
        SELECT DISTINCT ON (v.id_venta)
          v.id_venta,
          v.id_empleado,
          v.cliente,
          v.total_venta_cabecera,
          DATE((v.fecha_emision AT TIME ZONE 'America/Lima')) AS fecha
        FROM v_vendedor_ventas v
        ORDER BY v.id_venta
      )
      SELECT
        id_empleado,
        fecha,
        COUNT(*) AS ventas,
        COALESCE(SUM(total_venta_cabecera), 0) AS ingresos,
        COUNT(*) AS clientes_atendidos
      FROM ventas_dedup
      GROUP BY id_empleado, fecha
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rename table back first so view recreations below can reference 'boletas'
    await queryRunner.query(`ALTER TABLE notas_venta RENAME TO boletas`);

    // CASCADE drops v_vendedor_resumen_diario which depends on v_vendedor_ventas
    await queryRunner.query(`DROP VIEW IF EXISTS v_vendedor_ventas CASCADE`);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_ventas AS
      SELECT
          v.id_venta, v.id_sede,
          s.nombre AS sede,
          v.id_empleado,
          e.nombre_completo AS vendedor,
          v.fecha_emision,
          c.nombre_completo AS cliente,
          i.nombre AS produto, i.sku,
          dv.cantidad, dv.precio_unitario_momento, dv.precio_normal_momento, dv.importe,
          v.monto_descuento,
          SUM(dv.importe) OVER (PARTITION BY v.id_venta) - v.monto_descuento AS total_venta_cabecera,
          b.numero AS nro_boleta
      FROM Ventas v
      JOIN Sedes s ON s.id_sede = v.id_sede
      JOIN Empleados e ON e.id_empleado = v.id_empleado
      LEFT JOIN Clientes c ON c.id_cliente = v.id_cliente
      JOIN Detalle_Venta dv ON dv.id_venta = v.id_venta
      JOIN Items i ON i.id_item = dv.id_item
      LEFT JOIN Boletas b ON b.id_venta = v.id_venta
    `);

    // Recreate v_vendedor_resumen_diario
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_resumen_diario AS
      WITH ventas_dedup AS (
        SELECT DISTINCT ON (v.id_venta)
          v.id_venta,
          v.id_empleado,
          v.cliente,
          v.total_venta_cabecera,
          DATE((v.fecha_emision AT TIME ZONE 'America/Lima')) AS fecha
        FROM v_vendedor_ventas v
        ORDER BY v.id_venta
      )
      SELECT
        id_empleado,
        fecha,
        COUNT(*) AS ventas,
        COALESCE(SUM(total_venta_cabecera), 0) AS ingresos,
        COUNT(*) AS clientes_atendidos
      FROM ventas_dedup
      GROUP BY id_empleado, fecha
    `);
  }
}
