import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReparacionesToClienteView1782700000001
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_clientes AS
      SELECT
          c.id_cliente,
          c.nombre_completo,
          c.tipo_documento,
          c.nro_documento,
          c.telefono,
          c.direccion_completa,
          c.es_extranjero,
          COUNT(DISTINCT v.id_venta)       AS total_compras,
          MAX(v.fecha_emision)             AS ultima_compra,
          COUNT(DISTINCT r.id_reparacion)  AS total_reparaciones,
          MAX(r.fecha_ingreso)             AS ultima_reparacion
      FROM Clientes c
      LEFT JOIN Ventas v ON v.id_cliente = c.id_cliente
      LEFT JOIN reparaciones r ON r.id_cliente = c.id_cliente
      GROUP BY c.id_cliente, c.nombre_completo, c.tipo_documento,
               c.nro_documento, c.telefono, c.direccion_completa, c.es_extranjero
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_clientes AS
      SELECT
          c.id_cliente,
          c.nombre_completo,
          c.tipo_documento,
          c.nro_documento,
          c.telefono,
          c.direccion_completa,
          c.es_extranjero,
          COUNT(DISTINCT v.id_venta) AS total_compras,
          MAX(v.fecha_emision)       AS ultima_compra
      FROM Clientes c
      LEFT JOIN Ventas v ON v.id_cliente = c.id_cliente
      GROUP BY c.id_cliente, c.nombre_completo, c.tipo_documento,
               c.nro_documento, c.telefono, c.direccion_completa, c.es_extranjero
    `);
  }
}
