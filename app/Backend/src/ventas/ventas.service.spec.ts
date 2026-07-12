import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VentasService } from './ventas.service';
import {
  VentaNotFoundException,
  StockInsuficienteException,
  ImporteInvalidoException,
  DescuentoSinJustificacionException,
} from '../common/exceptions';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import type { JwtPayload } from '../common/types';
import type { CreateVentaDto } from './dto/create-venta.dto';
import type { QueryVentasDto } from './dto/query-ventas.dto';

const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const makeQb = (getRawOneResult?: unknown, getRawManyResult: unknown[] = []) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(getRawOneResult),
  getRawMany: jest.fn().mockResolvedValue(getRawManyResult),
});

const mockUser: JwtPayload = {
  sub: 10,
  id_sede: 1,
  rol: 'vendedor',
  nombre: 'Vendedor Test',
};

const validItem = {
  id_item: 1,
  cantidad: 2,
  precio_unitario_momento: 100,
  costo_unitario_momento: 60,
  importe: 200,
};

describe('VentasService', () => {
  let service: VentasService;
  let ventaRepo: ReturnType<typeof createMockRepository>;
  let detalleRepo: ReturnType<typeof createMockRepository>;
  let dataSource: {
    createQueryBuilder: jest.Mock;
    transaction: jest.Mock;
    manager: { query: jest.Mock };
  };

  beforeEach(async () => {
    ventaRepo = createMockRepository();
    detalleRepo = createMockRepository();
    dataSource = {
      createQueryBuilder: jest.fn(),
      transaction: jest.fn(),
      manager: { query: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: getRepositoryToken(Venta), useValue: ventaRepo },
        { provide: getRepositoryToken(DetalleVenta), useValue: detalleRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<VentasService>(VentasService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const buildManager = () => ({
      create: jest.fn().mockReturnValue({}),
      save: jest
        .fn()
        .mockResolvedValueOnce({
          id_venta: 1,
          fecha_emision: new Date('2026-01-01'),
        })
        .mockResolvedValueOnce({}),
      query: jest.fn().mockResolvedValue([]),
    });

    it('valida', async () => {
      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      const savedVenta = { id_venta: 1, detalles: [{ id_detalle_v: 1 }] };
      ventaRepo.findOne.mockResolvedValue(savedVenta);

      const result = await service.create({ items: [validItem] }, mockUser);

      expect(result).toEqual(savedVenta);
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(ventaRepo.findOne).toHaveBeenCalledWith({
        where: { id_venta: 1 },
        relations: { detalles: true },
      });
    });

    it('valida', async () => {
      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      ventaRepo.findOne.mockResolvedValue({ id_venta: 1, detalles: [] });

      await service.create({ items: [validItem] }, mockUser);

      expect(manager.create).toHaveBeenCalledWith(
        Venta,
        expect.objectContaining({
          id_empleado: mockUser.sub,
          id_sede: mockUser.id_sede,
        }),
      );
    });

    it('valida', async () => {
      let caught: Error | undefined;
      try {
        await service.create(
          { items: [validItem], monto_descuento: 10 },
          mockUser,
        );
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(DescuentoSinJustificacionException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      ventaRepo.findOne.mockResolvedValue({ id_venta: 1, detalles: [] });

      const dto: CreateVentaDto = {
        items: [validItem],
        monto_descuento: 10,
        justificacion_descuento: 'descuento por volumen',
      };

      let error: Error | undefined;
      try {
        await service.create(dto, mockUser);
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeUndefined();
    });

    it('valida', async () => {
      const badItem = { ...validItem, importe: 999 };

      let caught: Error | undefined;
      try {
        await service.create({ items: [badItem] }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(ImporteInvalidoException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      dataSource.transaction.mockRejectedValue(
        new Error('Stock insuficiente para id_item 1'),
      );

      let caught: Error | undefined;
      try {
        await service.create({ items: [validItem] }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(StockInsuficienteException);
    });

    it('valida', async () => {
      dataSource.transaction.mockRejectedValue(
        new Error('DB connection failed'),
      );

      let caught: Error | undefined;
      try {
        await service.create({ items: [validItem] }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught?.message).toBe('DB connection failed');
    });

    it('inserta garantia automaticamente dentro de la transaccion', async () => {
      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      ventaRepo.findOne.mockResolvedValue({
        id_venta: 1,
        fecha_emision: new Date('2026-01-01'),
        id_cliente: null,
        id_empleado: 10,
        id_sede: 1,
        monto_descuento: 0,
        tipo_descuento: null,
        justificacion_descuento: null,
        created_at: new Date(),
        updated_at: new Date(),
        detalles: [],
      });

      await service.create({ items: [validItem] }, mockUser);

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO garantias'),
        expect.any(Array),
      );
    });
  });

  describe('findAll', () => {
    const baseQuery: QueryVentasDto = { page: 1, limit: 20 };

    it('valida', async () => {
      const rows = [{ id_venta: 1 }];
      const mockQb = makeQb({ total: '3' });
      dataSource.createQueryBuilder.mockReturnValue(mockQb);
      dataSource.manager.query.mockResolvedValue(rows);

      const result = await service.findAll(mockUser, baseQuery);

      expect(result).toEqual({
        items: rows,
        total: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('valida', async () => {
      const mockQb = makeQb({ total: '0' });
      dataSource.createQueryBuilder.mockReturnValue(mockQb);
      dataSource.manager.query.mockResolvedValue([]);

      await service.findAll(mockUser, baseQuery);

      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining(':emp'),
        expect.objectContaining({ emp: mockUser.sub }),
      );
    });

    it('valida', async () => {
      const mockQb = makeQb({ total: '0' });
      dataSource.createQueryBuilder.mockReturnValue(mockQb);
      dataSource.manager.query.mockResolvedValue([]);

      await service.findAll(mockUser, {
        ...baseQuery,
        fecha_desde: '2026-01-01',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('fecha_emision >='),
        expect.any(Object),
      );
    });

    it('valida', async () => {
      const mockQb = makeQb({ total: '0' });
      dataSource.createQueryBuilder.mockReturnValue(mockQb);
      dataSource.manager.query.mockResolvedValue([]);

      await service.findAll(mockUser, {
        ...baseQuery,
        fecha_hasta: '2026-12-31',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('fecha_emision <='),
        expect.objectContaining({ hasta: '2026-12-31 23:59:59' }),
      );
    });

    it('valida', async () => {
      const mockQb = makeQb({ total: '0' });
      dataSource.createQueryBuilder.mockReturnValue(mockQb);
      dataSource.manager.query.mockResolvedValue([]);

      await service.findAll(mockUser, { ...baseQuery, id_cliente: 5 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('id_cliente'),
        expect.objectContaining({ cliente: 5 }),
      );
    });

    it('valida', async () => {
      const mockQb = makeQb({ total: '45' });
      dataSource.createQueryBuilder.mockReturnValue(mockQb);
      dataSource.manager.query.mockResolvedValue([]);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('valida', async () => {
      const rows = [{ id_venta: 1 }, { id_venta: 1 }];
      const mockQb = makeQb(undefined, rows);
      dataSource.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findOne(1, mockUser);

      expect(result).toEqual(rows);
      expect(mockQb.where).toHaveBeenCalledWith(
        expect.stringContaining('id_venta'),
        expect.objectContaining({ id: 1 }),
      );
    });

    it('valida', async () => {
      const mockQb = makeQb(undefined, []);
      dataSource.createQueryBuilder.mockReturnValue(mockQb);

      let caught: Error | undefined;
      try {
        await service.findOne(1, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(VentaNotFoundException);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('id_empleado'),
        expect.objectContaining({ emp: mockUser.sub }),
      );
    });

    it('valida', async () => {
      const mockQb = makeQb(undefined, []);
      dataSource.createQueryBuilder.mockReturnValue(mockQb);

      let caught: Error | undefined;
      try {
        await service.findOne(999, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(VentaNotFoundException);
    });
  });
});
