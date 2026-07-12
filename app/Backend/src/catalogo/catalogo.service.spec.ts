import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CatalogoService } from './catalogo.service';
import { CatalogoView } from './entities/catalogo-view.entity';

const createMockQb = () => {
  const qb = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  qb.where.mockReturnThis();
  qb.andWhere.mockReturnThis();
  qb.orderBy.mockReturnThis();
  return qb;
};

describe('CatalogoService', () => {
  let service: CatalogoService;
  let mockQb: ReturnType<typeof createMockQb>;

  beforeEach(async () => {
    mockQb = createMockQb();
    const catRepo = { createQueryBuilder: jest.fn().mockReturnValue(mockQb) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogoService,
        { provide: getRepositoryToken(CatalogoView), useValue: catRepo },
      ],
    }).compile();

    service = module.get<CatalogoService>(CatalogoService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('filters by sede and orders by producto', async () => {
      await service.findAll(1, {});
      expect(mockQb.where).toHaveBeenCalledWith('cv.id_sede = :idSede', { idSede: 1 });
      expect(mockQb.orderBy).toHaveBeenCalledWith('cv.producto', 'ASC');
    });

    it('returns result from getMany', async () => {
      const rows = [{ id_item: 1, producto: 'Laptop' }];
      mockQb.getMany.mockResolvedValue(rows);
      const result = await service.findAll(1, {});
      expect(result).toEqual(rows);
    });

    it('adds ILIKE filter for nombre', async () => {
      await service.findAll(1, { nombre: 'laptop' });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'cv.producto ILIKE :nombre',
        { nombre: '%laptop%' },
      );
    });

    it('adds stock_disponible > 0 when con_stock true', async () => {
      await service.findAll(1, { con_stock: true });
      expect(mockQb.andWhere).toHaveBeenCalledWith('cv.stock_disponible > 0');
    });

    it('skips stock filter when con_stock is false/undefined', async () => {
      await service.findAll(1, {});
      const stockCalls = mockQb.andWhere.mock.calls.filter(
        (c: unknown[]) => String(c[0]).includes('stock'),
      );
      expect(stockCalls).toHaveLength(0);
    });

    it('adds item_categorias subquery for categoria filter', async () => {
      await service.findAll(1, { categoria: 3 });
      const call = mockQb.andWhere.mock.calls.find(
        (c: unknown[]) => String(c[0]).includes('item_categorias') && String(c[0]).includes('id_categoria'),
      );
      expect(call).toBeDefined();
      expect(call![1]).toEqual(expect.objectContaining({ cat: 3 }));
    });

    it('adds items subquery for marca filter', async () => {
      await service.findAll(1, { marca: 5 });
      const call = mockQb.andWhere.mock.calls.find(
        (c: unknown[]) => String(c[0]).includes('id_marca'),
      );
      expect(call).toBeDefined();
      expect(call![1]).toEqual(expect.objectContaining({ marca: 5 }));
    });

    it('combines categoria and marca filters', async () => {
      await service.findAll(1, { categoria: 3, marca: 2 });
      const catCall = mockQb.andWhere.mock.calls.find(
        (c: unknown[]) => String(c[0]).includes('id_categoria'),
      );
      const marcaCall = mockQb.andWhere.mock.calls.find(
        (c: unknown[]) => String(c[0]).includes('id_marca'),
      );
      expect(catCall![1]).toEqual(expect.objectContaining({ cat: 3 }));
      expect(marcaCall![1]).toEqual(expect.objectContaining({ marca: 2 }));
    });

    it('combines all filters', async () => {
      await service.findAll(2, { categoria: 1, marca: 3, nombre: 'mouse', con_stock: true });
      expect(mockQb.where).toHaveBeenCalledWith('cv.id_sede = :idSede', { idSede: 2 });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('item_categorias'),
        expect.objectContaining({ cat: 1 }),
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('id_marca'),
        expect.objectContaining({ marca: 3 }),
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith('cv.producto ILIKE :nombre', { nombre: '%mouse%' });
      expect(mockQb.andWhere).toHaveBeenCalledWith('cv.stock_disponible > 0');
    });
  });
});
