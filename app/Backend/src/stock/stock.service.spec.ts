import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StockService } from './stock.service';
import { StockView } from './entities/stock-view.entity';
import { StockCriticoView } from './entities/stock-critico-view.entity';

const mockStockRow = {
  id_item: 1,
  sku: 'PRD-001',
  item: 'Cable USB-C',
  tipo: 'producto',
  marca: 'Anker',
  categoria: 'Cables y Cargadores',
  cantidad_actual: 50,
  stock_minimo: 5,
  diferencia_stock: 45,
  requiere_reposicion: false,
  precio_compra_actual: '8.50',
};

const createMockQb = () => {
  const qb = {
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  qb.andWhere.mockReturnThis();
  qb.orderBy.mockReturnThis();
  qb.skip.mockReturnThis();
  qb.take.mockReturnThis();
  return qb;
};

describe('StockService', () => {
  let service: StockService;
  let mockQb: ReturnType<typeof createMockQb>;
  let stockRepo: { createQueryBuilder: jest.Mock };
  let stockCriticoRepo: { find: jest.Mock };

  beforeEach(async () => {
    mockQb = createMockQb();
    stockRepo = { createQueryBuilder: jest.fn().mockReturnValue(mockQb) };
    stockCriticoRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: getRepositoryToken(StockView), useValue: stockRepo },
        { provide: getRepositoryToken(StockCriticoView), useValue: stockCriticoRepo },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns PaginatedResult with correct shape', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[mockStockRow], 1]);

      const result = await service.findAll(1, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('filters by id_sede when provided', async () => {
      await service.findAll(1, { page: 1, limit: 20 });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('id_sede'),
        expect.objectContaining({ idSede: 1 }),
      );
    });

    it('skips sede filter when idSede is null', async () => {
      await service.findAll(null, { page: 1, limit: 20 });
      const sedeCalls = mockQb.andWhere.mock.calls.filter(
        (c: unknown[]) => String(c[0]).includes('id_sede'),
      );
      expect(sedeCalls).toHaveLength(0);
    });

    it('adds tipo filter when provided', async () => {
      await service.findAll(1, { page: 1, limit: 20, tipo: 'repuesto' });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('tipo'),
        expect.objectContaining({ tipo: 'repuesto' }),
      );
    });

    it('adds id_marca subquery filter when provided', async () => {
      await service.findAll(1, { page: 1, limit: 20, id_marca: 3 });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('id_marca'),
        expect.objectContaining({ idMarca: 3 }),
      );
    });

    it('adds requiere_reposicion filter when provided', async () => {
      await service.findAll(1, { page: 1, limit: 20, requiere_reposicion: true });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('requiere_reposicion'),
        expect.objectContaining({ req: true }),
      );
    });

    it('orders by diferencia_stock ASC when requiere_reposicion is true', async () => {
      await service.findAll(1, { page: 1, limit: 20, requiere_reposicion: true });
      expect(mockQb.orderBy).toHaveBeenCalledWith('sv.diferencia_stock', 'ASC');
    });

    it('orders by item ASC when no requiere_reposicion filter', async () => {
      await service.findAll(1, { page: 1, limit: 20 });
      expect(mockQb.orderBy).toHaveBeenCalledWith('sv.item', 'ASC');
    });

    it('applies correct pagination offset for page 2', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 25]);
      const result = await service.findAll(1, { page: 2, limit: 10 });
      expect(result.totalPages).toBe(3);
      expect(mockQb.skip).toHaveBeenCalledWith(10); // (2-1)*10
    });

    it('converts precio_compra_actual string to number', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[mockStockRow], 1]);
      const result = await service.findAll(1, { page: 1, limit: 20 });
      const [row] = result.items as Array<{ precio_compra_actual: unknown }>;
      expect(row.precio_compra_actual).toBe(8.5);
    });
  });

  describe('findCritico', () => {
    it('queries stock critico repo with sede filter', async () => {
      stockCriticoRepo.find.mockResolvedValue([{ ...mockStockRow, unidades_faltantes: 5 }]);
      const result = await service.findCritico(1);
      expect(result).toHaveLength(1);
      expect(stockCriticoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_sede: 1 } }),
      );
    });

    it('skips sede filter when idSede is null', async () => {
      await service.findCritico(null);
      expect(stockCriticoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('orders by unidades_faltantes DESC', async () => {
      await service.findCritico(1);
      expect(stockCriticoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { unidades_faltantes: 'DESC' } }),
      );
    });

    it('converts precio_compra_actual string to number', async () => {
      stockCriticoRepo.find.mockResolvedValue([{ ...mockStockRow }]);
      const [row] = (await service.findCritico(1)) as Array<{ precio_compra_actual: unknown }>;
      expect(row.precio_compra_actual).toBe(8.5);
    });
  });
});
