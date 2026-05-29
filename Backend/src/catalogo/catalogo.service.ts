import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';

@Injectable()
export class CatalogoService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(idSede: number, query: QueryCatalogoDto): Promise<object[]> {
    let sql = `SELECT id_item, sku, producto, marca, categoria, modelo,
                      precio_venta_actual, stock_disponible,
                      promo_nombre, promo_tipo, promo_valor, precio_con_descuento
               FROM v_vendedor_catalogo
               WHERE id_sede = $1`;

    const params: (string | number | boolean)[] = [idSede];
    let idx = 2;

    if (query.categoria !== undefined) {
      // La vista no expone id_categoria directamente — filtramos via subquery
      sql = `SELECT vc.* FROM v_vendedor_catalogo vc
             JOIN Items i ON i.id_item = vc.id_item
             WHERE vc.id_sede = $1 AND i.id_categoria = $${idx++}`;
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
        if (query.nombre) {
          sql += ` AND producto ILIKE $${idx++}`;
          params.push(`%${query.nombre}%`);
        }
        if (query.con_stock) {
          sql += ` AND stock_disponible > 0`;
        }
      }
    }

    sql += ` ORDER BY producto`;
    return this.dataSource.query(sql, params);
  }
}
