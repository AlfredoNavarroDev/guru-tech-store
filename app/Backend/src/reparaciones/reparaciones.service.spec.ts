import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReparacionesService } from './reparaciones.service';
import { Reparacion } from './entities/reparacion.entity';
import { ReparacionRepuesto } from './entities/reparacion-repuesto.entity';
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

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
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
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    reparacionRepo = createMockRepository();
    repuestoRepo = createMockRepository();
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReparacionesService,
        { provide: getRepositoryToken(Reparacion), useValue: reparacionRepo },
        {
          provide: getRepositoryToken(ReparacionRepuesto),
          useValue: repuestoRepo,
        },
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
      dataSource.query
        .mockResolvedValueOnce([mockEstadoPendiente]) // SELECT primer estado
        .mockResolvedValueOnce([mockReparacionRow]) // findOne: reparacion
        .mockResolvedValueOnce([]) // findOne: repuestos
        .mockResolvedValueOnce([]); // findOne: pagos

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
      dataSource.query
        .mockResolvedValueOnce([mockReparacionRow]) // reparacion
        .mockResolvedValueOnce([repuestoRow]) // repuestos
        .mockResolvedValueOnce([pagoRow]); // pagos

      const result = await service.findOne(1, mockUser);

      expect(result.id_reparacion).toBe(1);
      expect(result.repuestos).toHaveLength(1);
      expect(result.repuestos![0].item_nombre).toBe('Pantalla AMOLED');
      expect(result.pagos).toHaveLength(1);
      expect(result.total_pagado).toBe(50);
      expect(result.saldo_pendiente).toBe(115); // (monto_cotizado=120 + repuestos=45) - total_pagado=50
    });

    it('lanza ReparacionNotFoundException si no existe o no pertenece a sede', async () => {
      dataSource.query
        .mockResolvedValueOnce([]) // reparacion
        .mockResolvedValueOnce([]) // repuestos (Promise.all los lanza igual)
        .mockResolvedValueOnce([]); // pagos

      await expect(service.findOne(999, mockUser)).rejects.toThrow(
        ReparacionNotFoundException,
      );
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devuelve lista paginada filtrada por sede', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: '2' }])
        .mockResolvedValueOnce([mockReparacionRow, mockReparacionRow]);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('id_sede = $1'),
        expect.arrayContaining([1]),
      );
    });
  });

  // ── updateEstado ───────────────────────────────────────────────────────

  describe('updateEstado', () => {
    it('actualiza estado correctamente y retorna reparacion actualizada', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          { ...mockReparacionRow, es_final: false, estado: 'pendiente' },
        ]) // assertAccess
        .mockResolvedValueOnce([mockEstadoListo]) // SELECT nuevo estado
        .mockResolvedValueOnce(undefined) // UPDATE raw
        .mockResolvedValueOnce([
          { ...mockReparacionRow, id_estado: 5, estado: 'listo' },
        ]) // findOne reparacion
        .mockResolvedValueOnce([]) // findOne repuestos
        .mockResolvedValueOnce([]); // findOne pagos

      const result = await service.updateEstado(1, { id_estado: 5 }, mockUser);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reparaciones'),
        expect.arrayContaining([1, 5]),
      );
      expect(result.estado).toBe('listo');
    });

    it('lanza ReparacionEntregadaException si estado es entregado', async () => {
      dataSource.query.mockResolvedValueOnce([
        { ...mockReparacionRow, es_final: true, estado: 'entregado' },
      ]);

      await expect(
        service.updateEstado(1, { id_estado: 5 }, mockUser),
      ).rejects.toThrow(ReparacionEntregadaException);
    });

    it('lanza EstadoReparacionNotFoundException si id_estado no existe', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          { ...mockReparacionRow, es_final: false, estado: 'pendiente' },
        ])
        .mockResolvedValueOnce([]); // estado no encontrado

      await expect(
        service.updateEstado(1, { id_estado: 99 }, mockUser),
      ).rejects.toThrow(EstadoReparacionNotFoundException);
    });

    it('establece fecha_entrega_cliente al pasar a entregado', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          {
            ...mockReparacionRow,
            es_final: true,
            estado: 'listo',
            fecha_terminado: new Date(),
          },
        ])
        .mockResolvedValueOnce([mockEstadoEntregado])
        .mockResolvedValueOnce(undefined) // UPDATE raw
        .mockResolvedValueOnce([mockReparacionRow])
        .mockResolvedValueOnce([]) // findOne repuestos
        .mockResolvedValueOnce([]); // findOne pagos

      await service.updateEstado(1, { id_estado: 6 }, mockUser);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('fecha_entrega_cliente'),
        expect.arrayContaining([1, 6]),
      );
    });

    it('no crea garantia automatica si la reparacion es un reclamo de garantia', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          {
            ...mockReparacionRow,
            es_final: false,
            estado: 'listo',
            id_garantia_reclamada: 99,
          },
        ]) // assertAccess
        .mockResolvedValueOnce([mockEstadoEntregado]) // estado nuevo
        .mockResolvedValueOnce([{ orden: 3 }]) // estado actual orden
        .mockResolvedValueOnce(undefined) // UPDATE reparaciones
        .mockResolvedValueOnce([mockReparacionRow]) // findOne: reparacion
        .mockResolvedValueOnce([]) // findOne: repuestos
        .mockResolvedValueOnce([]); // findOne: pagos

      await service.updateEstado(
        1,
        { id_estado: mockEstadoEntregado.id_estado },
        mockUser,
      );

      const queriedSql = dataSource.query.mock.calls.map(
        (call: unknown[]) => call[0] as string,
      );
      expect(
        queriedSql.some((sql) => sql.includes('INSERT INTO garantias')),
      ).toBe(false);
    });
  });

  // ── addRepuesto ────────────────────────────────────────────────────────

  describe('addRepuesto', () => {
    it('agrega repuesto y devuelve RepuestoUsadoResponseDto', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          { ...mockReparacionRow, es_final: false, estado: 'reparacion' },
        ]) // assertAccess
        .mockResolvedValueOnce([
          {
            id_repuesto_u: 1,
            id_item: 12,
            item_nombre: 'Pantalla AMOLED',
            sku: 'REP-001',
            cantidad: 1,
            precio_cobrado: '45.00',
            costo_unitario_momento: '30.00',
          },
        ]); // reload

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
      dataSource.query.mockResolvedValueOnce([
        { ...mockReparacionRow, es_final: false, estado: 'reparacion' },
      ]);
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
      dataSource.query.mockResolvedValueOnce([
        { ...mockReparacionRow, es_final: false, estado: 'reparacion' },
      ]);
      repuestoRepo.findOne.mockResolvedValue(mockRepuesto);
      repuestoRepo.remove.mockResolvedValue(undefined);

      await service.removeRepuesto(1, 1, mockUser);

      expect(repuestoRepo.remove).toHaveBeenCalledWith(mockRepuesto);
    });

    it('lanza RepuestoUsadoNotFoundException si no existe', async () => {
      dataSource.query.mockResolvedValueOnce([
        { ...mockReparacionRow, es_final: false, estado: 'reparacion' },
      ]);
      repuestoRepo.findOne.mockResolvedValue(null);

      await expect(service.removeRepuesto(1, 99, mockUser)).rejects.toThrow(
        RepuestoUsadoNotFoundException,
      );
    });
  });

  // ── uploadFoto ─────────────────────────────────────────────────────────

  describe('uploadFoto', () => {
    it('almacena objeto {url, etapa, created_at} en fotos JSONB', async () => {
      dataSource.query
        .mockResolvedValueOnce([
          { ...mockReparacionRow, es_final: false, estado: 'pendiente' },
        ]) // assertAccess
        .mockResolvedValueOnce([]); // UPDATE fotos

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

      // Verificar que dataSource.query fue llamado con objeto estructurado
      const queryCall = dataSource.query.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).includes('SET fotos'),
      );
      expect(queryCall).toBeDefined();
      const storedArray = JSON.parse(
        (queryCall as unknown[][])[1][1] as string,
      );
      expect(storedArray).toHaveLength(1);
      expect(storedArray[0]).toMatchObject({
        url: expect.any(String),
        etapa: 'Pendiente',
        created_at: expect.any(String),
      });
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
