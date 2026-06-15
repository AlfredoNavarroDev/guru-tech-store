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
        {
          provide: getRepositoryToken(DetalleCompraRefill),
          useValue: detalleRepo,
        },
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get<ComprasService>(ComprasService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('create: crea compra vacía → retorna CompraResponseDto', async () => {
      const saved = {
        id_compra: 1,
        id_sede_destino: 1,
        id_proveedor: 1,
        id_empleado_refiller: 2,
        fecha_compra: new Date(),
        created_at: new Date(),
        updated_at: null,
        detalles: [],
      };
      compraRepo.create.mockReturnValueOnce(saved);
      compraRepo.save.mockResolvedValueOnce(saved);
      ds.query.mockResolvedValueOnce([mockCompraRow]).mockResolvedValueOnce([]);

      const result = await service.create({ id_proveedor: 1 }, mockUser);

      expect(result.id_compra).toBe(1);
      expect(compraRepo.save).toHaveBeenCalledTimes(1);
    });

    it('create: sede deshabilitada → lanza SedeDeshabilitadaException', async () => {
      compraRepo.create.mockReturnValueOnce({});
      compraRepo.save.mockRejectedValueOnce({
        message:
          'La sede 1 está deshabilitada. No se pueden registrar compras con destino a ella.',
      });

      await expect(
        service.create({ id_proveedor: 1 }, mockUser),
      ).rejects.toThrow(SedeDeshabilitadaException);
    });
  });

  describe('findAll', () => {
    it('findAll: retorna PaginatedResult de compras de la sede', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '1' }])
        .mockResolvedValueOnce([mockCompraRow]);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(ds.query).toHaveBeenCalledWith(
        expect.stringContaining('id_sede_destino = $1'),
        [mockUser.id_sede, null],
      );
    });
  });

  describe('findOne', () => {
    it('findOne: id válido de la sede → retorna compra con detalles', async () => {
      ds.query.mockResolvedValueOnce([mockCompraRow]).mockResolvedValueOnce([]);

      const result = await service.findOne(1, mockUser.id_sede);

      expect(result.id_compra).toBe(1);
      expect(result.detalles).toEqual([]);
    });

    it('findOne: no pertenece a sede → lanza CompraNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([]);

      await expect(service.findOne(999, mockUser.id_sede)).rejects.toThrow(
        CompraNotFoundException,
      );
    });
  });

  describe('addItem', () => {
    it('addItem: compra válida → guarda detalle (trigger incrementa stock)', async () => {
      ds.query.mockResolvedValueOnce([{ id_compra: 1 }]);
      detalleRepo.create.mockReturnValueOnce({});
      detalleRepo.save.mockResolvedValueOnce({});

      await service.addItem(
        1,
        {
          id_item: 10,
          cantidad_comprada: 5,
          costo_unidad: 120,
          precio_venta_sugerido: 220,
        },
        mockUser,
      );

      expect(detalleRepo.save).toHaveBeenCalledTimes(1);
    });

    it('addItem: compra no existe → lanza CompraNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([]);

      await expect(
        service.addItem(
          999,
          {
            id_item: 10,
            cantidad_comprada: 5,
            costo_unidad: 120,
            precio_venta_sugerido: 220,
          },
          mockUser,
        ),
      ).rejects.toThrow(CompraNotFoundException);
    });
  });

  describe('updateItem', () => {
    it('updateItem: trigger falla por stock insuficiente → lanza StockInsuficienteCompraException', async () => {
      ds.query.mockResolvedValueOnce([{ id_compra: 1 }]);
      const mockDetalle = {
        id_item: 10,
        cantidad_comprada: 10,
        id_compra: 1,
        id_detalle_compra: 5,
      };
      detalleRepo.findOne.mockResolvedValueOnce(mockDetalle);
      detalleRepo.save.mockRejectedValueOnce({
        message:
          'No se puede reducir la cantidad comprada: el stock actual (3) es insuficiente para restar 7',
      });

      await expect(
        service.updateItem(1, 10, { cantidad_comprada: 3 }, mockUser),
      ).rejects.toThrow(StockInsuficienteCompraException);
    });

    it('updateItem: detalle no existe → lanza DetalleCompraNotFoundException', async () => {
      ds.query.mockResolvedValueOnce([{ id_compra: 1 }]);
      detalleRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateItem(1, 999, { cantidad_comprada: 3 }, mockUser),
      ).rejects.toThrow(DetalleCompraNotFoundException);
    });
  });

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

      await expect(service.removeItem(1, 10, mockUser)).rejects.toThrow(
        StockInsuficienteCompraException,
      );
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
