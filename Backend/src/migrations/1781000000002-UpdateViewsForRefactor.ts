import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateViewsForRefactor1781000000002 implements MigrationInterface {
  name = 'UpdateViewsForRefactor1781000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // v_propietario_empleados_global — roles (STRING_AGG) → rol (scalar)
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
          e.frecuencia_pago,
          e.es_extranjero,
          r.nombre_rol              AS rol,
          e.created_by,
          ec.nombre_completo        AS creado_por,
          e.created_at
      FROM Empleados e
      LEFT JOIN Sedes s      ON s.id_sede      = e.id_sede
      LEFT JOIN Roles r      ON r.id_rol       = e.id_rol
      LEFT JOIN Empleados ec ON ec.id_empleado = e.created_by
    `);

    // v_gerente_empleados — roles (STRING_AGG) → rol (scalar)
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
          e.frecuencia_pago,
          r.nombre_rol              AS rol,
          e.created_by,
          ec.nombre_completo        AS creado_por,
          e.created_at
      FROM Empleados e
      JOIN  Sedes s      ON s.id_sede      = e.id_sede
      LEFT JOIN Roles r  ON r.id_rol       = e.id_rol
      LEFT JOIN Empleados ec ON ec.id_empleado = e.created_by
    `);

    // v_vendedor_catalogo — Items.id_categoria → Item_Categorias
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_catalogo AS
      WITH promo_vigente AS (
          SELECT
              COALESCE(pr.id_item_afectado, ic.id_item) AS id_item,
              pr.nombre          AS promo_nombre,
              pr.tipo_descuento  AS promo_tipo,
              pr.valor_descuento AS promo_valor
          FROM Promociones pr
          LEFT JOIN Item_Categorias ic ON ic.id_categoria = pr.id_categoria_afectada
          WHERE pr.estado = 'activa'
            AND (pr.fecha_inicio IS NULL OR pr.fecha_inicio <= CURRENT_DATE)
            AND (pr.fecha_fin    IS NULL OR pr.fecha_fin    >= CURRENT_DATE)
      ),
      categorias_por_item AS (
          SELECT ic.id_item,
                 STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria) AS categorias
          FROM Item_Categorias ic
          JOIN Categorias cat ON cat.id_categoria = ic.id_categoria
          GROUP BY ic.id_item
      )
      SELECT
          i.id_item,
          i.sku,
          i.nombre                  AS producto,
          m.nombre                  AS marca,
          ci.categorias             AS categoria,
          i.modelo,
          i.precio_venta_actual,
          inv.id_sede,
          s.nombre                  AS sede,
          inv.cantidad_actual        AS stock_disponible,
          pv.promo_nombre,
          pv.promo_tipo,
          pv.promo_valor,
          CASE
              WHEN pv.promo_tipo = 'porcentaje'
                  THEN ROUND(i.precio_venta_actual * (1 - pv.promo_valor / 100), 2)
              WHEN pv.promo_tipo = 'monto_fijo'
                  THEN GREATEST(i.precio_venta_actual - pv.promo_valor, 0)
              ELSE i.precio_venta_actual
          END                       AS precio_con_descuento
      FROM Items i
      JOIN  Inventario_Sedes inv   ON inv.id_item = i.id_item
      JOIN  Sedes s                ON s.id_sede   = inv.id_sede
      LEFT JOIN Marcas m           ON m.id_marca  = i.id_marca
      LEFT JOIN categorias_por_item ci ON ci.id_item = i.id_item
      LEFT JOIN promo_vigente pv   ON pv.id_item  = i.id_item
      WHERE i.tipo = 'producto'
    `);

    // v_abastecedor_stock_actual — Items.id_categoria → Item_Categorias
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_abastecedor_stock_actual AS
      WITH categorias_por_item AS (
          SELECT ic.id_item,
                 STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria) AS categorias
          FROM Item_Categorias ic
          JOIN Categorias cat ON cat.id_categoria = ic.id_categoria
          GROUP BY ic.id_item
      )
      SELECT
          inv.id_inventario,
          inv.id_sede,
          s.nombre                                        AS sede,
          i.id_item,
          i.sku,
          i.nombre                                        AS item,
          i.tipo,
          m.nombre                                        AS marca,
          ci.categorias                                   AS categoria,
          i.modelo,
          i.calidad,
          inv.cantidad_actual,
          inv.stock_minimo,
          (inv.cantidad_actual - inv.stock_minimo)        AS diferencia_stock,
          (inv.cantidad_actual <= inv.stock_minimo)       AS requiere_reposicion,
          i.precio_compra_actual
      FROM Inventario_Sedes inv
      JOIN  Sedes s                ON s.id_sede  = inv.id_sede
      JOIN  Items i                ON i.id_item  = inv.id_item
      LEFT JOIN Marcas m           ON m.id_marca = i.id_marca
      LEFT JOIN categorias_por_item ci ON ci.id_item = i.id_item
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore views to their pre-refactor definitions
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_propietario_empleados_global AS
      SELECT
          e.id_empleado,
          s.id_sede,
          s.nombre                                                    AS sede,
          e.nombre_completo,
          e.tipo_documento,
          e.nro_documento,
          e.telefono,
          e.estado,
          e.sueldo_soles,
          e.frecuencia_pago,
          e.es_extranjero,
          STRING_AGG(r.nombre_rol, ', ' ORDER BY r.nombre_rol)        AS roles,
          e.created_by,
          ec.nombre_completo                                          AS creado_por,
          e.created_at
      FROM Empleados e
      LEFT JOIN Sedes s           ON s.id_sede      = e.id_sede
      LEFT JOIN Empleado_Roles er ON er.id_empleado = e.id_empleado
      LEFT JOIN Roles r           ON r.id_rol       = er.id_rol
      LEFT JOIN Empleados ec      ON ec.id_empleado = e.created_by
      GROUP BY e.id_empleado, s.id_sede, s.nombre,
               e.nombre_completo, e.tipo_documento, e.nro_documento,
               e.telefono, e.estado, e.sueldo_soles, e.frecuencia_pago, e.es_extranjero,
               e.created_by, ec.nombre_completo, e.created_at
    `);
    // (other view rollbacks omitted — run down() of migration 1781000000001 first)
  }
}
