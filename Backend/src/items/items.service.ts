import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { PaginatedResult } from '../common/dto/pagination.dto';
import {
  ItemCalidadSoloRepuestoException,
  ItemCategoriasRequeridaException,
  ItemInventarioNotFoundException,
  ItemNotFoundException,
  ItemSkuDuplicadoException,
  ItemStockInsuficienteException,
} from '../common/exceptions';
import { AjusteStockDto } from './dto/ajuste-stock.dto';

interface ItemRow {
  id_item: number;
  tipo: 'producto' | 'repuesto';
  sku: string;
  nombre: string;
  id_marca: number | null;
  marca: string | null;
  modelo: string | null;
  calidad: string | null;
  especificaciones: Record<string, unknown> | null;
  precio_compra_actual: string;
  precio_venta_actual: string;
  created_at: Date;
  updated_at: Date | null;
  categorias_str: string;
  imagen_url: string | null;
}

const ITEM_SELECT = `
  SELECT i.id_item, i.tipo, i.sku, i.nombre, i.id_marca, m.nombre AS marca,
         i.modelo, i.calidad, i.especificaciones, i.imagen_url,
         i.precio_compra_actual, i.precio_venta_actual, i.created_at, i.updated_at,
         COALESCE(STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria), '') AS categorias_str
  FROM items i
  LEFT JOIN marcas m ON m.id_marca = i.id_marca
  LEFT JOIN item_categorias ic ON ic.id_item = i.id_item
  LEFT JOIN categorias cat ON cat.id_categoria = ic.id_categoria
`;

@Injectable()
export class ItemsService {
  constructor(private readonly dataSource: DataSource) {}

