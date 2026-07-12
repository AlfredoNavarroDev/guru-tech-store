import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemRestriccion } from './entities/item-restriccion.entity';
import { CategoriaRestriccion } from './entities/categoria-restriccion.entity';
import type { UpsertRestriccionDto } from './dto/upsert-restriccion.dto';

export interface RestrictionResult {
  es_no_cambiable: boolean;
  max_dias_garantia: number | null;
}

// Controla si un ítem puede cambiarse y el máximo de días de garantía.
// Restricción a nivel ítem tiene precedencia sobre restricción por categoría.
@Injectable()
export class RestriccionesService {
  constructor(
    @InjectRepository(ItemRestriccion)
    private readonly itemRestriccionRepo: Repository<ItemRestriccion>,
    @InjectRepository(CategoriaRestriccion)
    private readonly catRestriccionRepo: Repository<CategoriaRestriccion>,
  ) {}

  // Busca primero a nivel ítem; si no existe busca por categorías del ítem.
  // max_dias_garantia retorna el mínimo entre todas las categorías (la más restrictiva gana).
  async resolveItemRestriction(
    id_item: number,
  ): Promise<RestrictionResult | null> {
    const itemRow = await this.itemRestriccionRepo.findOne({ where: { id_item } });
    if (itemRow) {
      return { es_no_cambiable: itemRow.es_no_cambiable, max_dias_garantia: itemRow.max_dias_garantia };
    }

    const catRows = await this.catRestriccionRepo
      .createQueryBuilder('cr')
      .innerJoin('item_categorias', 'ic', 'ic.id_categoria = cr.id_categoria AND ic.id_item = :idItem', { idItem: id_item })
      .getMany();

    if (!catRows.length) return null;

    const diasValues = catRows
      .map((r) => r.max_dias_garantia)
      .filter((v): v is number => v !== null);

    return {
      es_no_cambiable: catRows.some((r) => r.es_no_cambiable),
      max_dias_garantia:
        diasValues.length > 0
          ? diasValues.reduce((min, v) => (v < min ? v : min))
          : null,
    };
  }

  async upsertItemRestriccion(id_item: number, dto: UpsertRestriccionDto): Promise<void> {
    await this.itemRestriccionRepo.upsert(
      { id_item, es_no_cambiable: dto.es_no_cambiable ?? false, max_dias_garantia: dto.max_dias_garantia ?? null },
      ['id_item'],
    );
  }

  async upsertCategoriaRestriccion(id_categoria: number, dto: UpsertRestriccionDto): Promise<void> {
    await this.catRestriccionRepo.upsert(
      { id_categoria, es_no_cambiable: dto.es_no_cambiable ?? false, max_dias_garantia: dto.max_dias_garantia ?? null },
      ['id_categoria'],
    );
  }

  async findAll(): Promise<{
    items: Array<RestrictionResult & { id_item: number; nombre: string }>;
    categorias: Array<RestrictionResult & { id_categoria: number; nombre_categoria: string }>;
  }> {
    const [items, categorias] = await Promise.all([
      this.itemRestriccionRepo
        .createQueryBuilder('ir')
        .select('ir.id_item', 'id_item')
        .addSelect('ir.es_no_cambiable', 'es_no_cambiable')
        .addSelect('ir.max_dias_garantia', 'max_dias_garantia')
        .innerJoin('items', 'i', 'i.id_item = ir.id_item')
        .addSelect('i.nombre', 'nombre')
        .getRawMany<{ id_item: number; es_no_cambiable: boolean; max_dias_garantia: number | null; nombre: string }>(),
      this.catRestriccionRepo
        .createQueryBuilder('cr')
        .select('cr.id_categoria', 'id_categoria')
        .addSelect('cr.es_no_cambiable', 'es_no_cambiable')
        .addSelect('cr.max_dias_garantia', 'max_dias_garantia')
        .innerJoin('categorias', 'c', 'c.id_categoria = cr.id_categoria')
        .addSelect('c.nombre_categoria', 'nombre_categoria')
        .getRawMany<{ id_categoria: number; es_no_cambiable: boolean; max_dias_garantia: number | null; nombre_categoria: string }>(),
    ]);
    return { items, categorias };
  }
}
