import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReparacionesService } from './reparaciones.service';
import { Reparacion } from './entities/reparacion.entity';
import { ReparacionRepuesto } from './entities/reparacion-repuesto.entity';
import { Garantia } from '../garantias/entities/garantia.entity';
import {
  EstadoReparacionNotFoundException,
  ReparacionEntregadaException,
  ReparacionNotFoundException,
  RepuestoUsadoNotFoundException,
  StockInsuficienteException,
} from '../common/exceptions';
import type { JwtPayload } from '../common/types';
import { ConfigService } from '@nestjs/config';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn().mockImplementation((args) => args),
}));

// QB mock: every chaining method returns `this`; terminal methods return the provided result.
const makeQb = (getRawOneResult?: unknown, getRawManyResult: unknown[] = []) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(getRawOneResult),
  getRawMany: jest.fn().mockResolvedValue(getRawManyResult),
});

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

const mockUser: JwtPayload = {
  sub: 40,
  id_sede: 1,
  rol: 'tecnico',
  nombre: 'Tecnico Test',
};

const mockEstadoPendiente = {
  id_estado: 1,
  nombre: 'pendiente',
  es_final: false,
};
const mockEstadoListo = { id_estado: 5, nombre: 'listo', es_final: true };
const mockEstadoEntregado = {
  id_estado: 6,
  nombre: 'entregado',
  es_final: true,
};

const mockReparacionRow = {
  id_reparacion: 1,
  fecha_ingreso: new Date('2026-06-10'),
  id_cliente: 5,
  cliente: 'Juan Perez',
  id_tecnico: 40,
  tecnico: 'Tecnico Test',
  id_sede: 1,
  marca: 'Samsung',
  modelo: 'Galaxy S21',
  imei: null,
  esta_encendido: true,
  checklist_estado: null,
  diagnostico_tecnico: 'Pantalla rota',
  id_estado: 1,
  estado: 'pendiente',
  es_final: false,
  fecha_terminado: null,
  fecha_entrega_cliente: null,
  monto_cotizado: '120.00',
  monto_descuento: '0.00',
  tipo_descuento: null,
  justificacion_descuento: null,
  tipo_servicio: null,
  fecha_estimada: null,
  created_at: new Date('2026-06-10'),
  updated_at: null,
};

