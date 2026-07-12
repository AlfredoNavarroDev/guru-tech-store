import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockView } from './entities/stock-view.entity';
import { StockCriticoView } from './entities/stock-critico-view.entity';
import { QueryStockDto } from './dto/query-stock.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';

type StockLike = { precio_compra_actual: string };

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(StockView)
    private readonly stockRepo: Repository<StockView>,
    @InjectRepository(StockCriticoView)
    private readonly stockCriticoRepo: Repository<StockCriticoView>,
  ) {}

  async findAll(
    idSede: number | null,
    query: QueryStockDto,
  ): Promise<PaginatedResult<object>> {
    const qb = this.stockRepo.createQueryBuilder('sv');

    if (idSede != null) {
      qb.andWhere('sv.id_sede = :idSede', { idSede });
    }
    if (query.tipo) {
      qb.andWhere('sv.tipo = :tipo', { tipo: query.tipo });
    }
    if (query.id_marca) {
      qb.andWhere(
        'sv.id_item IN (SELECT i.id_item FROM items i WHERE i.id_marca = :idMarca)',
        { idMarca: query.id_marca },
      );
    }
    if (query.requiere_reposicion !== undefined) {
      qb.andWhere('sv.requiere_reposicion = :req', { req: query.requiere_reposicion });
    }

    if (query.requiere_reposicion) {
      qb.orderBy('sv.diferencia_stock', 'ASC');
    } else {
      qb.orderBy('sv.item', 'ASC');
    }

    const [rows, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items: rows.map((row) => this.toStockResponse(row)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findCritico(idSede: number | null): Promise<object[]> {
    const where = idSede != null ? { id_sede: idSede } : {};
    const rows = await this.stockCriticoRepo.find({
      where,
      order: { unidades_faltantes: 'DESC' },
    });
    return rows.map((row) => this.toStockResponse(row));
  }

  private toStockResponse(row: StockLike): object {
    return {
      ...row,
      precio_compra_actual: parseFloat(String(row.precio_compra_actual)),
    };
  }
}
