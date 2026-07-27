import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
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
import { CreateMarcaDto } from './dto/create-marca.dto';
import { UploadImagenItemDto } from './dto/upload-imagen-item.dto';
import { Item } from './entities/item.entity';
import { Marca } from './entities/marca.entity';
import { Categoria } from './entities/categoria.entity';
import { ItemCategoria } from './entities/item-categoria.entity';
import { InventarioSede } from './entities/inventario-sede.entity';

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

@Injectable()
export class ItemsService {
  private readonly s3: S3Client;

  constructor(
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    @InjectRepository(Marca)
    private readonly marcaRepo: Repository<Marca>,
    @InjectRepository(Categoria)
    private readonly catRepo: Repository<Categoria>,
    @InjectRepository(ItemCategoria)
    private readonly icRepo: Repository<ItemCategoria>,
    @InjectRepository(InventarioSede)
    private readonly invSedeRepo: Repository<InventarioSede>,
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

  // Builds the full item SELECT with STRING_AGG categories and stock subquery.
  private buildItemQb(idSede: number | null) {
    return this.itemRepo
      .createQueryBuilder('i')
      .leftJoin('marcas', 'm', 'm.id_marca = i.id_marca')
      .leftJoin('item_categorias', 'ic', 'ic.id_item = i.id_item')
      .leftJoin('categorias', 'cat', 'cat.id_categoria = ic.id_categoria')
      .select('i.id_item', 'id_item')
      .addSelect('i.tipo', 'tipo')
      .addSelect('i.sku', 'sku')
      .addSelect('i.nombre', 'nombre')
      .addSelect('i.id_marca', 'id_marca')
      .addSelect('m.nombre', 'marca')
      .addSelect('i.modelo', 'modelo')
      .addSelect('i.calidad', 'calidad')
      .addSelect('i.imagen_url', 'imagen_url')
      .addSelect('i.precio_compra_actual', 'precio_compra_actual')
      .addSelect('i.precio_venta_actual', 'precio_venta_actual')
      .addSelect('i.created_at', 'created_at')
      .addSelect('i.updated_at', 'updated_at')
      .addSelect(
        "COALESCE(STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria), '')",
        'categorias_str',
      )
      .addSelect(
        `COALESCE((SELECT inv.cantidad_actual FROM inventario_sedes inv WHERE inv.id_item = i.id_item AND inv.id_sede = :idSede), 0)`,
        'stock_disponible',
      )
      .setParameter('idSede', idSede)
      .groupBy(
        'i.id_item, i.tipo, i.sku, i.nombre, i.id_marca, m.nombre, i.modelo, i.calidad, i.imagen_url, i.precio_compra_actual, i.precio_venta_actual, i.created_at, i.updated_at',
      );
  }

  async create(dto: CreateItemDto, idSede: number): Promise<ItemResponseDto> {
    if (dto.tipo === 'producto' && !dto.categoria_ids?.length) {
      throw new ItemCategoriasRequeridaException();
    }
    if (dto.calidad && dto.tipo !== 'repuesto') {
      throw new ItemCalidadSoloRepuestoException();
    }

    const existing = await this.itemRepo.findOne({ where: { sku: dto.sku }, select: { id_item: true } });
    if (existing) throw new ItemSkuDuplicadoException(dto.sku);

    const id = await this.dataSource.transaction(async (manager) => {
      const item = manager.getRepository(Item).create({
        tipo: dto.tipo,
        sku: dto.sku,
        nombre: dto.nombre,
        id_marca: dto.id_marca ?? null,
        modelo: dto.modelo ?? null,
        calidad: dto.calidad ?? null,
        precio_compra_actual: dto.precio_compra_actual,
        precio_venta_actual: dto.precio_venta_actual,
      });
      const saved = await manager.getRepository(Item).save(item);

      if (dto.categoria_ids?.length) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(ItemCategoria)
          .values(dto.categoria_ids.map((id_categoria) => ({ id_item: saved.id_item, id_categoria })))
          .orIgnore()
          .execute();
      }

      await manager.getRepository(InventarioSede).upsert(
        {
          id_sede: idSede,
          id_item: saved.id_item,
          cantidad_actual: dto.cantidad_inicial ?? 0,
          stock_minimo: dto.stock_minimo ?? 0,
        },
        { conflictPaths: ['id_sede', 'id_item'] },
      );

      return saved.id_item;
    });

    return this.findOne(id);
  }