  async create(dto: CreateItemDto, idSede: number): Promise<ItemResponseDto> {
    if (dto.tipo === 'producto' && !dto.categoria_ids?.length) {
      throw new ItemCategoriasRequeridaException();
    }
    if (dto.calidad && dto.tipo !== 'repuesto') {
      throw new ItemCalidadSoloRepuestoException();
    }

    const existing = await this.dataSource.query<{ id_item: number }[]>(
      `SELECT id_item FROM items WHERE sku = $1`,
      [dto.sku],
    );
    if (existing.length > 0) throw new ItemSkuDuplicadoException(dto.sku);

    const id = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const [row] = await manager.query<[{ id_item: number }]>(
          `INSERT INTO items (tipo, sku, nombre, id_marca, modelo, calidad, especificaciones, precio_compra_actual, precio_venta_actual)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
         RETURNING id_item`,
          [
            dto.tipo,
            dto.sku,
            dto.nombre,
            dto.id_marca ?? null,
            dto.modelo ?? null,
            dto.calidad ?? null,
            dto.especificaciones ? JSON.stringify(dto.especificaciones) : null,
            dto.precio_compra_actual,
            dto.precio_venta_actual,
          ],
        );
        if (dto.categoria_ids?.length) {
          const vals = dto.categoria_ids
            .map((_, i) => `($1, $${i + 2})`)
            .join(', ');
          await manager.query(
            `INSERT INTO item_categorias (id_item, id_categoria) VALUES ${vals}`,
            [row.id_item, ...dto.categoria_ids],
          );
        }
        await manager.query(
          `INSERT INTO inventario_sedes (id_sede, id_item, cantidad_actual, stock_minimo)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id_sede, id_item)
           DO UPDATE SET stock_minimo = EXCLUDED.stock_minimo`,
          [idSede, row.id_item, dto.cantidad_inicial ?? 0, dto.stock_minimo ?? 0],
        );
        return row.id_item;
      },
    );

    return this.findOne(id);
  }

  async findAll(
    query: QueryItemsDto,
    idSede?: number,
  ): Promise<PaginatedResult<ItemResponseDto>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query.tipo) {
      conditions.push(`i.tipo = $${idx++}`);
      params.push(query.tipo);
    }
    if (query.nombre) {
      conditions.push(`i.nombre ILIKE $${idx++}`);
      params.push(`%${query.nombre}%`);
    }
    if (query.sku) {
      conditions.push(`i.sku ILIKE $${idx++}`);
      params.push(`%${query.sku}%`);
    }
    if (query.id_marca) {
      conditions.push(`i.id_marca = $${idx++}`);
      params.push(query.id_marca);
    }
    if (query.categoria_id) {
      conditions.push(
        `EXISTS (SELECT 1 FROM item_categorias ic2 WHERE ic2.id_item = i.id_item AND ic2.id_categoria = $${idx++})`,
      );
      params.push(query.categoria_id);
    }
    if (query.con_stock && idSede) {
      conditions.push(
        `EXISTS (SELECT 1 FROM inventario_sedes inv WHERE inv.id_item = i.id_item AND inv.id_sede = $${idx++} AND inv.cantidad_actual > 0)`,
      );
      params.push(idSede);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<[{ total: string }]>(
        `SELECT COUNT(*) AS total FROM items i ${where}`,
        params,
      ),
      this.dataSource.query<ItemRow[]>(
        `${ITEM_SELECT} ${where}
         GROUP BY i.id_item, m.nombre
         ORDER BY i.nombre
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, query.limit, (query.page - 1) * query.limit],
      ),
    ]);

    return {
      items: rows.map(this.toResponse),
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  async findOne(id: number): Promise<ItemResponseDto> {
    const [row] = await this.dataSource.query<ItemRow[]>(
      `${ITEM_SELECT} WHERE i.id_item = $1 GROUP BY i.id_item, m.nombre`,
      [id],
    );
    if (!row) throw new ItemNotFoundException(id);
    return this.toResponse(row);
  }

  async update(id: number, dto: UpdateItemDto): Promise<ItemResponseDto> {
    const current = await this.findOne(id);
    const effectiveTipo = dto.tipo ?? current.tipo;

    if (dto.calidad && effectiveTipo !== 'repuesto') {
      throw new ItemCalidadSoloRepuestoException();
    }
    if (dto.sku) {
      const dup = await this.dataSource.query<{ id_item: number }[]>(
        `SELECT id_item FROM items WHERE sku = $1 AND id_item != $2`,
        [dto.sku, id],
      );
      if (dup.length > 0) throw new ItemSkuDuplicadoException(dto.sku);
    }

    await this.dataSource.transaction(async (manager: EntityManager) => {
      const sets: string[] = [];
      const params: unknown[] = [];
      let setIdx = 1;

      const scalar: [keyof UpdateItemDto, string][] = [
        ['tipo', 'tipo'],
        ['sku', 'sku'],
        ['nombre', 'nombre'],
        ['id_marca', 'id_marca'],
        ['modelo', 'modelo'],
        ['calidad', 'calidad'],
        ['precio_compra_actual', 'precio_compra_actual'],
        ['precio_venta_actual', 'precio_venta_actual'],
      ];
      for (const [key, col] of scalar) {
        if (dto[key] !== undefined) {
          sets.push(`${col} = $${setIdx++}`);
          params.push(dto[key]);
        }
      }
      if (dto.especificaciones !== undefined) {
        sets.push(`especificaciones = $${setIdx++}::jsonb`);
        params.push(JSON.stringify(dto.especificaciones));
      }
      if (sets.length) {
        params.push(id);
        await manager.query(
          `UPDATE items SET ${sets.join(', ')} WHERE id_item = $${setIdx}`,
          params,
        );
      }

      if (dto.categoria_ids !== undefined) {
        if (effectiveTipo === 'producto' && dto.categoria_ids.length === 0) {
          throw new ItemCategoriasRequeridaException();
        }
        if (dto.categoria_ids.length > 0) {
          // Insert new FIRST (trigger only fires on DELETE — prevents 0-category state)
          const vals = dto.categoria_ids
            .map((_, i) => `($1, $${i + 2})`)
            .join(', ');
          await manager.query(
            `INSERT INTO item_categorias (id_item, id_categoria) VALUES ${vals} ON CONFLICT DO NOTHING`,
            [id, ...dto.categoria_ids],
          );
          // Then delete old ones not in new set
          await manager.query(
            `DELETE FROM item_categorias WHERE id_item = $1 AND id_categoria != ALL($2::int[])`,
            [id, dto.categoria_ids],
          );
        } else {
          // repuesto: delete all categories (no minimum required)
          await manager.query(
            `DELETE FROM item_categorias WHERE id_item = $1`,
            [id],
          );
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    try {
      await this.dataSource.query(`DELETE FROM items WHERE id_item = $1`, [id]);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === '23503') {
        throw new ConflictException(
          'No se puede eliminar: el ítem tiene ventas o reparaciones asociadas',
        );
      }
      throw err;
    }
  }

  async ajusteStock(
    id: number,
    dto: AjusteStockDto,
    idSede: number,
  ): Promise<void> {
    const [inv] = await this.dataSource.query<
      [{ id_inventario: number; cantidad_actual: number }]
    >(
      `SELECT id_inventario, cantidad_actual FROM inventario_sedes WHERE id_item = $1 AND id_sede = $2`,
      [id, idSede],
    );
    if (!inv) throw new ItemInventarioNotFoundException(id, idSede);
    if (inv.cantidad_actual + dto.cantidad < 0)
      throw new ItemStockInsuficienteException();

    await this.dataSource.query(
      `UPDATE inventario_sedes SET cantidad_actual = cantidad_actual + $1 WHERE id_inventario = $2`,
      [dto.cantidad, inv.id_inventario],
    );
  }

  async findCategorias(): Promise<
    { id_categoria: number; nombre_categoria: string }[]
  > {
    return this.dataSource.query(
      `SELECT id_categoria, nombre_categoria FROM categorias ORDER BY nombre_categoria`,
    );
  }

  async findMarcas(): Promise<{ id_marca: number; nombre: string }[]> {
    return this.dataSource.query(
      `SELECT id_marca, nombre FROM marcas ORDER BY nombre`,
    );
  }

  private toResponse(row: ItemRow): ItemResponseDto {
    return {
      id_item: row.id_item,
      tipo: row.tipo,
      sku: row.sku,
      nombre: row.nombre,
      id_marca: row.id_marca,
      marca: row.marca ?? null,
      modelo: row.modelo ?? null,
      calidad: row.calidad ?? null,
      especificaciones: row.especificaciones ?? null,
      precio_compra_actual: parseFloat(String(row.precio_compra_actual)),
      precio_venta_actual: parseFloat(String(row.precio_venta_actual)),
      categorias: row.categorias_str ? row.categorias_str.split(', ') : [],
      imagen_url: row.imagen_url ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at ?? null,
    };
  }
}
