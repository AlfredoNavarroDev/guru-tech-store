import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryStockDto } from './dto/query-stock.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class StockService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(
    idSede: number,
    query: QueryStockDto,
  ): Promise<PaginatedResult<object>> {
    const conditions: string[] = [`id_sede = $1`];
    const params: unknown[] = [idSede];
    let idx = 2;

    if (query.tipo) {
      conditions.push(`tipo = $${idx++}`);
      params.push(query.tipo);
    }
    if (query.id_marca) {
      conditions.push(`id_marca = $${idx++}`);
      params.push(query.id_marca);
    }
    if (query.requiere_reposicion !== undefined) {
      conditions.push(`requiere_reposicion = $${idx++}`);
      params.push(query.requiere_reposicion);
    }

    const where = conditions.join(' AND ');

    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<[{ total: string }]>(
        `SELECT COUNT(*) AS total FROM v_abastecedor_stock_actual WHERE ${where}`,
        params,
      ),
      this.dataSource.query<object[]>(
        `SELECT * FROM v_abastecedor_stock_actual WHERE ${where} ORDER BY nombre LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, query.limit, (query.page - 1) * query.limit],
      ),
    ]);

    return {
      items: rows,
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  async findCritico(idSede: number): Promise<object[]> {
    return this.dataSource.query(
      `SELECT * FROM v_abastecedor_stock_critico WHERE id_sede = $1 ORDER BY unidades_faltantes DESC`,
      [idSede],
    );
  }
}
