import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';

// Consulta catálogo vía vista v_vendedor_catalogo. Solo lectura.
@Injectable()
export class CatalogoService {
  constructor(private readonly dataSource: DataSource) {}

  // Productos disponibles en la sede. JOIN a Items solo si se filtra por categoría/marca.
  async findAll(idSede: number, query: QueryCatalogoDto): Promise<object[]> {
    let sql = `SELECT id_item, sku, producto, marca, categoria, modelo,
                      precio_venta_actual, imagen_url, stock_disponible,
                      promo_nombre, promo_tipo, promo_valor, precio_con_descuento,
                      calidad, especificaciones
               FROM v_vendedor_catalogo
               WHERE id_sede = $1`;

    const params: (string | number | boolean)[] = [idSede];
    let idx = 2;

    if (query.categoria !== undefined) {
      // JOIN item_categorias (M:N) para categoría + Items para id_marca.
      sql = `SELECT vc.* FROM v_vendedor_catalogo vc
             JOIN item_categorias ic ON ic.id_item = vc.id_item
             JOIN Items i ON i.id_item = vc.id_item
             WHERE vc.id_sede = $1 AND ic.id_categoria = $${idx++}`;
      params.push(query.categoria);
      if (query.marca !== undefined) {
        sql += ` AND i.id_marca = $${idx++}`;
        params.push(query.marca);
      }
      if (query.nombre) {
        sql += ` AND vc.producto ILIKE $${idx++}`;
        params.push(`%${query.nombre}%`);
      }
      if (query.con_stock) {
        sql += ` AND vc.stock_disponible > 0`;
      }
    } else {
      if (query.marca !== undefined) {
        // JOIN a Items también necesario para filtrar por id_marca.
        sql = `SELECT vc.* FROM v_vendedor_catalogo vc
               JOIN Items i ON i.id_item = vc.id_item
               WHERE vc.id_sede = $1 AND i.id_marca = $${idx++}`;
        params.push(query.marca);
        if (query.nombre) {
          sql += ` AND vc.producto ILIKE $${idx++}`;
          params.push(`%${query.nombre}%`);
        }
        if (query.con_stock) {
          sql += ` AND vc.stock_disponible > 0`;
        }
      } else {
        // Sin categoría ni marca: vista base, sin JOIN.
        if (query.nombre) {
          sql += ` AND producto ILIKE $${idx++}`;
          params.push(`%${query.nombre}%`);
        }
        if (query.con_stock) {
          // Solo productos con stock > 0.
          sql += ` AND stock_disponible > 0`;
        }
      }
    }

    sql += ` ORDER BY producto`;
    const rows = (await this.dataSource.query(sql, params)) as {
      id_item: number;
    }[];
    const seen = new Set<number>();
    return rows.filter((row) => {
      if (seen.has(row.id_item)) return false;
      seen.add(row.id_item);
      return true;
    });
  }
}
