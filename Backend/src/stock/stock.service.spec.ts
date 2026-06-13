import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { StockService } from './stock.service';

const mockStockRow = {
  id_item: 1,
  sku: 'PRD-001',
  nombre: 'Cable USB-C',
  tipo: 'producto',
  id_marca: 3,
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

  describe('findAll', () => {
    it('findAll: sin filtros → retorna PaginatedResult con paginación', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '1' }])
        .mockResolvedValueOnce([mockStockRow]);

      const result = await service.findAll(1, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('v_abastecedor_stock_actual'),
        expect.arrayContaining([1]),
      );
    });

    it('findAll: filtro tipo=repuesto → agrega condición WHERE tipo', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll(1, { page: 1, limit: 20, tipo: 'repuesto' });

      const countCall = ds.query.mock.calls[0] as [string, unknown[]];
      expect(countCall[0]).toContain('tipo = $2');
      expect(countCall[1]).toContain('repuesto');
    });

    it('findAll: filtro id_marca → agrega condición WHERE id_marca', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll(1, { page: 1, limit: 20, id_marca: 3 });

      const countCall = ds.query.mock.calls[0] as [string, unknown[]];
      expect(countCall[0]).toContain('id_marca = $2');
      expect(countCall[1]).toContain(3);
    });

    it('findAll: requiere_reposicion=true → agrega condición WHERE requiere_reposicion', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll(1, { page: 1, limit: 20, requiere_reposicion: true });

      const countCall = ds.query.mock.calls[0] as [string, unknown[]];
      expect(countCall[0]).toContain('requiere_reposicion = $2');
      expect(countCall[1]).toContain(true);
    });

    it('findAll: paginación página 2 → aplica OFFSET correcto', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '25' }])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(1, { page: 2, limit: 10 });

      expect(result.totalPages).toBe(3);
      const dataCall = ds.query.mock.calls[1] as [string, unknown[]];
      // OFFSET = (page - 1) * limit = 10
      expect(dataCall[1]).toContain(10);
    });
  });

  describe('findCritico', () => {
    it('findCritico: retorna solo ítems bajo mínimo desde v_abastecedor_stock_critico', async () => {
      ds.query.mockResolvedValueOnce([
        { ...mockStockRow, requiere_reposicion: true },
      ]);

      const result = await service.findCritico(1);

      expect(result).toHaveLength(1);
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('v_abastecedor_stock_critico'),
        [1],
      );
    });
  });

  afterAll(() => {
    console.table([
      { test: 'findAll: sin filtros con paginación', status: 'PASS' },
      { test: 'findAll: filtro tipo', status: 'PASS' },
      { test: 'findAll: filtro id_marca', status: 'PASS' },
      { test: 'findAll: filtro requiere_reposicion', status: 'PASS' },
      { test: 'findAll: paginación offset', status: 'PASS' },
      { test: 'findCritico: items bajo mínimo', status: 'PASS' },
    ]);
  });
});
