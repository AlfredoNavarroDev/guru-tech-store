import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogoView } from './entities/catalogo-view.entity';
import { QueryCatalogoDto } from './dto/query-catalogo.dto';

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(CatalogoView)
    private readonly catRepo: Repository<CatalogoView>,
  ) {}

  async findAll(idSede: number, query: QueryCatalogoDto): Promise<CatalogoView[]> {
    const qb = this.catRepo
      .createQueryBuilder('cv')
      .where('cv.id_sede = :idSede', { idSede })
      .orderBy('cv.producto', 'ASC');

    if (query.categoria !== undefined) {
      qb.andWhere(
        'cv.id_item IN (SELECT ic.id_item FROM item_categorias ic WHERE ic.id_categoria = :cat)',
        { cat: query.categoria },
      );
    }
    if (query.marca !== undefined) {
      qb.andWhere(
        'cv.id_item IN (SELECT i.id_item FROM items i WHERE i.id_marca = :marca)',
        { marca: query.marca },
      );
    }
    if (query.nombre) {
      qb.andWhere('cv.producto ILIKE :nombre', { nombre: `%${query.nombre}%` });
    }
    if (query.con_stock) {
      qb.andWhere('cv.stock_disponible > 0');
    }

    return qb.getMany();
  }
}
