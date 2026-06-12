import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class StockService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(idSede: number): Promise<object[]> {
    return this.dataSource.query(
      `SELECT * FROM v_abastecedor_stock_actual WHERE id_sede = $1 ORDER BY nombre`,
      [idSede],
    );
  }

  async findCritico(idSede: number): Promise<object[]> {
    return this.dataSource.query(
      `SELECT * FROM v_abastecedor_stock_critico WHERE id_sede = $1 ORDER BY unidades_faltantes DESC`,
      [idSede],
    );
  }
}
