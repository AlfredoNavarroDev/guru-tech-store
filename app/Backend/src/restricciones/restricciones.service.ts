import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { UpsertRestriccionDto } from './dto/upsert-restriccion.dto';

export interface RestrictionResult {
  es_no_cambiable: boolean;
  max_dias_garantia: number | null;
}

@Injectable()
export class RestriccionesService {
  constructor(private readonly dataSource: DataSource) {}

  async resolveItemRestriction(
    id_item: number,
  ): Promise<RestrictionResult | null> {
    const [itemRow] = await this.dataSource.query<RestrictionResult[]>(
      `SELECT es_no_cambiable, max_dias_garantia FROM item_restricciones WHERE id_item = $1`,
      [id_item],
    );
    if (itemRow) return itemRow;

    const catRows = await this.dataSource.query<RestrictionResult[]>(
      `SELECT cr.es_no_cambiable, cr.max_dias_garantia
       FROM categoria_restricciones cr
       JOIN item_categorias ic ON ic.id_categoria = cr.id_categoria
       WHERE ic.id_item = $1`,
      [id_item],
    );
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

  async upsertItemRestriccion(
    id_item: number,
    dto: UpsertRestriccionDto,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO item_restricciones (id_item, es_no_cambiable, max_dias_garantia)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_item) DO UPDATE
       SET es_no_cambiable   = EXCLUDED.es_no_cambiable,
           max_dias_garantia = EXCLUDED.max_dias_garantia,
           updated_at        = now()`,
      [id_item, dto.es_no_cambiable ?? false, dto.max_dias_garantia ?? null],
    );
  }

  async upsertCategoriaRestriccion(
    id_categoria: number,
    dto: UpsertRestriccionDto,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO categoria_restricciones (id_categoria, es_no_cambiable, max_dias_garantia)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_categoria) DO UPDATE
       SET es_no_cambiable   = EXCLUDED.es_no_cambiable,
           max_dias_garantia = EXCLUDED.max_dias_garantia,
           updated_at        = now()`,
      [
        id_categoria,
        dto.es_no_cambiable ?? false,
        dto.max_dias_garantia ?? null,
      ],
    );
  }

  async findAll(): Promise<{
    items: Array<RestrictionResult & { id_item: number; nombre: string }>;
    categorias: Array<
      RestrictionResult & { id_categoria: number; nombre_categoria: string }
    >;
  }> {
    const [items, categorias] = await Promise.all([
      this.dataSource.query(
        `SELECT ir.id_item, ir.es_no_cambiable, ir.max_dias_garantia, i.nombre
         FROM item_restricciones ir
         JOIN items i ON i.id_item = ir.id_item`,
      ),
      this.dataSource.query(
        `SELECT cr.id_categoria, cr.es_no_cambiable, cr.max_dias_garantia, c.nombre_categoria
         FROM categoria_restricciones cr
         JOIN categorias c ON c.id_categoria = cr.id_categoria`,
      ),
    ]);
    return { items, categorias };
  }
}
