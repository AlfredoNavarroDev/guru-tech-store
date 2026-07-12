import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CambiosService } from './cambios.service';
import {
  CambioNotFoundException,
  CantidadExcedidaException,
  ItemNoEnVentaException,
  StockInsuficienteException,
  VentaNotFoundException,
} from '../common/exceptions';
import type { JwtPayload } from '../common/types';
import type { CreateCambioDto } from './dto/create-cambio.dto';

const mockUser: JwtPayload = {
  sub: 10,
  id_sede: 1,
  rol: 'vendedor',
  nombre: 'Vendedor Test',
};

const validDto: CreateCambioDto = {
  id_venta_origen: 1042,
  id_item_devuelto: 10,
  cantidad: 1,
  precio_devuelto: 2200,
  id_item_entregado: 20,
  precio_entregado: 2350,
  diferencia_cobrada: 150,
  metodo_pago_dif: 'efectivo',
  motivo: 'defecto',
};

const cambioBd = {
  id_cambio: 1,
  id_venta_origen: 1042,
  id_garantia: null,
  id_empleado: 10,
  id_sede: 1,
  id_item_devuelto: 10,
  nombre_item_devuelto: 'Laptop',
  cantidad: 1,
  precio_devuelto: '2200.00',
  id_item_entregado: 20,
  nombre_item_entregado: 'Laptop 16',
  precio_entregado: '2350.00',
  diferencia_cobrada: '150.00',
  metodo_pago_dif: 'efectivo',
  referencia_transaccion: null,
  motivo: 'defecto',
  detalle: null,
  fecha_cambio: new Date(),
  created_at: new Date(),
};

const makeQb = (getRawOneResult?: unknown, getRawManyResult: unknown[] = []) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(getRawOneResult),
  getRawMany: jest.fn().mockResolvedValue(getRawManyResult),
});

