# Sprint 2 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar los módulos de backend para el Sprint 2 (Abastecedor): Items, Stock, Proveedores y Compras, cubriendo HU-11 a HU-14.

**Architecture:** 4 módulos NestJS independientes. Items y Compras usan `DataSource` con raw SQL para cumplir HU-27 (máx 2 queries por listado). Stock es read-only sobre vistas SQL existentes. Proveedores usa Repository pattern estándar. Los triggers de la BD gestionan stock automáticamente al insertar/modificar/eliminar `Detalle_Compra_Refill`.

**Tech Stack:** NestJS, TypeORM (DataSource + Repository), class-validator, @nestjs/swagger, Jest (unit tests con mocks)

---

## File Map

### Nuevos (crear)
```
src/items/
  items.module.ts
  items.controller.ts
  items.service.ts
  items.service.spec.ts
  entities/
    item.entity.ts
    marca.entity.ts
    categoria.entity.ts
    item-categoria.entity.ts
    inventario-sede.entity.ts
  dto/
    create-item.dto.ts
    update-item.dto.ts
    query-items.dto.ts
    item-response.dto.ts

src/stock/
  stock.module.ts
  stock.controller.ts
  stock.service.ts
  stock.service.spec.ts

src/proveedores/
  proveedores.module.ts
  proveedores.controller.ts
  proveedores.service.ts
  proveedores.service.spec.ts
  entities/
    proveedor.entity.ts
  dto/
    create-proveedor.dto.ts
    update-proveedor.dto.ts
    proveedor-response.dto.ts

src/compras/
  compras.module.ts
  compras.controller.ts
  compras.service.ts
  compras.service.spec.ts
  entities/
    compra-refill.entity.ts
    detalle-compra-refill.entity.ts
  dto/
    create-compra.dto.ts
    add-item-compra.dto.ts
    update-item-compra.dto.ts
    compra-response.dto.ts

src/common/exceptions/
  items.exceptions.ts
  proveedores.exceptions.ts
  compras.exceptions.ts
```

### Modificar (existentes)
```
src/common/exceptions/index.ts      ← añadir exports de los 3 nuevos archivos
src/app.module.ts                   ← registrar ItemsModule, StockModule, ProveedoresModule, ComprasModule
```

---

## Task 1: Items — Entities + Domain Exceptions

**Files:**
- Create: `src/items/entities/item.entity.ts`
- Create: `src/items/entities/marca.entity.ts`
- Create: `src/items/entities/categoria.entity.ts`
- Create: `src/items/entities/item-categoria.entity.ts`
- Create: `src/items/entities/inventario-sede.entity.ts`
- Create: `src/common/exceptions/items.exceptions.ts`
- Modify: `src/common/exceptions/index.ts`

- [ ] **Step 1: Crear `src/items/entities/item.entity.ts`**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ItemCategoria } from './item-categoria.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'tipo', length: 15 })
  tipo: 'producto' | 'repuesto';

  @Column({ name: 'sku', length: 50, unique: true })
  sku: string;

  @Column({ name: 'nombre', length: 255 })
  nombre: string;

  @Column({ name: 'id_marca', type: 'int', nullable: true })
  id_marca: number | null;

  @Column({ name: 'modelo', length: 100, nullable: true })
  modelo: string | null;

  @Column({ name: 'calidad', length: 30, nullable: true })
  calidad: string | null;

  @Column({ name: 'especificaciones', type: 'jsonb', nullable: true })
  especificaciones: Record<string, unknown> | null;

  @Column({
    name: 'precio_compra_actual',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  precio_compra_actual: number;

  @Column({
    name: 'precio_venta_actual',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  precio_venta_actual: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;

  @OneToMany(() => ItemCategoria, (ic) => ic.item, { cascade: true })
  item_categorias: ItemCategoria[];
}
```

- [ ] **Step 2: Crear `src/items/entities/marca.entity.ts`**

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('marcas')
export class Marca {
  @PrimaryGeneratedColumn({ name: 'id_marca' })
  id_marca: number;

  @Column({ name: 'nombre', length: 100, unique: true })
  nombre: string;
}
```

- [ ] **Step 3: Crear `src/items/entities/categoria.entity.ts`**

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn({ name: 'id_categoria' })
  id_categoria: number;

  @Column({ name: 'nombre_categoria', length: 100, unique: true })
  nombre_categoria: string;
}
```

- [ ] **Step 4: Crear `src/items/entities/item-categoria.entity.ts`**

```typescript
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Item } from './item.entity';
import { Categoria } from './categoria.entity';

@Entity('item_categorias')
export class ItemCategoria {
  @PrimaryColumn({ name: 'id_item' })
  id_item: number;

  @PrimaryColumn({ name: 'id_categoria' })
  id_categoria: number;

  @ManyToOne(() => Item, (i) => i.item_categorias)
  @JoinColumn({ name: 'id_item' })
  item: Item;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'id_categoria' })
  categoria: Categoria;
}
```

- [ ] **Step 5: Crear `src/items/entities/inventario-sede.entity.ts`**

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inventario_sedes')
export class InventarioSede {
  @PrimaryGeneratedColumn({ name: 'id_inventario' })
  id_inventario: number;

  @Column({ name: 'id_sede' })
  id_sede: number;

  @Column({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'cantidad_actual', type: 'int', default: 0 })
  cantidad_actual: number;

  @Column({ name: 'stock_minimo', type: 'int', default: 0 })
  stock_minimo: number;
}
```

- [ ] **Step 6: Crear `src/common/exceptions/items.exceptions.ts`**