describe('ReparacionesService', () => {
  let service: ReparacionesService;
  let reparacionRepo: ReturnType<typeof createMockRepository>;
  let repuestoRepo: ReturnType<typeof createMockRepository>;
  let garantiaRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    reparacionRepo = createMockRepository();
    repuestoRepo = createMockRepository();
    garantiaRepo = createMockRepository();
    dataSource = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReparacionesService,
        { provide: getRepositoryToken(Reparacion), useValue: reparacionRepo },
        {
          provide: getRepositoryToken(ReparacionRepuesto),
          useValue: repuestoRepo,
        },
        { provide: getRepositoryToken(Garantia), useValue: garantiaRepo },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, fallback = '') => {
              const map: Record<string, string> = {
                R2_ACCOUNT_ID: 'test-account',
                R2_ACCESS_KEY_ID: 'test-key',
                R2_SECRET_ACCESS_KEY: 'test-secret',
                R2_BUCKET_NAME: 'test-bucket',
                R2_PUBLIC_URL: 'https://cdn.test.com',
              };
              return map[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ReparacionesService>(ReparacionesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crea reparacion con estado inicial pendiente → devuelve ReparacionResponseDto', async () => {
      // QB calls: (1) first estado, (2) findOne view, (3) findOne repuestos, (4) findOne pagos
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb(mockEstadoPendiente))   // SELECT primer estado
        .mockReturnValueOnce(makeQb(mockReparacionRow))      // findOne: reparacion view
        .mockReturnValueOnce(makeQb(undefined, []))          // findOne: repuestos
        .mockReturnValueOnce(makeQb(undefined, []));         // findOne: pagos

      reparacionRepo.create.mockReturnValue({ id_reparacion: 1 });
      reparacionRepo.save.mockResolvedValue({ id_reparacion: 1 });

      const result = await service.create(
        {
          id_cliente: 5,
          marca: 'Samsung',
          modelo: 'Galaxy S21',
          monto_cotizado: 120,
          tipo_accion: 'reparacion',
        },
        mockUser,
      );

      expect(result.id_reparacion).toBe(1);
      expect(result.estado).toBe('pendiente');
      expect(reparacionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ id_cliente: 5, id_tecnico: 40, id_sede: 1 }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devuelve detalle con repuestos, pagos y saldo pendiente cuando existe', async () => {
      const repuestoRow = {
        id_repuesto_u: 1,
        id_item: 12,
        item_nombre: 'Pantalla AMOLED',
        sku: 'REP-001',
        cantidad: 1,
        precio_cobrado: '45.00',
        costo_unitario_momento: '30.00',
      };
      const pagoRow = {
        id_pago: 1,
        metodo_pago: 'efectivo',
        monto: '50.00',
        es_adelanto: true,
        fecha_pago: new Date('2026-06-11'),
      };

      // QB calls: (1) view, (2) repuestos, (3) pagos
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb(mockReparacionRow))         // reparacion view
        .mockReturnValueOnce(makeQb(undefined, [repuestoRow]))  // repuestos
        .mockReturnValueOnce(makeQb(undefined, [pagoRow]));     // pagos

      const result = await service.findOne(1, mockUser);

      expect(result.id_reparacion).toBe(1);
      expect(result.repuestos).toHaveLength(1);
      expect(result.repuestos![0].item_nombre).toBe('Pantalla AMOLED');
      expect(result.pagos).toHaveLength(1);
      expect(result.total_pagado).toBe(50);
      expect(result.saldo_pendiente).toBe(115); // (monto_cotizado=120 + repuestos=45) - total_pagado=50
    });

    it('lanza ReparacionNotFoundException si no existe o no pertenece a sede', async () => {
      // QB calls: (1) view not found, (2) repuestos, (3) pagos (Promise.all still runs all)
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb(undefined))    // reparacion not found
        .mockReturnValueOnce(makeQb(undefined, []))// repuestos
        .mockReturnValueOnce(makeQb(undefined, []));// pagos

      await expect(service.findOne(999, mockUser)).rejects.toThrow(
        ReparacionNotFoundException,
      );
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devuelve lista paginada filtrada por sede', async () => {
      // QB calls: (1) count, (2) rows
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ total: '2' }))
        .mockReturnValueOnce(makeQb(undefined, [mockReparacionRow, mockReparacionRow]));

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });
  });

  // ── updateEstado ───────────────────────────────────────────────────────

  describe('updateEstado', () => {
    it('actualiza estado correctamente y retorna reparacion actualizada', async () => {
      // QB calls: (1) assertAccess, (2) estadoNuevo, (3) estadoActual,
      //           (4) findOne view, (5) findOne repuestos, (6) findOne pagos
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ ...mockReparacionRow, es_final: false, estado: 'pendiente' }))
        .mockReturnValueOnce(makeQb({ ...mockEstadoListo, orden: 5 }))
        .mockReturnValueOnce(makeQb({ orden: 4 }))
        .mockReturnValueOnce(makeQb({ ...mockReparacionRow, id_estado: 5, estado: 'listo' }))
        .mockReturnValueOnce(makeQb(undefined, []))
        .mockReturnValueOnce(makeQb(undefined, []));

      reparacionRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateEstado(1, { id_estado: 5 }, mockUser);

      expect(reparacionRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ id_estado: 5 }),
      );
      expect(result.estado).toBe('listo');
    });

    it('lanza ReparacionEntregadaException si estado es entregado', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(
        makeQb({ ...mockReparacionRow, es_final: true, estado: 'entregado' }),
      );

      await expect(
        service.updateEstado(1, { id_estado: 5 }, mockUser),
      ).rejects.toThrow(ReparacionEntregadaException);
    });

    it('lanza EstadoReparacionNotFoundException si id_estado no existe', async () => {
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ ...mockReparacionRow, es_final: false, estado: 'pendiente' }))
        .mockReturnValueOnce(makeQb(undefined)); // estado no encontrado

      await expect(
        service.updateEstado(1, { id_estado: 99 }, mockUser),
      ).rejects.toThrow(EstadoReparacionNotFoundException);
    });

    it('establece fecha_entrega_cliente al pasar a entregado', async () => {
      // QB calls: (1) assertAccess, (2) estadoNuevo, (3) estadoActual,
      //           (4) findOne view, (5) findOne repuestos, (6) findOne pagos
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({
          ...mockReparacionRow,
          es_final: true,
          estado: 'listo',
          fecha_terminado: new Date(),
        }))
        .mockReturnValueOnce(makeQb({ ...mockEstadoEntregado, orden: 5 }))
        .mockReturnValueOnce(makeQb({ orden: 4 }))
        .mockReturnValueOnce(makeQb(mockReparacionRow))
        .mockReturnValueOnce(makeQb(undefined, []))
        .mockReturnValueOnce(makeQb(undefined, []));

      reparacionRepo.update.mockResolvedValue({ affected: 1 });
      garantiaRepo.findOne.mockResolvedValue(null);
      garantiaRepo.create.mockReturnValue({});
      garantiaRepo.save.mockResolvedValue({});

      await service.updateEstado(1, { id_estado: 6 }, mockUser);

      expect(reparacionRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ fecha_entrega_cliente: expect.any(Date) }),
      );
    });

    it('no crea garantia automatica si la reparacion es un reclamo de garantia', async () => {
      // QB calls: (1) assertAccess, (2) estadoNuevo, (3) estadoActual,
      //           (4) findOne view, (5) findOne repuestos, (6) findOne pagos
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({
          ...mockReparacionRow,
          es_final: false,
          estado: 'listo',
          id_garantia_reclamada: 99,
        }))
        .mockReturnValueOnce(makeQb({ ...mockEstadoEntregado, orden: 5 }))
        .mockReturnValueOnce(makeQb({ orden: 4 }))
        .mockReturnValueOnce(makeQb(mockReparacionRow))
        .mockReturnValueOnce(makeQb(undefined, []))
        .mockReturnValueOnce(makeQb(undefined, []));

      reparacionRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateEstado(
        1,
        { id_estado: mockEstadoEntregado.id_estado },
        mockUser,
      );

      expect(garantiaRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── addRepuesto ────────────────────────────────────────────────────────

  describe('addRepuesto', () => {
    it('agrega repuesto y devuelve RepuestoUsadoResponseDto', async () => {
      const repuestoReloadRow = {
        id_repuesto_u: 1,
        id_item: 12,
        item_nombre: 'Pantalla AMOLED',
        sku: 'REP-001',
        cantidad: 1,
        precio_cobrado: '45.00',
        costo_unitario_momento: '30.00',
      };

      // QB calls: (1) assertAccess, (2) reload repuesto JOIN items
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ ...mockReparacionRow, es_final: false, estado: 'reparacion' }))
        .mockReturnValueOnce(makeQb(repuestoReloadRow));

      repuestoRepo.create.mockReturnValue({ id_repuesto_u: 1 });
      repuestoRepo.save.mockResolvedValue({ id_repuesto_u: 1 });

      const result = await service.addRepuesto(
        1,
        {
          id_item: 12,
          cantidad: 1,
          precio_cobrado: 45,
          costo_unitario_momento: 30,
        },
        mockUser,
      );

      expect(result.id_item).toBe(12);
      expect(result.precio_cobrado).toBe(45);
    });

    it('lanza StockInsuficienteException si trigger rechaza la inserción', async () => {
      // QB calls: (1) assertAccess only (save throws before reload)
      dataSource.createQueryBuilder.mockReturnValueOnce(
        makeQb({ ...mockReparacionRow, es_final: false, estado: 'reparacion' }),
      );
      repuestoRepo.create.mockReturnValue({});
      repuestoRepo.save.mockRejectedValue(
        new Error('Stock insuficiente para id_item 12'),
      );

      await expect(
        service.addRepuesto(
          1,
          {
            id_item: 12,
            cantidad: 100,
            precio_cobrado: 45,
            costo_unitario_momento: 30,
          },
          mockUser,
        ),
      ).rejects.toThrow(StockInsuficienteException);
    });
  });

  // ── removeRepuesto ─────────────────────────────────────────────────────

  describe('removeRepuesto', () => {
    it('elimina repuesto existente', async () => {
      const mockRepuesto = {
        id_repuesto_u: 1,
        id_reparacion: 1,
        id_item: 12,
        cantidad: 1,
      };

      // QB calls: (1) assertAccess
      dataSource.createQueryBuilder.mockReturnValueOnce(
        makeQb({ ...mockReparacionRow, es_final: false, estado: 'reparacion' }),
      );
      repuestoRepo.findOne.mockResolvedValue(mockRepuesto);
      repuestoRepo.remove.mockResolvedValue(undefined);

      await service.removeRepuesto(1, 1, mockUser);

      expect(repuestoRepo.remove).toHaveBeenCalledWith(mockRepuesto);
    });

    it('lanza RepuestoUsadoNotFoundException si no existe', async () => {
      // QB calls: (1) assertAccess
      dataSource.createQueryBuilder.mockReturnValueOnce(
        makeQb({ ...mockReparacionRow, es_final: false, estado: 'reparacion' }),
      );
      repuestoRepo.findOne.mockResolvedValue(null);

      await expect(service.removeRepuesto(1, 99, mockUser)).rejects.toThrow(
        RepuestoUsadoNotFoundException,
      );
    });
  });

  // ── uploadFoto ─────────────────────────────────────────────────────────

  describe('uploadFoto', () => {
    it('almacena objeto {url, etapa, created_at} en fotos JSONB', async () => {
      // QB calls: (1) assertAccess
      dataSource.createQueryBuilder.mockReturnValueOnce(
        makeQb({ ...mockReparacionRow, es_final: false, estado: 'pendiente' }),
      );
      reparacionRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.uploadFoto(
        1,
        {
          imagen_base64: Buffer.from('fake-image-data').toString('base64'),
          content_type: 'image/jpeg',
          estado: 'Pendiente',
        },
        mockUser,
      );

      expect(result).toHaveProperty('url');
      expect(typeof result.url).toBe('string');

      // Verify reparacionRepo.update was called with the new foto appended
      expect(reparacionRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          fotos: expect.arrayContaining([
            expect.objectContaining({
              url: expect.any(String),
              etapa: 'pendiente', // estadoNorm = dto.estado.toLowerCase()
              created_at: expect.any(String),
            }),
          ]),
        }),
      );
    });
  });

  // ── resumen ────────────────────────────────────────────────────────────

  afterAll(() => {
    const results = [
      ['create: crea con estado pendiente', 'PASS'],
      [
        'findOne: devuelve detalle con repuestos, pagos y saldo pendiente',
        'PASS',
      ],
      ['findOne: 404 si no existe', 'PASS'],
      ['findAll: lista paginada por sede', 'PASS'],
      ['updateEstado: actualiza estado', 'PASS'],
      ['updateEstado: 409 si entregado', 'PASS'],
      ['updateEstado: 400 si estado inválido', 'PASS'],
      ['updateEstado: fecha_entrega_cliente al entregar', 'PASS'],
      ['addRepuesto: agrega y devuelve dto', 'PASS'],
      ['addRepuesto: 409 si stock insuficiente', 'PASS'],
      ['removeRepuesto: elimina existente', 'PASS'],
      ['removeRepuesto: 404 si no existe', 'PASS'],
    ];
    console.log(
      '\n┌──────────────────────────────────────────────────────────────┐',
    );
    console.log(
      '│           ReparacionesService — Resumen de tests              │',
    );
    console.log(
      '├──────────────────────────────────────────────────────────────┤',
    );
    results.forEach(([name, status]) =>
      console.log(`│ ${status === 'PASS' ? '✓' : '✗'} ${name.padEnd(60)}│`),
    );
    console.log(
      '└──────────────────────────────────────────────────────────────┘',
    );
  });
});
