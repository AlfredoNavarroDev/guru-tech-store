import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
import { UploadImagenItemDto } from './dto/upload-imagen-item.dto';

// Forma de cada fila que devuelven las queries SQL de ítems.
interface ItemRow {
  id_item: number;
  tipo: 'producto' | 'repuesto';
  sku: string;
  nombre: string;
  id_marca: number | null;
  marca: string | null;
  modelo: string | null;
  calidad: string | null;
  precio_compra_actual: string;
  precio_venta_actual: string;
  created_at: Date;
  updated_at: Date | null;
  categorias_str: string;
  imagen_url: string | null;
  stock_disponible: string | number;
}

// stockParamIdx: posición del parámetro $N con el id_sede (o null) para la subconsulta de stock.
// Construye el SELECT base con JOIN a marcas y categorías; el stock se obtiene por subconsulta correlacionada a inventario_sedes.
const itemSelect = (stockParamIdx: number) => `
  SELECT i.id_item, i.tipo, i.sku, i.nombre, i.id_marca, m.nombre AS marca,
         i.modelo, i.calidad, i.imagen_url,
         i.precio_compra_actual, i.precio_venta_actual, i.created_at, i.updated_at,
         COALESCE(STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria), '') AS categorias_str,
         COALESCE(
           (SELECT inv.cantidad_actual FROM inventario_sedes inv
            WHERE inv.id_item = i.id_item AND inv.id_sede = $${stockParamIdx}),
           0
         ) AS stock_disponible
  FROM items i
  LEFT JOIN marcas m ON m.id_marca = i.id_marca
  LEFT JOIN item_categorias ic ON ic.id_item = i.id_item
  LEFT JOIN categorias cat ON cat.id_categoria = ic.id_categoria
`;

