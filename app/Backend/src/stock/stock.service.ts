import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryStockDto } from './dto/query-stock.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

// Tipo auxiliar que garantiza que precio_compra_actual esté presente en cada fila de la vista.
type StockRow = Record<string, unknown> & {
  precio_compra_actual: string | number;
};

// Servicio de stock: consulta las vistas v_abastecedor_stock_actual y v_abastecedor_stock_critico.
@Injectable()
export class StockService {
  constructor(private readonly dataSource: DataSource) {}

  // Construye la cláusula WHERE dinámicamente y ejecuta COUNT + SELECT en paralelo.
  async findAll(
    idSede: number,
    query: QueryStockDto,
  ): Promise<PaginatedResult<object>> {
    const conditions: string[] = [`id_sede = $1`];
    const params: unknown[] = [idSede];
    let idx = 2;

    // Acumula condiciones opcionales según los filtros recibidos.
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

    // Lanza COUNT y SELECT en paralelo para reducir la latencia de la paginación.
    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<[{ total: string }]>(
        `SELECT COUNT(*) AS total FROM v_abastecedor_stock_actual WHERE ${where}`,
        params,
      ),
      this.dataSource.query<StockRow[]>(
        `SELECT * FROM v_abastecedor_stock_actual WHERE ${where} ORDER BY item LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, query.limit, (query.page - 1) * query.limit],
      ),
    ]);

    return {
      items: rows.map((row) => this.toStockResponse(row)),
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  // Recupera todos los ítems críticos de la sede, ordenados por unidades faltantes de mayor a menor.
  async findCritico(idSede: number): Promise<object[]> {
    const rows = await this.dataSource.query<StockRow[]>(
      `SELECT * FROM v_abastecedor_stock_critico WHERE id_sede = $1 ORDER BY unidades_faltantes DESC`,
      [idSede],
    );
    return rows.map((row) => this.toStockResponse(row));
  }

  // Normaliza precio_compra_actual a number porque PostgreSQL lo devuelve como string.
  private toStockResponse(row: StockRow): object {
    return {
      ...row,
      precio_compra_actual: parseFloat(String(row.precio_compra_actual)),
    };
  }
}