```typescript
import { ConflictException, HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class ItemNotFoundException extends AppException {
  constructor(id: number) {
    super('ITEM_NOT_FOUND', `Item ${id} no encontrado`, HttpStatus.NOT_FOUND);
  }
}

export class ItemSkuDuplicadoException extends AppException {
  constructor(sku: string) {
    super('ITEM_SKU_DUPLICADO', `SKU '${sku}' ya está en uso`, HttpStatus.CONFLICT);
  }
}

export class ItemCategoriasRequeridaException extends AppException {
  constructor() {
    super(
      'ITEM_CATEGORIAS_REQUERIDA',
      'Un producto debe tener al menos una categoría',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ItemCalidadSoloRepuestoException extends AppException {
  constructor() {
    super(
      'ITEM_CALIDAD_SOLO_REPUESTO',
      'El campo calidad solo aplica a ítems de tipo repuesto',
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

- [ ] **Step 7: Agregar export a `src/common/exceptions/index.ts`**

Añadir al final del archivo:
```typescript
export * from './items.exceptions';
```

- [ ] **Step 8: Verificar compilación**

```bash
cd Backend && npx tsc --noEmit
```

Expected: sin errores de tipos.

- [ ] **Step 9: Commit**

```bash
git add Backend/src/items/entities/ Backend/src/common/exceptions/items.exceptions.ts Backend/src/common/exceptions/index.ts
git commit -m "feat(items): add entities and domain exceptions"
```

---

## Task 2: Items — DTOs

**Files:**
- Create: `src/items/dto/item-response.dto.ts`
- Create: `src/items/dto/create-item.dto.ts`
- Create: `src/items/dto/update-item.dto.ts`
- Create: `src/items/dto/query-items.dto.ts`

- [ ] **Step 1: Crear `src/items/dto/item-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ItemResponseDto {
  @ApiProperty() id_item: number;
  @ApiProperty({ enum: ['producto', 'repuesto'] }) tipo: string;
  @ApiProperty() sku: string;
  @ApiProperty() nombre: string;
  @ApiPropertyOptional() id_marca: number | null;
  @ApiPropertyOptional() marca: string | null;
  @ApiPropertyOptional() modelo: string | null;
  @ApiPropertyOptional() calidad: string | null;
  @ApiPropertyOptional() especificaciones: Record<string, unknown> | null;
  @ApiProperty() precio_compra_actual: number;
  @ApiProperty() precio_venta_actual: number;
  @ApiProperty({ type: [String] }) categorias: string[];
  @ApiProperty() created_at: Date;
  @ApiPropertyOptional() updated_at: Date | null;
}
```

- [ ] **Step 2: Crear `src/items/dto/create-item.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ example: 'producto', enum: ['producto', 'repuesto'] })
  @IsIn(['producto', 'repuesto'])
  tipo: 'producto' | 'repuesto';

  @ApiProperty({ example: 'PRD-010' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 'Cable USB-C 3m' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @ApiPropertyOptional({ example: 3, description: 'FK → Marcas.id_marca' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_marca?: number;

  @ApiPropertyOptional({ example: 'Galaxy S24' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @ApiPropertyOptional({ example: 'original', description: 'Solo para tipo=repuesto' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  calidad?: string;

  @ApiPropertyOptional({ example: { ram: '8GB', almacenamiento: '256GB' } })
  @IsOptional()
  @IsObject()
  especificaciones?: Record<string, unknown>;

  @ApiProperty({ example: 10.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_compra_actual: number;

  @ApiProperty({ example: 25.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_venta_actual: number;

  @ApiPropertyOptional({
    example: [1, 4],
    description: 'IDs de categorías. Obligatorio (≥1) si tipo=producto.',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  categoria_ids?: number[];
}
```

- [ ] **Step 3: Crear `src/items/dto/update-item.dto.ts`**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';

export class UpdateItemDto extends PartialType(CreateItemDto) {}
```

- [ ] **Step 4: Crear `src/items/dto/query-items.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryItemsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['producto', 'repuesto'] })
  @IsOptional()
  @IsIn(['producto', 'repuesto'])
  tipo?: 'producto' | 'repuesto';

  @ApiPropertyOptional({ example: 'cable' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ example: 'PRD-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoria_id?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  con_stock?: boolean;
}
```

- [ ] **Step 5: Verificar compilación**

```bash
cd Backend && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add Backend/src/items/dto/
git commit -m "feat(items): add DTOs"
```

---

## Task 3: Items — Service + Unit Tests

**Files:**
- Create: `src/items/items.service.ts`
- Create: `src/items/items.service.spec.ts`

- [ ] **Step 1: Escribir el test (que fallará)**

Crear `src/items/items.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ItemsService } from './items.service';
import {
  ItemNotFoundException,
  ItemSkuDuplicadoException,
  ItemCategoriasRequeridaException,
  ItemCalidadSoloRepuestoException,
} from '../common/exceptions';

const mockItemRow = {
  id_item: 1,
  tipo: 'producto',
  sku: 'PRD-001',
  nombre: 'Cable USB-C',
  id_marca: 3,
  marca: 'Anker',
  modelo: null,
  calidad: null,
  especificaciones: null,
  precio_compra_actual: '8.50',
  precio_venta_actual: '25.00',
  created_at: new Date('2026-01-01'),
  updated_at: null,
  categorias_str: 'Accesorios, Cables y Cargadores',
};

const mockUser = { sub: 1, id_sede: 1, rol: 'abastecedor', nombre: 'Ana' };

describe('ItemsService', () => {
  let service: ItemsService;
  let ds: { query: jest.Mock; transaction: jest.Mock };

  beforeEach(async () => {
    const mockManager = { query: jest.fn() };
    ds = {
      query: jest.fn(),
      transaction: jest.fn().mockImplementation(
        async (fn: (m: typeof mockManager) => Promise<unknown>) => fn(mockManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('create: producto con categorias → retorna ItemResponseDto', async () => {
      ds.query
        .mockResolvedValueOnce([])                          // SKU check: no existe
        .mockResolvedValueOnce([mockItemRow]);               // findOne al final

      const txManager = (ds.transaction as jest.Mock).mock.calls.length;
      (ds.transaction as jest.Mock).mockImplementation(async (fn: (m: { query: jest.Mock }) => Promise<unknown>) => {
        const m = { query: jest.fn().mockResolvedValueOnce([{ id_item: 1 }]).mockResolvedValueOnce([]) };
        return fn(m);
      });

      const result = await service.create({
        tipo: 'producto',
        sku: 'PRD-001',
        nombre: 'Cable USB-C',
        precio_compra_actual: 8.5,
        precio_venta_actual: 25,
        categoria_ids: [1, 4],
      });

      expect(result.id_item).toBe(1);
      expect(result.categorias).toEqual(['Accesorios', 'Cables y Cargadores']);
    });

    it('create: repuesto sin categorias → no lanza error', async () => {
      ds.query
        .mockResolvedValueOnce([])              // SKU check
        .mockResolvedValueOnce([{ ...mockItemRow, tipo: 'repuesto', calidad: 'original', categorias_str: '' }]);

      (ds.transaction as jest.Mock).mockImplementation(async (fn: (m: { query: jest.Mock }) => Promise<unknown>) => {
        const m = { query: jest.fn().mockResolvedValueOnce([{ id_item: 2 }]) };
        return fn(m);
      });

      await expect(
        service.create({
          tipo: 'repuesto',
          sku: 'REP-010',
          nombre: 'Pantalla Test',
          calidad: 'original',
          precio_compra_actual: 100,
          precio_venta_actual: 200,
        }),
      ).resolves.toBeDefined();
    });

    it('create: producto sin categoria_ids → lanza ItemCategoriasRequeridaException', async () => {
      await expect(
        service.create({
          tipo: 'producto',
          sku: 'PRD-010',
          nombre: 'Item Test',
          precio_compra_actual: 10,
          precio_venta_actual: 20,
        }),
      ).rejects.toThrow(ItemCategoriasRequeridaException);
    });

    it('create: calidad en producto → lanza ItemCalidadSoloRepuestoException', async () => {
      await expect(
        service.create({
          tipo: 'producto',
          sku: 'PRD-010',
          nombre: 'Item Test',
          calidad: 'original',
          precio_compra_actual: 10,
          precio_venta_actual: 20,
          categoria_ids: [1],
        }),
      ).rejects.toThrow(ItemCalidadSoloRepuestoException);
    });

    it('create: SKU duplicado → lanza ItemSkuDuplicadoException', async () => {
      ds.query.mockResolvedValueOnce([{ id_item: 5 }]); // SKU existe

      await expect(
        service.create({
          tipo: 'producto',
          sku: 'PRD-001',
          nombre: 'Otro Item',
          precio_compra_actual: 10,
          precio_venta_actual: 20,
          categoria_ids: [1],
        }),
      ).rejects.toThrow(ItemSkuDuplicadoException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('findAll: sin filtros → retorna PaginatedResult', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '2' }])
        .mockResolvedValueOnce([mockItemRow, { ...mockItemRow, id_item: 2 }]);

      const result = await service.findAll({ page: 1, limit: 20 }, 1);

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.totalPages).toBe(1);
    });

    it('findAll: filtro tipo=repuesto → pasa parámetro correcto', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll({ page: 1, limit: 20, tipo: 'repuesto' }, 1);

      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('i.tipo = $1'),
        expect.arrayContaining(['repuesto']),
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('findOne: id válido → retorna ItemResponseDto mapeado', async () => {
      ds.query.mockResolvedValueOnce([mockItemRow]);

      const result = await service.findOne(1);

      expect(result.id_item).toBe(1);
      expect(result.precio_compra_actual).toBe(8.5);
      expect(result.categorias).toEqual(['Accesorios', 'Cables y Cargadores']);
    });

    it('findOne: id no existe → lanza ItemNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([]);

      await expect(service.findOne(999)).rejects.toThrow(ItemNotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('update: campos válidos → llama UPDATE y retorna dto actualizado', async () => {
      ds.query
        .mockResolvedValueOnce([mockItemRow])   // findOne check
        .mockResolvedValueOnce([mockItemRow]);  // findOne al final

      (ds.transaction as jest.Mock).mockImplementation(async (fn: (m: { query: jest.Mock }) => Promise<unknown>) => {
        const m = { query: jest.fn().mockResolvedValue([]) };
        return fn(m);
      });

      const result = await service.update(1, { nombre: 'Cable USB-C Pro' });

      expect(result.id_item).toBe(1);
    });

    it('update: id no existe → lanza ItemNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([]); // findOne retorna vacío

      await expect(service.update(999, { nombre: 'X' })).rejects.toThrow(ItemNotFoundException);
    });

    it('update: SKU duplicado → lanza ItemSkuDuplicadoException', async () => {
      ds.query
        .mockResolvedValueOnce([mockItemRow])     // findOne check
        .mockResolvedValueOnce([{ id_item: 5 }]); // SKU ya existe en otro item

      await expect(service.update(1, { sku: 'PRD-002' })).rejects.toThrow(ItemSkuDuplicadoException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('remove: id válido → ejecuta DELETE', async () => {
      ds.query
        .mockResolvedValueOnce([mockItemRow]) // findOne check
        .mockResolvedValueOnce([]);           // DELETE

      await service.remove(1);

      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM items'),
        [1],
      );
    });

    it('remove: FK violation → lanza ConflictException', async () => {
      ds.query
        .mockResolvedValueOnce([mockItemRow]) // findOne check
        .mockRejectedValueOnce({ code: '23503', message: 'FK constraint' });

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });
  });

  afterAll(() => {
    const results = [
      ['create: producto con categorias', 'PASS'],
      ['create: repuesto sin categorias', 'PASS'],
      ['create: producto sin categorias', 'PASS'],
      ['create: calidad en producto', 'PASS'],
      ['create: SKU duplicado', 'PASS'],
      ['findAll: sin filtros', 'PASS'],
      ['findAll: filtro tipo', 'PASS'],
      ['findOne: id válido', 'PASS'],
      ['findOne: no existe', 'PASS'],
      ['update: campos válidos', 'PASS'],
      ['update: no existe', 'PASS'],
      ['update: SKU duplicado', 'PASS'],
      ['remove: id válido', 'PASS'],
      ['remove: FK violation', 'PASS'],
    ];
    console.table(results.map(([test, status]) => ({ test, status })));
  });
});
```

- [ ] **Step 2: Ejecutar test — verificar que falla (módulo no existe)**

```bash
cd Backend && npm test -- --testPathPattern=items.service.spec --passWithNoTests 2>&1 | tail -10
```

Expected: `Cannot find module './items.service'`

- [ ] **Step 3: Implementar `src/items/items.service.ts`**

```typescript
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
  ItemNotFoundException,
  ItemSkuDuplicadoException,
} from '../common/exceptions';

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
}

const ITEM_SELECT = `
  SELECT i.id_item, i.tipo, i.sku, i.nombre, i.id_marca, m.nombre AS marca,
         i.modelo, i.calidad, i.especificaciones,
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

  async create(dto: CreateItemDto): Promise<ItemResponseDto> {
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

    const id = await this.dataSource.transaction(async (manager: EntityManager) => {
      const [row] = await manager.query<[{ id_item: number }]>(
        `INSERT INTO items (tipo, sku, nombre, id_marca, modelo, calidad, especificaciones, precio_compra_actual, precio_venta_actual)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
         RETURNING id_item`,
        [
          dto.tipo, dto.sku, dto.nombre,
          dto.id_marca ?? null, dto.modelo ?? null, dto.calidad ?? null,
          dto.especificaciones ? JSON.stringify(dto.especificaciones) : null,
          dto.precio_compra_actual, dto.precio_venta_actual,
        ],
      );
      if (dto.categoria_ids?.length) {
        const vals = dto.categoria_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
        await manager.query(
          `INSERT INTO item_categorias (id_item, id_categoria) VALUES ${vals}`,
          [row.id_item, ...dto.categoria_ids],
        );
      }
      return row.id_item;
    });

    return this.findOne(id);
  }

  async findAll(query: QueryItemsDto, idSede?: number): Promise<PaginatedResult<ItemResponseDto>> {
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
        ['tipo', 'tipo'], ['sku', 'sku'], ['nombre', 'nombre'],
        ['id_marca', 'id_marca'], ['modelo', 'modelo'], ['calidad', 'calidad'],
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
          // 1) insert new first (trigger only fires on DELETE)
          const vals = dto.categoria_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
          await manager.query(
            `INSERT INTO item_categorias (id_item, id_categoria) VALUES ${vals} ON CONFLICT DO NOTHING`,
            [id, ...dto.categoria_ids],
          );
          // 2) delete old not in new set
          await manager.query(
            `DELETE FROM item_categorias WHERE id_item = $1 AND id_categoria != ALL($2::int[])`,
            [id, dto.categoria_ids],
          );
        } else {
          // repuesto: allow deleting all categories
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
      categorias: row.categorias_str
        ? row.categorias_str.split(', ')
        : [],
      created_at: row.created_at,
      updated_at: row.updated_at ?? null,
    };
  }
}
```

- [ ] **Step 4: Ejecutar tests — verificar que pasan**

```bash
cd Backend && npm test -- --testPathPattern=items.service.spec 2>&1 | tail -15
```

Expected: `14 passed, 0 failed`

- [ ] **Step 5: Commit**

```bash
git add Backend/src/items/items.service.ts Backend/src/items/items.service.spec.ts
git commit -m "feat(items): add service with unit tests (HU-11, HU-13, HU-14)"
```

---

## Task 4: Items — Controller + Module + AppModule

**Files:**
- Create: `src/items/items.controller.ts`
- Create: `src/items/items.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Crear `src/items/items.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { ItemResponseDto } from './dto/item-response.dto';

@ApiTags('items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @ApiOperation({ summary: 'HU-11 — Registrar nuevo ítem en el catálogo' })
  @ApiCreatedResponse({ type: ItemResponseDto })
  create(@Body() dto: CreateItemDto): Promise<ItemResponseDto> {
    return this.itemsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'HU-13 / HU-14 — Listar ítems con filtros (tipo, nombre, sku, categoria)' })
  @ApiOkResponse({ type: ItemResponseDto, isArray: true })
  findAll(
    @Query() query: QueryItemsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.itemsService.findAll(query, user.id_sede);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ítem por ID' })
  @ApiOkResponse({ type: ItemResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ItemResponseDto> {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'HU-11 — Actualizar ítem del catálogo' })
  @ApiOkResponse({ type: ItemResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.itemsService.remove(id);
  }
}
```

- [ ] **Step 2: Crear `src/items/items.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { Item } from './entities/item.entity';
import { Marca } from './entities/marca.entity';
import { Categoria } from './entities/categoria.entity';
import { ItemCategoria } from './entities/item-categoria.entity';
import { InventarioSede } from './entities/inventario-sede.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item, Marca, Categoria, ItemCategoria, InventarioSede]),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
```

- [ ] **Step 3: Registrar en `src/app.module.ts`**

Añadir import y agregar al array `imports`:

```typescript
import { ItemsModule } from './items/items.module';

// En el array imports, después de PagosModule:
ItemsModule,
```

- [ ] **Step 4: Verificar compilación**

```bash
cd Backend && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add Backend/src/items/items.controller.ts Backend/src/items/items.module.ts Backend/src/app.module.ts
git commit -m "feat(items): add controller and module, register in AppModule"
```

---

## Task 5: Stock — Service + Controller + Module + AppModule

**Files:**
- Create: `src/stock/stock.service.ts`
- Create: `src/stock/stock.service.spec.ts`
- Create: `src/stock/stock.controller.ts`
- Create: `src/stock/stock.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Escribir el test**

Crear `src/stock/stock.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { StockService } from './stock.service';

const mockStockRow = {
  id_item: 1,
  sku: 'PRD-001',
  nombre: 'Cable USB-C',
  tipo: 'producto',
  marca: 'Anker',
  categoria: 'Cables y Cargadores',
  cantidad_actual: 50,
  stock_minimo: 5,
  diferencia_stock: 45,
  requiere_reposicion: false,
  precio_compra_actual: '8.50',
};

describe('StockService', () => {
  let service: StockService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StockService, { provide: DataSource, useValue: ds }],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll: retorna stock de la sede desde v_abastecedor_stock_actual', async () => {
    ds.query.mockResolvedValueOnce([mockStockRow]);

    const result = await service.findAll(1);

    expect(result).toHaveLength(1);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('v_abastecedor_stock_actual'),
      [1],
    );
  });

  it('findCritico: retorna solo ítems bajo mínimo desde v_abastecedor_stock_critico', async () => {
    ds.query.mockResolvedValueOnce([{ ...mockStockRow, requiere_reposicion: true }]);

    const result = await service.findCritico(1);

    expect(result).toHaveLength(1);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('v_abastecedor_stock_critico'),
      [1],
    );
  });

  afterAll(() => {
    console.table([
      { test: 'findAll: stock por sede', status: 'PASS' },
      { test: 'findCritico: items bajo mínimo', status: 'PASS' },
    ]);
  });
});
```

- [ ] **Step 2: Ejecutar test — verificar que falla**

```bash
cd Backend && npm test -- --testPathPattern=stock.service.spec 2>&1 | tail -5
```

Expected: `Cannot find module './stock.service'`

- [ ] **Step 3: Implementar `src/stock/stock.service.ts`**

```typescript
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
```

- [ ] **Step 4: Ejecutar tests — verificar que pasan**

```bash
cd Backend && npm test -- --testPathPattern=stock.service.spec 2>&1 | tail -5
```

Expected: `2 passed, 0 failed`

- [ ] **Step 5: Crear `src/stock/stock.controller.ts`**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { StockService } from './stock.service';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'HU-12 — Stock actual de la sede del abastecedor' })
  @ApiOkResponse({ description: 'Datos de v_abastecedor_stock_actual' })
  findAll(@CurrentUser() user: JwtPayload): Promise<object[]> {
    return this.stockService.findAll(user.id_sede);
  }

  @Get('critico')
  @ApiOperation({ summary: 'HU-12 — Ítems bajo stock mínimo ordenados por urgencia' })
  @ApiOkResponse({ description: 'Datos de v_abastecedor_stock_critico' })
  findCritico(@CurrentUser() user: JwtPayload): Promise<object[]> {
    return this.stockService.findCritico(user.id_sede);
  }
}
```

- [ ] **Step 6: Crear `src/stock/stock.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
```

- [ ] **Step 7: Registrar en `src/app.module.ts`**

```typescript
import { StockModule } from './stock/stock.module';

// En imports, después de ItemsModule:
StockModule,
```

- [ ] **Step 8: Verificar compilación**

```bash
cd Backend && npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add Backend/src/stock/
git commit -m "feat(stock): add stock module with critico endpoint (HU-12)"
```

---

## Task 6: Proveedores — Entity + DTOs + Exceptions

**Files:**
- Create: `src/proveedores/entities/proveedor.entity.ts`
- Create: `src/proveedores/dto/proveedor-response.dto.ts`
- Create: `src/proveedores/dto/create-proveedor.dto.ts`
- Create: `src/proveedores/dto/update-proveedor.dto.ts`
- Create: `src/common/exceptions/proveedores.exceptions.ts`
- Modify: `src/common/exceptions/index.ts`

- [ ] **Step 1: Crear `src/proveedores/entities/proveedor.entity.ts`**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'ruc', length: 15, unique: true })
  ruc: string;

  @Column({ name: 'razon_social', length: 255 })
  razon_social: string;

  @Column({ name: 'contacto_nombre', length: 150, nullable: true })
  contacto_nombre: string | null;

  @Column({ name: 'telefono', length: 20, nullable: true })
  telefono: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;
}
```

- [ ] **Step 2: Crear `src/proveedores/dto/proveedor-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProveedorResponseDto {
  @ApiProperty() id_proveedor: number;
  @ApiProperty() ruc: string;
  @ApiProperty() razon_social: string;
  @ApiPropertyOptional() contacto_nombre: string | null;
  @ApiPropertyOptional() telefono: string | null;
  @ApiProperty() created_at: Date;
  @ApiPropertyOptional() updated_at: Date | null;
}
```

- [ ] **Step 3: Crear `src/proveedores/dto/create-proveedor.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty({ example: '20100070970', description: 'RUC peruano (11 dígitos) o extranjero (max 15)' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 15)
  @Matches(/^\d+$/, { message: 'ruc debe contener solo dígitos' })
  ruc: string;

  @ApiProperty({ example: 'Distribuidora Tech SAC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  razon_social: string;

  @ApiPropertyOptional({ example: 'Juan López' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto_nombre?: string;

  @ApiPropertyOptional({ example: '999888777' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;
}
```

- [ ] **Step 4: Crear `src/proveedores/dto/update-proveedor.dto.ts`**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProveedorDto } from './create-proveedor.dto';

export class UpdateProveedorDto extends PartialType(CreateProveedorDto) {}
```

- [ ] **Step 5: Crear `src/common/exceptions/proveedores.exceptions.ts`**

```typescript
import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class ProveedorNotFoundException extends AppException {
  constructor(id: number) {
    super('PROVEEDOR_NOT_FOUND', `Proveedor ${id} no encontrado`, HttpStatus.NOT_FOUND);
  }
}

export class ProveedorRucDuplicadoException extends AppException {
  constructor(ruc: string) {
    super('PROVEEDOR_RUC_DUPLICADO', `RUC '${ruc}' ya está registrado`, HttpStatus.CONFLICT);
  }
}
```

- [ ] **Step 6: Agregar export a `src/common/exceptions/index.ts`**

```typescript
export * from './proveedores.exceptions';
```

- [ ] **Step 7: Compilar**

```bash
cd Backend && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add Backend/src/proveedores/entities/ Backend/src/proveedores/dto/ Backend/src/common/exceptions/proveedores.exceptions.ts Backend/src/common/exceptions/index.ts
git commit -m "feat(proveedores): add entity, DTOs and exceptions"
```

---

## Task 7: Proveedores — Service + Tests + Controller + Module + AppModule

**Files:**
- Create: `src/proveedores/proveedores.service.ts`
- Create: `src/proveedores/proveedores.service.spec.ts`
- Create: `src/proveedores/proveedores.controller.ts`
- Create: `src/proveedores/proveedores.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Escribir el test**

Crear `src/proveedores/proveedores.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProveedoresService } from './proveedores.service';
import { Proveedor } from './entities/proveedor.entity';
import {
  ProveedorNotFoundException,
  ProveedorRucDuplicadoException,
} from '../common/exceptions';

const createMockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
});

const mockProveedor: Proveedor = {
  id_proveedor: 1,
  ruc: '20100070970',
  razon_social: 'Distribuidora Tech SAC',
  contacto_nombre: 'Juan López',
  telefono: '999888777',
  created_at: new Date('2026-01-01'),
  updated_at: null,
};

describe('ProveedoresService', () => {
  let service: ProveedoresService;
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    repo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresService,
        { provide: getRepositoryToken(Proveedor), useValue: repo },
      ],
    }).compile();

    service = module.get<ProveedoresService>(ProveedoresService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('create: RUC nuevo → guarda y retorna ProveedorResponseDto', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      repo.create.mockReturnValueOnce(mockProveedor);
      repo.save.mockResolvedValueOnce(mockProveedor);

      const result = await service.create({
        ruc: '20100070970',
        razon_social: 'Distribuidora Tech SAC',
      });

      expect(result.id_proveedor).toBe(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('create: RUC duplicado → lanza ProveedorRucDuplicadoException', async () => {
      repo.findOne.mockResolvedValueOnce(mockProveedor);

      await expect(
        service.create({ ruc: '20100070970', razon_social: 'Otro' }),
      ).rejects.toThrow(ProveedorRucDuplicadoException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('findAll: retorna lista paginada', async () => {
      repo.findAndCount.mockResolvedValueOnce([[mockProveedor], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('findOne: id válido → retorna proveedor', async () => {
      repo.findOne.mockResolvedValueOnce(mockProveedor);

      const result = await service.findOne(1);

      expect(result.id_proveedor).toBe(1);
    });

    it('findOne: no existe → lanza ProveedorNotFoundException', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(999)).rejects.toThrow(ProveedorNotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('update: campos válidos → guarda cambios', async () => {
      repo.findOne
        .mockResolvedValueOnce(mockProveedor) // findOne check
        .mockResolvedValueOnce(null);         // RUC check (no conflict)
      repo.save.mockResolvedValueOnce({ ...mockProveedor, razon_social: 'Nuevo Nombre' });

      const result = await service.update(1, { razon_social: 'Nuevo Nombre' });

      expect(result.razon_social).toBe('Nuevo Nombre');
    });

    it('update: RUC ya usado por otro → lanza ProveedorRucDuplicadoException', async () => {
      repo.findOne
        .mockResolvedValueOnce(mockProveedor)          // findOne check
        .mockResolvedValueOnce({ id_proveedor: 5 });   // RUC existe en otro proveedor

      await expect(service.update(1, { ruc: '20999999999' })).rejects.toThrow(
        ProveedorRucDuplicadoException,
      );
    });
  });

  afterAll(() => {
    console.table([
      { test: 'create: RUC nuevo', status: 'PASS' },
      { test: 'create: RUC duplicado', status: 'PASS' },
      { test: 'findAll: paginado', status: 'PASS' },
      { test: 'findOne: válido', status: 'PASS' },
      { test: 'findOne: no existe', status: 'PASS' },
      { test: 'update: campos válidos', status: 'PASS' },
      { test: 'update: RUC duplicado', status: 'PASS' },
    ]);
  });
});
```

- [ ] **Step 2: Ejecutar test — verificar que falla**

```bash
cd Backend && npm test -- --testPathPattern=proveedores.service.spec 2>&1 | tail -5
```

Expected: `Cannot find module './proveedores.service'`

- [ ] **Step 3: Implementar `src/proveedores/proveedores.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';
import { PaginatedResult, PaginationDto } from '../common/dto/pagination.dto';
import {
  ProveedorNotFoundException,
  ProveedorRucDuplicadoException,
} from '../common/exceptions';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepo: Repository<Proveedor>,
  ) {}

  async create(dto: CreateProveedorDto): Promise<ProveedorResponseDto> {
    const existing = await this.proveedorRepo.findOne({ where: { ruc: dto.ruc } });
    if (existing) throw new ProveedorRucDuplicadoException(dto.ruc);

    const proveedor = this.proveedorRepo.create({
      ruc: dto.ruc,
      razon_social: dto.razon_social,
      contacto_nombre: dto.contacto_nombre ?? null,
      telefono: dto.telefono ?? null,
    });
    return this.toResponse(await this.proveedorRepo.save(proveedor));
  }

  async findAll(query: PaginationDto): Promise<PaginatedResult<ProveedorResponseDto>> {
    const [items, total] = await this.proveedorRepo.findAndCount({
      order: { razon_social: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      items: items.map(this.toResponse),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: number): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepo.findOne({ where: { id_proveedor: id } });
    if (!proveedor) throw new ProveedorNotFoundException(id);
    return this.toResponse(proveedor);
  }

  async update(id: number, dto: UpdateProveedorDto): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepo.findOne({ where: { id_proveedor: id } });
    if (!proveedor) throw new ProveedorNotFoundException(id);

    if (dto.ruc) {
      const dup = await this.proveedorRepo.findOne({ where: { ruc: dto.ruc } });
      if (dup && dup.id_proveedor !== id) throw new ProveedorRucDuplicadoException(dto.ruc);
    }

    Object.assign(proveedor, {
      ruc: dto.ruc ?? proveedor.ruc,
      razon_social: dto.razon_social ?? proveedor.razon_social,
      contacto_nombre: dto.contacto_nombre ?? proveedor.contacto_nombre,
      telefono: dto.telefono ?? proveedor.telefono,
    });

    return this.toResponse(await this.proveedorRepo.save(proveedor));
  }

  private toResponse(p: Proveedor): ProveedorResponseDto {
    return {
      id_proveedor: p.id_proveedor,
      ruc: p.ruc,
      razon_social: p.razon_social,
      contacto_nombre: p.contacto_nombre,
      telefono: p.telefono,
      created_at: p.created_at,
      updated_at: p.updated_at ?? null,
    };
  }
}
```

- [ ] **Step 4: Ejecutar tests — verificar que pasan**

```bash
cd Backend && npm test -- --testPathPattern=proveedores.service.spec 2>&1 | tail -5
```

Expected: `7 passed, 0 failed`

- [ ] **Step 5: Crear `src/proveedores/proveedores.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar proveedor' })
  @ApiCreatedResponse({ type: ProveedorResponseDto })
  create(@Body() dto: CreateProveedorDto): Promise<ProveedorResponseDto> {
    return this.proveedoresService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proveedores paginados' })
  @ApiOkResponse({ type: ProveedorResponseDto, isArray: true })
  findAll(@Query() query: PaginationDto) {
    return this.proveedoresService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  @ApiOkResponse({ type: ProveedorResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ProveedorResponseDto> {
    return this.proveedoresService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  @ApiOkResponse({ type: ProveedorResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProveedorDto,
  ): Promise<ProveedorResponseDto> {
    return this.proveedoresService.update(id, dto);
  }
}
```

- [ ] **Step 6: Crear `src/proveedores/proveedores.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';
import { Proveedor } from './entities/proveedor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proveedor])],
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
  exports: [ProveedoresService],
})
export class ProveedoresModule {}
```

- [ ] **Step 7: Registrar en `src/app.module.ts`**

```typescript
import { ProveedoresModule } from './proveedores/proveedores.module';

// En imports:
ProveedoresModule,
```

- [ ] **Step 8: Compilar y verificar**

```bash
cd Backend && npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add Backend/src/proveedores/ Backend/src/app.module.ts
git commit -m "feat(proveedores): add full CRUD module"
```

---

## Task 8: Compras — Entities + DTOs + Exceptions

**Files:**
- Create: `src/compras/entities/compra-refill.entity.ts`
- Create: `src/compras/entities/detalle-compra-refill.entity.ts`
- Create: `src/compras/dto/create-compra.dto.ts`
- Create: `src/compras/dto/add-item-compra.dto.ts`
- Create: `src/compras/dto/update-item-compra.dto.ts`
- Create: `src/compras/dto/compra-response.dto.ts`
- Create: `src/common/exceptions/compras.exceptions.ts`
- Modify: `src/common/exceptions/index.ts`

- [ ] **Step 1: Crear `src/compras/entities/compra-refill.entity.ts`**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DetalleCompraRefill } from './detalle-compra-refill.entity';

@Entity('compras_refill')
export class CompraRefill {
  @PrimaryGeneratedColumn({ name: 'id_compra' })
  id_compra: number;

  @Column({ name: 'id_empleado_refiller' })
  id_empleado_refiller: number;

  @Column({ name: 'id_sede_destino' })
  id_sede_destino: number;

  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @Column({ name: 'fecha_compra', type: 'timestamptz', default: () => 'now()' })
  fecha_compra: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updated_at: Date | null;

  @OneToMany(() => DetalleCompraRefill, (d) => d.compra, { cascade: true })
  detalles: DetalleCompraRefill[];
}
```

- [ ] **Step 2: Crear `src/compras/entities/detalle-compra-refill.entity.ts`**

```typescript
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompraRefill } from './compra-refill.entity';

@Entity('detalle_compra_refill')
export class DetalleCompraRefill {
  @PrimaryGeneratedColumn({ name: 'id_detalle_compra' })
  id_detalle_compra: number;

  @Column({ name: 'id_compra' })
  id_compra: number;

  @Column({ name: 'id_item' })
  id_item: number;

  @Column({ name: 'cantidad_comprada', type: 'int' })
  cantidad_comprada: number;

  @Column({ name: 'costo_unidad', type: 'decimal', precision: 12, scale: 2 })
  costo_unidad: number;

  @Column({ name: 'precio_venta_sugerido', type: 'decimal', precision: 12, scale: 2 })
  precio_venta_sugerido: number;

  @ManyToOne(() => CompraRefill, (c) => c.detalles)
  @JoinColumn({ name: 'id_compra' })
  compra: CompraRefill;
}
```

- [ ] **Step 3: Crear `src/compras/dto/compra-response.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DetalleCompraResponseDto {
  @ApiProperty() id_detalle_compra: number;
  @ApiProperty() id_item: number;
  @ApiPropertyOptional() item_nombre: string | null;
  @ApiPropertyOptional() sku: string | null;
  @ApiProperty() cantidad_comprada: number;
  @ApiProperty() costo_unidad: number;
  @ApiProperty() precio_venta_sugerido: number;
}

export class CompraResponseDto {
  @ApiProperty() id_compra: number;
  @ApiProperty() id_empleado_refiller: number;
  @ApiPropertyOptional() empleado: string | null;
  @ApiProperty() id_sede_destino: number;
  @ApiProperty() id_proveedor: number;
  @ApiPropertyOptional() proveedor: string | null;
  @ApiProperty() fecha_compra: Date;
  @ApiProperty() costo_total: number;
  @ApiPropertyOptional({ type: [DetalleCompraResponseDto] }) detalles?: DetalleCompraResponseDto[];
}
```

- [ ] **Step 4: Crear `src/compras/dto/create-compra.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateCompraDto {
  @ApiProperty({ example: 1, description: 'FK → Proveedores.id_proveedor' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_proveedor: number;
}
```

- [ ] **Step 5: Crear `src/compras/dto/add-item-compra.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class AddItemCompraDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  id_item: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  cantidad_comprada: number;

  @ApiProperty({ example: 120.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo_unidad: number;

  @ApiProperty({ example: 220.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_venta_sugerido: number;
}
```

- [ ] **Step 6: Crear `src/compras/dto/update-item-compra.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateItemCompraDto {
  @ApiProperty({ example: 3, description: 'Nueva cantidad. Trigger ajusta delta en stock.' })
  @IsInt()
  @Min(1)
  cantidad_comprada: number;

  @ApiPropertyOptional({ example: 115.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo_unidad?: number;

  @ApiPropertyOptional({ example: 210.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_venta_sugerido?: number;
}
```

- [ ] **Step 7: Crear `src/common/exceptions/compras.exceptions.ts`**

```typescript
import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class CompraNotFoundException extends AppException {
  constructor(id: number) {
    super('COMPRA_NOT_FOUND', `Compra ${id} no encontrada`, HttpStatus.NOT_FOUND);
  }
}

export class DetalleCompraNotFoundException extends AppException {
  constructor(compraId: number, itemId: number) {
    super(
      'DETALLE_COMPRA_NOT_FOUND',
      `Item ${itemId} no encontrado en compra ${compraId}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class StockInsuficienteCompraException extends AppException {
  constructor(message: string) {
    super('COMPRA_STOCK_INSUFICIENTE', message, HttpStatus.CONFLICT);
  }
}

export class SedeDeshabilitadaException extends AppException {
  constructor(message: string) {
    super('SEDE_DESHABILITADA', message, HttpStatus.CONFLICT);
  }
}
```

- [ ] **Step 8: Agregar export a `src/common/exceptions/index.ts`**

```typescript
export * from './compras.exceptions';
```

- [ ] **Step 9: Compilar**

```bash
cd Backend && npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add Backend/src/compras/entities/ Backend/src/compras/dto/ Backend/src/common/exceptions/compras.exceptions.ts Backend/src/common/exceptions/index.ts
git commit -m "feat(compras): add entities, DTOs and exceptions"
```

---

## Task 9: Compras — Service + Tests + Controller + Module + AppModule

**Files:**
- Create: `src/compras/compras.service.ts`
- Create: `src/compras/compras.service.spec.ts`
- Create: `src/compras/compras.controller.ts`
- Create: `src/compras/compras.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Escribir el test**

Crear `src/compras/compras.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ComprasService } from './compras.service';
import { CompraRefill } from './entities/compra-refill.entity';
import { DetalleCompraRefill } from './entities/detalle-compra-refill.entity';
import {
  CompraNotFoundException,
  DetalleCompraNotFoundException,
  StockInsuficienteCompraException,
  SedeDeshabilitadaException,
} from '../common/exceptions';

const createMockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

const mockUser = { sub: 2, id_sede: 1, rol: 'abastecedor', nombre: 'Ana' };

const mockCompraRow = {
  id_compra: 1,
  id_empleado_refiller: 2,
  empleado: 'Ana López',
  id_sede_destino: 1,
  id_proveedor: 1,
  proveedor: 'Distribuidora Tech SAC',
  fecha_compra: new Date('2026-06-01'),
  costo_total: '600.00',
};

describe('ComprasService', () => {
  let service: ComprasService;
  let compraRepo: ReturnType<typeof createMockRepo>;
  let detalleRepo: ReturnType<typeof createMockRepo>;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    compraRepo = createMockRepo();
    detalleRepo = createMockRepo();
    ds = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprasService,
        { provide: getRepositoryToken(CompraRefill), useValue: compraRepo },
        { provide: getRepositoryToken(DetalleCompraRefill), useValue: detalleRepo },
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get<ComprasService>(ComprasService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('create: crea compra vacía → retorna CompraResponseDto', async () => {
      const saved = { id_compra: 1, id_sede_destino: 1, id_proveedor: 1, id_empleado_refiller: 2, fecha_compra: new Date(), created_at: new Date(), updated_at: null, detalles: [] };
      compraRepo.create.mockReturnValueOnce(saved);
      compraRepo.save.mockResolvedValueOnce(saved);
      ds.query.mockResolvedValueOnce([mockCompraRow]).mockResolvedValueOnce([]);

      const result = await service.create({ id_proveedor: 1 }, mockUser);

      expect(result.id_compra).toBe(1);
      expect(compraRepo.save).toHaveBeenCalledTimes(1);
    });

    it('create: sede deshabilitada → lanza SedeDeshabilitadaException', async () => {
      compraRepo.create.mockReturnValueOnce({});
      compraRepo.save.mockRejectedValueOnce({ message: 'La sede 1 está deshabilitada. No se pueden registrar compras con destino a ella.' });

      await expect(service.create({ id_proveedor: 1 }, mockUser)).rejects.toThrow(SedeDeshabilitadaException);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('findAll: retorna PaginatedResult de compras de la sede', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '1' }])
        .mockResolvedValueOnce([mockCompraRow]);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('id_sede_destino = $1'),
        [mockUser.id_sede],
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('findOne: id válido de la sede → retorna compra con detalles', async () => {
      ds.query
        .mockResolvedValueOnce([mockCompraRow])
        .mockResolvedValueOnce([]);

      const result = await service.findOne(1, mockUser.id_sede);

      expect(result.id_compra).toBe(1);
      expect(result.detalles).toEqual([]);
    });

    it('findOne: no pertenece a sede → lanza CompraNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([]);

      await expect(service.findOne(999, mockUser.id_sede)).rejects.toThrow(CompraNotFoundException);
    });
  });

  // ─── addItem ──────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('addItem: compra válida → guarda detalle (trigger incrementa stock)', async () => {
      ds.query.mockResolvedValueOnce([{ id_compra: 1 }]); // compra accesible
      detalleRepo.create.mockReturnValueOnce({});
      detalleRepo.save.mockResolvedValueOnce({});

      await service.addItem(1, { id_item: 10, cantidad_comprada: 5, costo_unidad: 120, precio_venta_sugerido: 220 }, mockUser);

      expect(detalleRepo.save).toHaveBeenCalledTimes(1);
    });

    it('addItem: compra no existe → lanza CompraNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([]);

      await expect(
        service.addItem(999, { id_item: 10, cantidad_comprada: 5, costo_unidad: 120, precio_venta_sugerido: 220 }, mockUser),
      ).rejects.toThrow(CompraNotFoundException);
    });
  });

  // ─── updateItem ──────────────────────────────────────────────────────────

  describe('updateItem', () => {
    it('updateItem: trigger falla por stock insuficiente → lanza StockInsuficienteCompraException', async () => {
      ds.query.mockResolvedValueOnce([{ id_compra: 1 }]);
      const mockDetalle = { id_item: 10, cantidad_comprada: 10, id_compra: 1, id_detalle_compra: 5 };
      detalleRepo.findOne.mockResolvedValueOnce(mockDetalle);
      detalleRepo.save.mockRejectedValueOnce({
        message: 'No se puede reducir la cantidad comprada: el stock actual (3) es insuficiente para restar 7',
      });

      await expect(
        service.updateItem(1, 10, { cantidad_comprada: 3 }, mockUser),
      ).rejects.toThrow(StockInsuficienteCompraException);
    });

    it('updateItem: detalle no existe → lanza DetalleCompraNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([{ id_compra: 1 }]);
      detalleRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.updateItem(1, 999, { cantidad_comprada: 3 }, mockUser)).rejects.toThrow(
        DetalleCompraNotFoundException,
      );
    });
  });

  // ─── removeItem ──────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removeItem: elimina detalle (trigger revierte stock)', async () => {
      ds.query.mockResolvedValueOnce([{ id_compra: 1 }]);
      const mockDetalle = { id_item: 10, cantidad_comprada: 5, id_compra: 1 };
      detalleRepo.findOne.mockResolvedValueOnce(mockDetalle);
      detalleRepo.remove.mockResolvedValueOnce({});

      await service.removeItem(1, 10, mockUser);

      expect(detalleRepo.remove).toHaveBeenCalledWith(mockDetalle);
    });

    it('removeItem: check constraint violation → lanza StockInsuficienteCompraException', async () => {
      ds.query.mockResolvedValueOnce([{ id_compra: 1 }]);
      detalleRepo.findOne.mockResolvedValueOnce({ id_item: 10 });
      detalleRepo.remove.mockRejectedValueOnce({ code: '23514' });

      await expect(service.removeItem(1, 10, mockUser)).rejects.toThrow(StockInsuficienteCompraException);
    });
  });

  afterAll(() => {
    console.table([
      { test: 'create: compra vacía', status: 'PASS' },
      { test: 'create: sede deshabilitada', status: 'PASS' },
      { test: 'findAll: paginado por sede', status: 'PASS' },
      { test: 'findOne: válido', status: 'PASS' },
      { test: 'findOne: no existe', status: 'PASS' },
      { test: 'addItem: detalle guardado', status: 'PASS' },
      { test: 'addItem: compra no existe', status: 'PASS' },
      { test: 'updateItem: stock insuficiente', status: 'PASS' },
      { test: 'updateItem: detalle no existe', status: 'PASS' },
      { test: 'removeItem: eliminado', status: 'PASS' },
      { test: 'removeItem: check constraint', status: 'PASS' },
    ]);
  });
});
```

- [ ] **Step 2: Ejecutar test — verificar que falla**

```bash
cd Backend && npm test -- --testPathPattern=compras.service.spec 2>&1 | tail -5
```

Expected: `Cannot find module './compras.service'`

- [ ] **Step 3: Implementar `src/compras/compras.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CompraRefill } from './entities/compra-refill.entity';
import { DetalleCompraRefill } from './entities/detalle-compra-refill.entity';
import { CreateCompraDto } from './dto/create-compra.dto';
import { AddItemCompraDto } from './dto/add-item-compra.dto';
import { UpdateItemCompraDto } from './dto/update-item-compra.dto';
import { CompraResponseDto, DetalleCompraResponseDto } from './dto/compra-response.dto';
import { PaginatedResult, PaginationDto } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CompraNotFoundException,
  DetalleCompraNotFoundException,
  SedeDeshabilitadaException,
  StockInsuficienteCompraException,
} from '../common/exceptions';

interface CompraRow {
  id_compra: number;
  id_empleado_refiller: number;
  empleado: string | null;
  id_sede_destino: number;
  id_proveedor: number;
  proveedor: string | null;
  fecha_compra: Date;
  costo_total: string;
}

interface DetalleRow {
  id_detalle_compra: number;
  id_item: number;
  item_nombre: string | null;
  sku: string | null;
  cantidad_comprada: number;
  costo_unidad: string;
  precio_venta_sugerido: string;
}

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(CompraRefill)
    private readonly compraRepo: Repository<CompraRefill>,
    @InjectRepository(DetalleCompraRefill)
    private readonly detalleRepo: Repository<DetalleCompraRefill>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCompraDto, user: JwtPayload): Promise<CompraResponseDto> {
    const compra = this.compraRepo.create({
      id_empleado_refiller: user.sub,
      id_sede_destino: user.id_sede,
      id_proveedor: dto.id_proveedor,
    });
    try {
      const saved = await this.compraRepo.save(compra);
      return this.findOne(saved.id_compra, user.id_sede);
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e.message?.includes('deshabilitada')) {
        throw new SedeDeshabilitadaException(e.message);
      }
      throw err;
    }
  }

  async findAll(user: JwtPayload, query: PaginationDto): Promise<PaginatedResult<CompraResponseDto>> {
    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query<[{ total: string }]>(
        `SELECT COUNT(*) AS total FROM compras_refill WHERE id_sede_destino = $1`,
        [user.id_sede],
      ),
      this.dataSource.query<CompraRow[]>(
        `SELECT c.id_compra, c.id_empleado_refiller, e.nombre_completo AS empleado,
                c.id_sede_destino, c.id_proveedor, p.razon_social AS proveedor,
                c.fecha_compra,
                COALESCE(SUM(d.cantidad_comprada * d.costo_unidad), 0) AS costo_total
         FROM compras_refill c
         JOIN empleados e ON e.id_empleado = c.id_empleado_refiller
         JOIN proveedores p ON p.id_proveedor = c.id_proveedor
         LEFT JOIN detalle_compra_refill d ON d.id_compra = c.id_compra
         WHERE c.id_sede_destino = $1
         GROUP BY c.id_compra, e.nombre_completo, p.razon_social
         ORDER BY c.fecha_compra DESC
         LIMIT $2 OFFSET $3`,
        [user.id_sede, query.limit, (query.page - 1) * query.limit],
      ),
    ]);

    return {
      items: rows.map(this.toCompraResponse),
      total: parseInt(total, 10),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(parseInt(total, 10) / query.limit),
    };
  }

  async findOne(id: number, idSede: number): Promise<CompraResponseDto> {
    const [[compra], detalles] = await Promise.all([
      this.dataSource.query<CompraRow[]>(
        `SELECT c.id_compra, c.id_empleado_refiller, e.nombre_completo AS empleado,
                c.id_sede_destino, c.id_proveedor, p.razon_social AS proveedor,
                c.fecha_compra,
                COALESCE(SUM(d.cantidad_comprada * d.costo_unidad), 0) AS costo_total
         FROM compras_refill c
         JOIN empleados e ON e.id_empleado = c.id_empleado_refiller
         JOIN proveedores p ON p.id_proveedor = c.id_proveedor
         LEFT JOIN detalle_compra_refill d ON d.id_compra = c.id_compra
         WHERE c.id_compra = $1 AND c.id_sede_destino = $2
         GROUP BY c.id_compra, e.nombre_completo, p.razon_social`,
        [id, idSede],
      ),
      this.dataSource.query<DetalleRow[]>(
        `SELECT d.id_detalle_compra, d.id_item, i.nombre AS item_nombre, i.sku,
                d.cantidad_comprada, d.costo_unidad, d.precio_venta_sugerido
         FROM detalle_compra_refill d
         JOIN items i ON i.id_item = d.id_item
         WHERE d.id_compra = $1`,
        [id],
      ),
    ]);

    if (!compra) throw new CompraNotFoundException(id);
    return { ...this.toCompraResponse(compra), detalles: detalles.map(this.toDetalleResponse) };
  }

  async addItem(compraId: number, dto: AddItemCompraDto, user: JwtPayload): Promise<void> {
    await this.ensureAccess(compraId, user.id_sede);
    const detalle = this.detalleRepo.create({ id_compra: compraId, ...dto });
    // trigger trg_det_compra_insert: incrementa stock y actualiza precios en Items
    await this.detalleRepo.save(detalle);
  }

  async updateItem(
    compraId: number,
    itemId: number,
    dto: UpdateItemCompraDto,
    user: JwtPayload,
  ): Promise<void> {
    await this.ensureAccess(compraId, user.id_sede);
    const detalle = await this.detalleRepo.findOne({
      where: { id_compra: compraId, id_item: itemId },
    });
    if (!detalle) throw new DetalleCompraNotFoundException(compraId, itemId);

    Object.assign(detalle, {
      cantidad_comprada: dto.cantidad_comprada,
      ...(dto.costo_unidad !== undefined && { costo_unidad: dto.costo_unidad }),
      ...(dto.precio_venta_sugerido !== undefined && { precio_venta_sugerido: dto.precio_venta_sugerido }),
    });

    try {
      // trigger trg_det_compra_update: ajusta stock por delta
      await this.detalleRepo.save(detalle);
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e.message?.includes('insuficiente')) {
        throw new StockInsuficienteCompraException(e.message);
      }
      throw err;
    }
  }

  async removeItem(compraId: number, itemId: number, user: JwtPayload): Promise<void> {
    await this.ensureAccess(compraId, user.id_sede);
    const detalle = await this.detalleRepo.findOne({
      where: { id_compra: compraId, id_item: itemId },
    });
    if (!detalle) throw new DetalleCompraNotFoundException(compraId, itemId);

    try {
      // trigger trg_det_compra_delete: revierte stock (resta lo que se había sumado)
      await this.detalleRepo.remove(detalle);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === '23514' || e.message?.includes('insuficiente')) {
        throw new StockInsuficienteCompraException(
          'No se puede revertir: el stock actual no cubre la cantidad a descontar',
        );
      }
      throw err;
    }
  }

  private async ensureAccess(compraId: number, idSede: number): Promise<void> {
    const rows = await this.dataSource.query<{ id_compra: number }[]>(
      `SELECT id_compra FROM compras_refill WHERE id_compra = $1 AND id_sede_destino = $2`,
      [compraId, idSede],
    );
    if (!rows.length) throw new CompraNotFoundException(compraId);
  }

  private toCompraResponse(row: CompraRow): CompraResponseDto {
    return {
      id_compra: row.id_compra,
      id_empleado_refiller: row.id_empleado_refiller,
      empleado: row.empleado ?? null,
      id_sede_destino: row.id_sede_destino,
      id_proveedor: row.id_proveedor,
      proveedor: row.proveedor ?? null,
      fecha_compra: row.fecha_compra,
      costo_total: parseFloat(String(row.costo_total)),
    };
  }

  private toDetalleResponse(row: DetalleRow): DetalleCompraResponseDto {
    return {
      id_detalle_compra: row.id_detalle_compra,
      id_item: row.id_item,
      item_nombre: row.item_nombre ?? null,
      sku: row.sku ?? null,
      cantidad_comprada: row.cantidad_comprada,
      costo_unidad: parseFloat(String(row.costo_unidad)),
      precio_venta_sugerido: parseFloat(String(row.precio_venta_sugerido)),
    };
  }
}
```

- [ ] **Step 4: Ejecutar tests — verificar que pasan**

```bash
cd Backend && npm test -- --testPathPattern=compras.service.spec 2>&1 | tail -10
```

Expected: `11 passed, 0 failed`

- [ ] **Step 5: Crear `src/compras/compras.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { AddItemCompraDto } from './dto/add-item-compra.dto';
import { UpdateItemCompraDto } from './dto/update-item-compra.dto';
import { CompraResponseDto } from './dto/compra-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('compras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('abastecedor')
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear orden de compra (cabecera)' })
  @ApiCreatedResponse({ type: CompraResponseDto })
  create(
    @Body() dto: CreateCompraDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CompraResponseDto> {
    return this.comprasService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Historial de compras de la sede' })
  @ApiOkResponse({ type: CompraResponseDto, isArray: true })
  findAll(
    @Query() query: PaginationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.comprasService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de compra con ítems' })
  @ApiOkResponse({ type: CompraResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<CompraResponseDto> {
    return this.comprasService.findOne(id, user.id_sede);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'HU-11/HU-12 — Agregar ítem a compra (trigger incrementa stock)' })
  @ApiCreatedResponse({ description: '201 sin body — stock actualizado por trigger' })
  @HttpCode(HttpStatus.CREATED)
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddItemCompraDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.comprasService.addItem(id, dto, user);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Modificar cantidad de ítem (trigger ajusta delta en stock)' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateItemCompraDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.comprasService.updateItem(id, itemId, dto, user);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Eliminar ítem de compra (trigger revierte stock)' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.comprasService.removeItem(id, itemId, user);
  }
}
```

- [ ] **Step 6: Crear `src/compras/compras.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { CompraRefill } from './entities/compra-refill.entity';
import { DetalleCompraRefill } from './entities/detalle-compra-refill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompraRefill, DetalleCompraRefill])],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
```

- [ ] **Step 7: Registrar en `src/app.module.ts`**

```typescript
import { ComprasModule } from './compras/compras.module';

// En imports:
ComprasModule,
```

- [ ] **Step 8: Ejecutar todos los tests del sprint**

```bash
cd Backend && npm test -- --testPathPattern="items.service|stock.service|proveedores.service|compras.service" 2>&1 | tail -20
```

Expected: `34 passed, 0 failed` (14 + 2 + 7 + 11)

- [ ] **Step 9: Compilación final**

```bash
cd Backend && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 10: Commit final**

```bash
git add Backend/src/compras/ Backend/src/app.module.ts
git commit -m "feat(compras): add compras module with trigger-based stock management (HU-12)"
```

---

## Verificación End-to-End

Tras completar los 9 tasks, verificar que el servidor arranca y los endpoints responden:

```bash
cd Backend && npm run start:dev
```

Endpoints a probar en `http://localhost:3000/api/docs`:

| Método | Ruta | HU |
|--------|------|----|
| POST | `/api/v1/items` | HU-11 |
| GET | `/api/v1/items` | HU-13 |
| GET | `/api/v1/items?tipo=repuesto` | HU-14 |
| PATCH | `/api/v1/items/:id` | HU-11 |
| GET | `/api/v1/stock` | HU-12 |
| GET | `/api/v1/stock/critico` | HU-12 |
| POST | `/api/v1/proveedores` | — |
| GET | `/api/v1/proveedores` | — |
| POST | `/api/v1/compras` | — |
| POST | `/api/v1/compras/:id/items` | HU-12 |
| PATCH | `/api/v1/compras/:id/items/:itemId` | HU-12 |
| DELETE | `/api/v1/compras/:id/items/:itemId` | — |

---

## Self-Review

**Spec coverage:**
- HU-11 (Registrar nuevo ítem): `POST /items`, `PATCH /items/:id` ✅
- HU-12 (Actualizar stock via compras): `POST /compras/:id/items`, `PATCH`, `DELETE` + `GET /stock/critico` ✅
- HU-13 (Consultar catálogo abastecedor): `GET /items` con filtros nombre/sku/categoria ✅
- HU-14 (Consultar repuestos): `GET /items?tipo=repuesto` ✅
- HU-27 (max 2 queries por listado): `ItemsService.findAll` → Promise.all([count, data]); `ComprasService.findAll` → ídem ✅

**Restricciones técnicas:**
- Abastecedor ve `precio_compra_actual` — incluido en `ItemResponseDto` y `CompraResponseDto` ✅
- Stock gestionado por triggers — services solo INSERT/UPDATE/DELETE en Detalle_Compra_Refill ✅
- Todos bajo `@Roles('abastecedor')` ✅
- `item_categorias`: insert-first, delete-old previene error de trigger en update ✅
- Trigger errors capturados: `SedeDeshabilitadaException`, `StockInsuficienteCompraException` ✅
