import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CatalogoService } from './catalogo.service';
import type { QueryCatalogoDto } from './dto/query-catalogo.dto';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogoService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CatalogoService>(CatalogoService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('valida', async () => {
      await service.findAll(1, {});

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('WHERE id_sede = $1');
      expect(params[0]).toBe(1);
    });

    it('valida', async () => {
      await service.findAll(1, {});

      const [sql] = dataSource.query.mock.calls[0];

      expect(sql).toContain('ORDER BY producto');
    });

    it('valida', async () => {
      const rows = [{ id_item: 1, producto: 'Laptop' }];
      dataSource.query.mockResolvedValue(rows);

      const result = await service.findAll(1, {});

      expect(result).toEqual(rows);
    });

    it('valida', async () => {
      await service.findAll(1, { nombre: 'laptop' });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('ILIKE');
      expect(params).toContain('%laptop%');
    });

    it('valida', async () => {
      await service.findAll(1, { con_stock: true });

      const [sql] = dataSource.query.mock.calls[0];

      expect(sql).toContain('stock_disponible > 0');
    });

    it('valida', async () => {
      await service.findAll(1, { categoria: 3 });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('item_categorias');
      expect(sql).toContain('ic.id_categoria');
      expect(params).toContain(3);
    });

    it('valida', async () => {
      await service.findAll(1, { categoria: 3, marca: 2 });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('ic.id_categoria');
      expect(sql).toContain('id_marca');
      expect(params).toContain(2);
      expect(params).toContain(3);
    });

    it('valida', async () => {
      await service.findAll(1, { marca: 5 });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('JOIN Items');
      expect(sql).toContain('id_marca');
      expect(params).toContain(5);
    });

    it('valida', async () => {
      await service.findAll(1, {
        marca: 5,
        nombre: 'mouse',
      });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('ILIKE');
      expect(params).toContain('%mouse%');
    });

    it('valida', async () => {
      await service.findAll(1, {
        marca: 5,
        con_stock: true,
      });

      const [sql] = dataSource.query.mock.calls[0];

      expect(sql).toContain('stock_disponible > 0');
    });

    it('valida', async () => {
      await service.findAll(2, {
        categoria: 1,
        marca: 3,
        nombre: 'mouse',
        con_stock: true,
      });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('ic.id_categoria');
      expect(sql).toContain('id_marca');
      expect(sql).toContain('ILIKE');
      expect(sql).toContain('stock_disponible > 0');
      expect(params).toContain(2);
      expect(params).toContain(1);
      expect(params).toContain(3);
      expect(params).toContain('%mouse%');
    });
  });
});