// Servicio principal del módulo de ítems: opera con SQL nativo sobre DataSource para mayor control.
@Injectable()
export class ItemsService {
  private readonly s3: S3Client;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.get<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  // Crea el ítem, vincula sus categorías y registra el inventario inicial en la sede, todo en una sola transacción.
  async create(dto: CreateItemDto, idSede: number): Promise<ItemResponseDto> {
    // Los productos deben tener al menos una categoría; la calidad es exclusiva de repuestos.
    if (dto.tipo === 'producto' && !dto.categoria_ids?.length) {
      throw new ItemCategoriasRequeridaException();
    }
    if (dto.calidad && dto.tipo !== 'repuesto') {
      throw new ItemCalidadSoloRepuestoException();
    }

    // Verifica unicidad del SKU antes de abrir la transacción para un error más claro.
    const existing = await this.dataSource.query<{ id_item: number }[]>(
      `SELECT id_item FROM items WHERE sku = $1`,
      [dto.sku],
    );
    if (existing.length > 0) throw new ItemSkuDuplicadoException(dto.sku);

    const id = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        // Inserta el ítem y recupera el ID generado.
        const [row] = await manager.query<[{ id_item: number }]>(
          `INSERT INTO items (tipo, sku, nombre, id_marca, modelo, calidad, precio_compra_actual, precio_venta_actual)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id_item`,
          [
            dto.tipo,
            dto.sku,
            dto.nombre,
            dto.id_marca ?? null,
            dto.modelo ?? null,
            dto.calidad ?? null,
            dto.precio_compra_actual,
            dto.precio_venta_actual,
          ],
        );
        // Inserta las relaciones ítem-categoría generando los placeholders dinámicamente.
        if (dto.categoria_ids?.length) {
          const vals = dto.categoria_ids
            .map((_, i) => `($1, $${i + 2})`)
            .join(', ');
          await manager.query(
            `INSERT INTO item_categorias (id_item, id_categoria) VALUES ${vals}`,
            [row.id_item, ...dto.categoria_ids],
          );
        }
        // ON CONFLICT permite reutilizar este bloque si el inventario ya existe (actualiza stock_minimo).
        await manager.query(
          `INSERT INTO inventario_sedes (id_sede, id_item, cantidad_actual, stock_minimo)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id_sede, id_item)
           DO UPDATE SET stock_minimo = EXCLUDED.stock_minimo`,
          [
            idSede,
            row.id_item,
            dto.cantidad_inicial ?? 0,
            dto.stock_minimo ?? 0,
          ],
        );
        return row.id_item;
      },
    );

    return this.findOne(id);
  }

  // Devuelve una página de ítems filtrados; construye la cláusula WHERE dinámicamente con parámetros posicionales.
  async findAll(
    query: QueryItemsDto,
    idSede?: number,
  ): Promise<PaginatedResult<ItemResponseDto>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Cada bloque agrega su condición y avanza el índice del parámetro posicional.
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
      // Filtra con EXISTS para evitar duplicados al hacer JOIN con item_categorias.
      conditions.push(
        `EXISTS (SELECT 1 FROM item_categorias ic2 WHERE ic2.id_item = i.id_item AND ic2.id_categoria = $${idx++})`,
      );
      params.push(query.categoria_id);
    }

    // id_sede: usado en filtro con_stock y en subconsulta stock_disponible (solo rows query).
    // Postgres no puede inferir el tipo de un parámetro que no aparece en la query,
    // así que solo se incluye en cada query cuando realmente se referencia.
    const sedeParamIdx = idx++;
    if (query.con_stock && idSede) {
      conditions.push(
        `EXISTS (SELECT 1 FROM inventario_sedes inv WHERE inv.id_item = i.id_item AND inv.id_sede = $${sedeParamIdx} AND inv.cantidad_actual > 0)`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    // Solo se pasa id_sede al COUNT si la cláusula WHERE lo referencia, para evitar parámetros huérfanos.
    const usesSedeParam = where.includes(`$${sedeParamIdx}`);

    const countParams = usesSedeParam ? [...params, idSede ?? null] : params;
    const rowsParams = [...params, idSede ?? null];
    const limitIdx = rowsParams.length + 1;
    const offsetIdx = limitIdx + 1;

    // Ejecuta COUNT y filas en paralelo para reducir latencia.
    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<[{ total: string }]>(
        `SELECT COUNT(*) AS total FROM items i ${where}`,
        countParams,
      ),
      this.dataSource.query<ItemRow[]>(
        `${itemSelect(sedeParamIdx)} ${where}
         GROUP BY i.id_item, m.nombre
         ORDER BY i.nombre
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...rowsParams, query.limit, (query.page - 1) * query.limit],
      ),
    ]);

    return {
      items: rows.map((row) => this.toResponse(row)),
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  // Busca un ítem por PK; lanza 404 si no existe. El segundo parámetro (null) ocupa el slot del id_sede en el SELECT base.
  async findOne(id: number): Promise<ItemResponseDto> {
    const [row] = await this.dataSource.query<ItemRow[]>(
      `${itemSelect(2)} WHERE i.id_item = $1 GROUP BY i.id_item, m.nombre`,
      [id, null],
    );
    if (!row) throw new ItemNotFoundException(id);
    return this.toResponse(row);
  }

  // Actualiza campos escalares y, opcionalmente, reemplaza el conjunto de categorías del ítem.
  async update(id: number, dto: UpdateItemDto): Promise<ItemResponseDto> {
    const current = await this.findOne(id);
    // effectiveTipo considera el tipo resultante (enviado o existente) para validar la calidad.
    const effectiveTipo = dto.tipo ?? current.tipo;

    if (dto.calidad && effectiveTipo !== 'repuesto') {
      throw new ItemCalidadSoloRepuestoException();
    }
    // Comprueba duplicidad de SKU excluyendo el propio ítem.
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

      // Genera los pares «columna = $N» solo para los campos presentes en el DTO.
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

  // Elimina el ítem; intercepta la violación de FK (23503) y la convierte en un ConflictException legible.
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

  // Aplica un delta de stock (positivo = entrada, negativo = salida) sobre la entrada de inventario de la sede.
  async ajusteStock(
    id: number,
    dto: AjusteStockDto,
    idSede: number,
  ): Promise<void> {
    // Verifica que exista registro de inventario para el ítem en la sede del usuario.
    const [inv] = await this.dataSource.query<
      [{ id_inventario: number; cantidad_actual: number }]
    >(
      `SELECT id_inventario, cantidad_actual FROM inventario_sedes WHERE id_item = $1 AND id_sede = $2`,
      [id, idSede],
    );
    if (!inv) throw new ItemInventarioNotFoundException(id, idSede);
    // Impide que el stock quede en negativo antes de ejecutar el UPDATE.
    if (inv.cantidad_actual + dto.cantidad < 0)
      throw new ItemStockInsuficienteException();

    await this.dataSource.query(
      `UPDATE inventario_sedes SET cantidad_actual = cantidad_actual + $1 WHERE id_inventario = $2`,
      [dto.cantidad, inv.id_inventario],
    );
  }

  // Devuelve todas las categorías ordenadas alfabéticamente (para selectores en el frontend).
  async findCategorias(): Promise<
    { id_categoria: number; nombre_categoria: string }[]
  > {
    return this.dataSource.query(
      `SELECT id_categoria, nombre_categoria FROM categorias ORDER BY nombre_categoria`,
    );
  }

  // Devuelve todas las marcas ordenadas alfabéticamente (para selectores en el frontend).
  async findMarcas(): Promise<{ id_marca: number; nombre: string }[]> {
    return this.dataSource.query(
      `SELECT id_marca, nombre FROM marcas ORDER BY nombre`,
    );
  }

  // Devuelve todas las sedes ordenadas por id (para selectores en el frontend).
  async findSedes(): Promise<{ id_sede: number; nombre: string }[]> {
    return this.dataSource.query(
      `SELECT id_sede, nombre FROM sedes ORDER BY id_sede`,
    );
  }

  // Sube imagen de ítem a Cloudflare R2 y actualiza imagen_url en la tabla items.
  // La clave incluye un timestamp para evitar colisiones al actualizar la imagen.
  async uploadImagen(
    id: number,
    dto: UploadImagenItemDto,
  ): Promise<{ url: string }> {
    const exists = await this.dataSource.query(
      `SELECT id_item FROM items WHERE id_item = $1`,
      [id],
    );
    if (!exists.length) throw new NotFoundException(`Ítem ${id} no encontrado`);

    const buffer = Buffer.from(dto.imagen_base64, 'base64');
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[dto.content_type] ?? 'jpg';
    const key = `fotos/items/${id}-${Date.now()}.${ext}`;
    const r2 = this.getR2Config();

    await this.s3.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: dto.content_type,
      }),
    );

    const url = `${r2.publicUrl}/${key}`;
    await this.dataSource.query(
      `UPDATE items SET imagen_url = $1 WHERE id_item = $2`,
      [url, id],
    );

    return { url };
  }

  // Valida las 5 variables de entorno de R2 y devuelve bucket + publicUrl. Falla rápido si faltan.
  private getR2Config(): { bucket: string; publicUrl: string } {
    const required = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
    ] as const;
    const missing = required.filter((k) => !this.config.get<string>(k));
    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Configuración R2 incompleta: ${missing.join(', ')}`,
      );
    }
    return {
      bucket: this.config.get<string>('R2_BUCKET_NAME')!,
      publicUrl: this.config.get<string>('R2_PUBLIC_URL')!,
    };
  }

  // Convierte la fila SQL cruda al DTO de respuesta, normalizando tipos numéricos y la lista de categorías.
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
      // Postgres devuelve DECIMAL como string; parseFloat lo normaliza a número JS.
      precio_compra_actual: parseFloat(String(row.precio_compra_actual)),
      precio_venta_actual: parseFloat(String(row.precio_venta_actual)),
      // STRING_AGG devuelve una cadena; la convertimos en array (o vacío si no hay categorías).
      categorias: row.categorias_str ? row.categorias_str.split(', ') : [],
      imagen_url: row.imagen_url ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at ?? null,
      stock_disponible: Number(row.stock_disponible ?? 0),
    };
  }
}
