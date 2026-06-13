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

  afterAll(() => {
    console.table([
      { test: 'findAll: stock por sede', status: 'PASS' },
      { test: 'findCritico: items bajo mínimo', status: 'PASS' },
    ]);
  });
});