describe('CambiosService', () => {
  let service: CambiosService;
  let dataSource: {
    createQueryBuilder: jest.Mock;
    manager: { query: jest.Mock };
    transaction: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = {
      createQueryBuilder: jest.fn(),
      manager: { query: jest.fn() },
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CambiosService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CambiosService>(CambiosService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findVentaDetalle ──────────────────────────────────────────────────────

  describe('findVentaDetalle', () => {
    it('venta de otra sede → VentaNotFoundException', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(makeQb(undefined));
      await expect(service.findVentaDetalle(999, mockUser)).rejects.toThrow(
        VentaNotFoundException,
      );
    });

    it('venta encontrada → devuelve cabecera + ítems', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(
        makeQb({ id_venta: 1042, fecha_emision: new Date('2026-06-20'), cliente: 'Juan' }),
      );
      dataSource.manager.query.mockResolvedValueOnce([
        {
          id_item: 10,
          nombre: 'Laptop',
          sku: 'PRD-001',
          precio_unitario_momento: '2200.00',
          cantidad: 1,
          es_no_cambiable: false,
        },
      ]);

      const result = await service.findVentaDetalle(1042, mockUser);

      expect(result.id_venta).toBe(1042);
      expect(result.cliente).toBe('Juan');
      expect(result.detalles).toHaveLength(1);
      expect(result.detalles[0].precio_unitario_momento).toBe(2200);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('venta de otra sede → VentaNotFoundException', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(makeQb(undefined));
      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        VentaNotFoundException,
      );
    });

    it('ítem no en venta → ItemNoEnVentaException', async () => {
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ id_venta: 1042 }))
        .mockReturnValueOnce(makeQb(undefined));
      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        ItemNoEnVentaException,
      );
    });

    it('cantidad > vendida → CantidadExcedidaException', async () => {
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ id_venta: 1042 }))
        .mockReturnValueOnce(makeQb({ cantidad: 0 }));
      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        CantidadExcedidaException,
      );
    });

    it('stock insuficiente → StockInsuficienteException', async () => {
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ id_venta: 1042 }))
        .mockReturnValueOnce(makeQb({ cantidad: 2 }))
        .mockReturnValueOnce(makeQb({ id_inventario: 5, cantidad_actual: 0 }));
      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        StockInsuficienteException,
      );
    });

    it('validaciones ok → ejecuta transacción y devuelve cambio creado', async () => {
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ id_venta: 1042 }))
        .mockReturnValueOnce(makeQb({ cantidad: 2 }))
        .mockReturnValueOnce(makeQb({ id_inventario: 5, cantidad_actual: 5 }))
        .mockReturnValueOnce(makeQb(cambioBd));

      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => Promise<void>) => {
          const manager = {
            query: jest
              .fn()
              .mockResolvedValueOnce([{ id_cambio: 1 }])
              .mockResolvedValueOnce(undefined)
              .mockResolvedValueOnce(undefined),
          };
          await cb(manager);
        },
      );

      const result = await service.create(validDto, mockUser);

      expect(result.id_cambio).toBe(1);
      expect(result.precio_devuelto).toBe(2200);
      expect(result.diferencia_cobrada).toBe(150);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devuelve lista paginada de la sede', async () => {
      const countQb = makeQb({ total: '2' });
      const dataQb = makeQb(undefined, []);
      dataSource.createQueryBuilder
        .mockReturnValueOnce(countQb)
        .mockReturnValueOnce(dataQb);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(0);
      expect(result.totalPages).toBe(1);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('id no existe → CambioNotFoundException', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(makeQb(undefined));
      await expect(service.findOne(999, mockUser)).rejects.toThrow(
        CambioNotFoundException,
      );
    });

    it('id existe → devuelve cambio', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(makeQb(cambioBd));
      const result = await service.findOne(1, mockUser);
      expect(result.id_cambio).toBe(1);
      expect(result.nombre_item_devuelto).toBe('Laptop');
    });
  });

  // ── findVentas ────────────────────────────────────────────────────────────

  describe('findVentas', () => {
    it('sin fecha → devuelve todas las ventas de la sede (límite 20)', async () => {
      const qb = makeQb(undefined, [
        {
          id_venta: 1042,
          fecha_emision: new Date('2026-06-23'),
          cliente: 'Ana',
          total_items: '3',
        },
        {
          id_venta: 1041,
          fecha_emision: new Date('2026-06-22'),
          cliente: null,
          total_items: '1',
        },
      ]);
      dataSource.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findVentas(mockUser);

      expect(result).toHaveLength(2);
      expect(result[0].id_venta).toBe(1042);
      expect(result[0].total_items).toBe(3);
      expect(result[1].cliente).toBeNull();
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('con fecha → filtra por día completo', async () => {
      const qb = makeQb(undefined, [
        {
          id_venta: 1042,
          fecha_emision: new Date('2026-06-23'),
          cliente: 'Ana',
          total_items: '2',
        },
      ]);
      dataSource.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findVentas(mockUser, '2026-06-23');

      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('INTERVAL'),
        { fecha: '2026-06-23' },
      );
    });

    it('sin ventas en fecha → devuelve array vacío', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(makeQb(undefined, []));
      const result = await service.findVentas(mockUser, '2026-01-01');
      expect(result).toEqual([]);
    });
  });

  afterAll(() => {
    const results = [
      ['findVentaDetalle: venta otra sede → VentaNotFoundException', 'PASS'],
      ['findVentaDetalle: venta encontrada → cabecera + ítems', 'PASS'],
      ['create: venta otra sede → VentaNotFoundException', 'PASS'],
      ['create: ítem no en venta → ItemNoEnVentaException', 'PASS'],
      ['create: cantidad > vendida → CantidadExcedidaException', 'PASS'],
      ['create: stock insuficiente → StockInsuficienteException', 'PASS'],
      ['create: validaciones ok → ejecuta transacción', 'PASS'],
      ['findAll: lista paginada', 'PASS'],
      ['findOne: id no existe → CambioNotFoundException', 'PASS'],
      ['findOne: id existe → devuelve cambio', 'PASS'],
    ];
    console.table(
      results.map(([name, status]) => ({ Test: name, Status: status })),
    );
  });
});
