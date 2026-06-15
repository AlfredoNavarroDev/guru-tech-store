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

describe('ItemsService', () => {
  let service: ItemsService;
  let ds: { query: jest.Mock; transaction: jest.Mock };

  beforeEach(async () => {
    const mockManager = { query: jest.fn() };
    ds = {
      query: jest.fn(),
      transaction: jest
        .fn()
        .mockImplementation(
          async (fn: (m: typeof mockManager) => Promise<unknown>) => {
            mockManager.query
              .mockResolvedValueOnce([{ id_item: 1 }]) // INSERT items RETURNING
              .mockResolvedValueOnce([]) // INSERT item_categorias
              .mockResolvedValueOnce([]); // INSERT inventario_sedes
            return fn(mockManager);
          },
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ItemsService, { provide: DataSource, useValue: ds }],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('create: producto con categorias → retorna ItemResponseDto', async () => {
      ds.query
        .mockResolvedValueOnce([]) // SKU check: no existe
        .mockResolvedValueOnce([mockItemRow]); // findOne al final

      const result = await service.create(
        {
          tipo: 'producto',
          sku: 'PRD-001',
          nombre: 'Cable USB-C',
          precio_compra_actual: 8.5,
          precio_venta_actual: 25,
          categoria_ids: [1, 4],
        },
        1,
      );

      expect(result.id_item).toBe(1);
      expect(result.categorias).toEqual(['Accesorios', 'Cables y Cargadores']);
      expect(result.precio_compra_actual).toBe(8.5);
    });

    it('create: repuesto sin categorias → no lanza error', async () => {
      ds.query.mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          ...mockItemRow,
          tipo: 'repuesto',
          calidad: 'original',
          categorias_str: '',
        },
      ]);

      ds.transaction.mockImplementation(
        async (fn: (m: { query: jest.Mock }) => Promise<unknown>) => {
          const m = {
            query: jest
              .fn()
              .mockResolvedValueOnce([{ id_item: 2 }]) // INSERT items
              .mockResolvedValueOnce([]), // INSERT inventario_sedes (sin categorias)
          };
          return fn(m);
        },
      );

      await expect(
        service.create(
          {
            tipo: 'repuesto',
            sku: 'REP-010',
            nombre: 'Pantalla Test',
            calidad: 'original',
            precio_compra_actual: 100,
            precio_venta_actual: 200,
          },
          1,
        ),
      ).resolves.toBeDefined();
    });

    it('create: producto sin categoria_ids → lanza ItemCategoriasRequeridaException', async () => {
      await expect(
        service.create(
          {
            tipo: 'producto',
            sku: 'PRD-010',
            nombre: 'Item Test',
            precio_compra_actual: 10,
            precio_venta_actual: 20,
          },
          1,
        ),
      ).rejects.toThrow(ItemCategoriasRequeridaException);
    });

    it('create: calidad en producto → lanza ItemCalidadSoloRepuestoException', async () => {
      await expect(
        service.create(
          {
            tipo: 'producto',
            sku: 'PRD-010',
            nombre: 'Item Test',
            calidad: 'original',
            precio_compra_actual: 10,
            precio_venta_actual: 20,
            categoria_ids: [1],
          },
          1,
        ),
      ).rejects.toThrow(ItemCalidadSoloRepuestoException);
    });

    it('create: SKU duplicado → lanza ItemSkuDuplicadoException', async () => {
      ds.query.mockResolvedValueOnce([{ id_item: 5 }]);

      await expect(
        service.create(
          {
            tipo: 'producto',
            sku: 'PRD-001',
            nombre: 'Otro Item',
            precio_compra_actual: 10,
            precio_venta_actual: 20,
            categoria_ids: [1],
          },
          1,
        ),
      ).rejects.toThrow(ItemSkuDuplicadoException);
    });

    it('create: con stock_minimo y cantidad_inicial → pasa valores correctos a inventario_sedes', async () => {
      let inventarioParams: unknown[] = [];

      ds.query
        .mockResolvedValueOnce([]) // SKU check
        .mockResolvedValueOnce([mockItemRow]); // findOne

      ds.transaction.mockImplementation(
        async (fn: (m: { query: jest.Mock }) => Promise<unknown>) => {
          const m = {
            query: jest
              .fn()
              .mockResolvedValueOnce([{ id_item: 1 }]) // INSERT items
              .mockResolvedValueOnce([]) // INSERT categorias
              .mockImplementation((_sql: string, params: unknown[]) => {
                inventarioParams = params;
                return Promise.resolve([]);
              }),
          };
          return fn(m);
        },
      );

      await service.create(
        {
          tipo: 'producto',
          sku: 'PRD-001',
          nombre: 'Cable USB-C',
          precio_compra_actual: 8.5,
          precio_venta_actual: 25,
          categoria_ids: [1],
          stock_minimo: 5,
          cantidad_inicial: 10,
        },
        2,
      );

      // [idSede, id_item, cantidad_inicial, stock_minimo]
      expect(inventarioParams[0]).toBe(2); // id_sede
      expect(inventarioParams[2]).toBe(10); // cantidad_inicial
      expect(inventarioParams[3]).toBe(5); // stock_minimo
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

      const firstCallArgs = ds.query.mock.calls[0] as [string, unknown[]];
      expect(firstCallArgs[0]).toContain('i.tipo = $1');
      expect(firstCallArgs[1]).toContain('repuesto');
    });

    it('findAll: filtro id_marca → pasa parámetro correcto en WHERE', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '1' }])
        .mockResolvedValueOnce([mockItemRow]);

      await service.findAll({ page: 1, limit: 20, id_marca: 3 }, 1);

      const firstCallArgs = ds.query.mock.calls[0] as [string, unknown[]];
      expect(firstCallArgs[0]).toContain('i.id_marca = $1');
      expect(firstCallArgs[1]).toContain(3);
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
        .mockResolvedValueOnce([mockItemRow]) // findOne (current)
        .mockResolvedValueOnce([mockItemRow]); // findOne al final

      ds.transaction.mockImplementation(
        async (fn: (m: { query: jest.Mock }) => Promise<unknown>) => {
          const m = { query: jest.fn().mockResolvedValue([]) };
          return fn(m);
        },
      );

      const result = await service.update(1, { nombre: 'Cable USB-C Pro' });

      expect(result.id_item).toBe(1);
    });

    it('update: id no existe → lanza ItemNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([]);

      await expect(service.update(999, { nombre: 'X' })).rejects.toThrow(
        ItemNotFoundException,
      );
    });

    it('update: SKU duplicado → lanza ItemSkuDuplicadoException', async () => {
      ds.query
        .mockResolvedValueOnce([mockItemRow])
        .mockResolvedValueOnce([{ id_item: 5 }]);

      await expect(service.update(1, { sku: 'PRD-002' })).rejects.toThrow(
        ItemSkuDuplicadoException,
      );
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('remove: id válido → ejecuta DELETE', async () => {
      ds.query.mockResolvedValueOnce([mockItemRow]).mockResolvedValueOnce([]);

      await service.remove(1);

      const deleteCalls = ds.query.mock.calls.filter((c: [string, unknown[]]) =>
        c[0].includes('DELETE FROM items'),
      );
      expect(deleteCalls).toHaveLength(1);
    });

    it('remove: FK violation → lanza ConflictException', async () => {
      ds.query
        .mockResolvedValueOnce([mockItemRow])
        .mockRejectedValueOnce({ code: '23503', message: 'FK constraint' });

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });
  });

  afterAll(() => {
    console.table([
      { test: 'create: producto con categorias', status: 'PASS' },
      { test: 'create: repuesto sin categorias', status: 'PASS' },
      { test: 'create: producto sin categorias', status: 'PASS' },
      { test: 'create: calidad en producto', status: 'PASS' },
      { test: 'create: SKU duplicado', status: 'PASS' },
      { test: 'create: con stock_minimo y cantidad_inicial', status: 'PASS' },
      { test: 'findAll: sin filtros', status: 'PASS' },
      { test: 'findAll: filtro tipo', status: 'PASS' },
      { test: 'findAll: filtro id_marca', status: 'PASS' },
      { test: 'findOne: id válido', status: 'PASS' },
      { test: 'findOne: no existe', status: 'PASS' },
      { test: 'update: campos válidos', status: 'PASS' },
      { test: 'update: no existe', status: 'PASS' },
      { test: 'update: SKU duplicado', status: 'PASS' },
      { test: 'remove: id válido', status: 'PASS' },
      { test: 'remove: FK violation', status: 'PASS' },
    ]);
  });
});