  async findAll(query: QueryItemsDto, idSede?: number): Promise<PaginatedResult<ItemResponseDto>> {
    const applyFilters = (qb: ReturnType<typeof this.itemRepo.createQueryBuilder>) => {
      if (query.tipo) qb.andWhere('i.tipo = :tipo', { tipo: query.tipo });
      if (query.nombre) qb.andWhere('i.nombre ILIKE :nombre', { nombre: `%${query.nombre}%` });
      if (query.sku) qb.andWhere('i.sku ILIKE :sku', { sku: `%${query.sku}%` });
      if (query.id_marca) qb.andWhere('i.id_marca = :idMarca', { idMarca: query.id_marca });
      if (query.categoria_id) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM item_categorias ic2 WHERE ic2.id_item = i.id_item AND ic2.id_categoria = :catId)',
          { catId: query.categoria_id },
        );
      }
      if (query.con_stock && idSede) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM inventario_sedes inv WHERE inv.id_item = i.id_item AND inv.id_sede = :sedeStock AND inv.cantidad_actual > 0)',
          { sedeStock: idSede },
        );
      }
    };

    const countQb = this.itemRepo.createQueryBuilder('i').select('COUNT(DISTINCT i.id_item)', 'count');
    applyFilters(countQb);
    const countRow = await countQb.getRawOne<{ count: string }>();
    const total = parseInt(countRow?.count ?? '0', 10);

    const dataQb = this.buildItemQb(idSede ?? null).orderBy('i.nombre', 'ASC');
    applyFilters(dataQb);
    const rows = await dataQb
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<ItemRow>();

    return {
      items: rows.map((row) => this.toResponse(row)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: number, idSede?: number): Promise<ItemResponseDto> {
    const row = await this.buildItemQb(idSede ?? null)
      .where('i.id_item = :id', { id })
      .getRawOne<ItemRow>();
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
      const dup = await this.itemRepo.findOne({
        where: { sku: dto.sku },
        select: { id_item: true },
      });
      if (dup && dup.id_item !== id) throw new ItemSkuDuplicadoException(dto.sku);
    }

    await this.dataSource.transaction(async (manager) => {
      const scalar: (keyof UpdateItemDto)[] = [
        'tipo', 'sku', 'nombre', 'id_marca', 'modelo',
        'calidad', 'precio_compra_actual', 'precio_venta_actual',
      ];
      const updates: Partial<Item> = {};
      for (const key of scalar) {
        if (dto[key] !== undefined) (updates as Record<string, unknown>)[key] = dto[key];
      }
      if (Object.keys(updates).length) {
        await manager.getRepository(Item).update({ id_item: id }, updates);
      }

      if (dto.categoria_ids !== undefined) {
        if (effectiveTipo === 'producto' && dto.categoria_ids.length === 0) {
          throw new ItemCategoriasRequeridaException();
        }
        if (dto.categoria_ids.length > 0) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(ItemCategoria)
            .values(dto.categoria_ids.map((id_categoria) => ({ id_item: id, id_categoria })))
            .orIgnore()
            .execute();
          await manager
            .getRepository(ItemCategoria)
            .createQueryBuilder()
            .delete()
            .where('id_item = :id AND id_categoria NOT IN (:...ids)', { id, ids: dto.categoria_ids })
            .execute();
        } else {
          await manager.getRepository(ItemCategoria).delete({ id_item: id });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    try {
      await this.itemRepo.delete({ id_item: id });
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

  async ajusteStock(id: number, dto: AjusteStockDto, idSede: number): Promise<void> {
    const inv = await this.invSedeRepo.findOne({ where: { id_item: id, id_sede: idSede } });
    if (!inv) throw new ItemInventarioNotFoundException(id, idSede);
    if (inv.cantidad_actual + dto.cantidad < 0) throw new ItemStockInsuficienteException();
    await this.invSedeRepo.increment({ id_inventario: inv.id_inventario }, 'cantidad_actual', dto.cantidad);
  }

  async findCategorias(): Promise<{ id_categoria: number; nombre_categoria: string }[]> {
    return this.catRepo.find({ order: { nombre_categoria: 'ASC' } });
  }

  async createCategoria(dto: CreateCategoriaDto): Promise<{ id_categoria: number; nombre_categoria: string }> {
    try {
      return await this.catRepo.save({ nombre_categoria: dto.nombre_categoria.trim() });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === '23505') {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
      throw err;
    }
  }

  async findMarcas(): Promise<{ id_marca: number; nombre: string }[]> {
    return this.marcaRepo.find({ order: { nombre: 'ASC' } });
  }

  async createMarca(dto: CreateMarcaDto): Promise<{ id_marca: number; nombre: string }> {
    try {
      return await this.marcaRepo.save({ nombre: dto.nombre.trim() });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === '23505') {
        throw new ConflictException('Ya existe una marca con ese nombre');
      }
      throw err;
    }
  }

  async findSedes(): Promise<{ id_sede: number; nombre: string }[]> {
    return this.dataSource
      .createQueryBuilder()
      .select(['s.id_sede', 's.nombre'])
      .from('sedes', 's')
      .orderBy('s.id_sede', 'ASC')
      .getRawMany<{ id_sede: number; nombre: string }>();
  }

  async uploadImagen(id: number, dto: UploadImagenItemDto): Promise<{ url: string }> {
    const exists = await this.itemRepo.findOne({ where: { id_item: id }, select: { id_item: true } });
    if (!exists) throw new NotFoundException(`Ítem ${id} no encontrado`);

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
    await this.itemRepo.update({ id_item: id }, { imagen_url: url });

    return { url };
  }

  private getR2Config(): { bucket: string; publicUrl: string } {
    const required = [
      'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME', 'R2_PUBLIC_URL',
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
      precio_compra_actual: parseFloat(String(row.precio_compra_actual)),
      precio_venta_actual: parseFloat(String(row.precio_venta_actual)),
      categorias: row.categorias_str ? row.categorias_str.split(', ') : [],
      imagen_url: row.imagen_url ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at ?? null,
      stock_disponible: Number(row.stock_disponible ?? 0),
    };
  }
}
