import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecsFieldsToCatalogoView1781600000001
  implements MigrationInterface
{
  name = 'AddSpecsFieldsToCatalogoView1781600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
          i.imagen_url,
          i.calidad,
          i.especificaciones,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
          i.imagen_url,
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
  }
}
