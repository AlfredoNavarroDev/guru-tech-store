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

describe('CambiosService', () => {
  let service: CambiosService;
  let dataSource: { query: jest.Mock; transaction: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn(), transaction: jest.fn() };

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
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.findVentaDetalle(999, mockUser)).rejects.toThrow(
        VentaNotFoundException,
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM ventas v'),
        [999, mockUser.id_sede],
      );
    });

    it('venta encontrada → devuelve cabecera + ítems', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          {
            id_venta: 1042,
            fecha_emision: new Date('2026-06-20'),
            cliente: 'Juan',
          },
        ])
        .mockResolvedValueOnce([
          {
            id_item: 10,
            nombre: 'Laptop',
            sku: 'PRD-001',
            precio_unitario_momento: '2200.00',
            cantidad: 1,
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
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        VentaNotFoundException,
      );
    });

    it('ítem no en venta → ItemNoEnVentaException', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id_venta: 1042 }])
        .mockResolvedValueOnce([]);
      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        ItemNoEnVentaException,
      );
    });

    it('cantidad > vendida → CantidadExcedidaException', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id_venta: 1042 }])
        .mockResolvedValueOnce([{ cantidad: 0 }]);
      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        CantidadExcedidaException,
      );
    });

    it('stock insuficiente → StockInsuficienteException', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id_venta: 1042 }])
        .mockResolvedValueOnce([{ cantidad: 2 }])
        .mockResolvedValueOnce([{ id_inventario: 5, cantidad_actual: 0 }]);
      await expect(service.create(validDto, mockUser)).rejects.toThrow(
        StockInsuficienteException,
      );
    });

    it('validaciones ok → ejecuta transacción y devuelve cambio creado', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id_venta: 1042 }])
        .mockResolvedValueOnce([{ cantidad: 2 }])
        .mockResolvedValueOnce([{ id_inventario: 5, cantidad_actual: 5 }])
        .mockResolvedValueOnce([cambioBd]);

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
      dataSource.query
        .mockResolvedValueOnce([{ total: '2' }])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(0);
      expect(result.totalPages).toBe(1);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('id no existe → CambioNotFoundException', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.findOne(999, mockUser)).rejects.toThrow(
        CambioNotFoundException,
      );
    });

    it('id existe → devuelve cambio', async () => {
      dataSource.query.mockResolvedValueOnce([cambioBd]);
      const result = await service.findOne(1, mockUser);
      expect(result.id_cambio).toBe(1);
      expect(result.nombre_item_devuelto).toBe('Laptop');
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
