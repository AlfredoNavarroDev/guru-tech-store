import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotasVentaService } from './notas-venta.service';
import { NotaVenta } from './entities/nota-venta.entity';
import { PdfService } from '../common/pdf.service';
import type { JwtPayload } from '../common/types';

jest.mock(
  '@sparticuz/chromium',
  () => ({
    __esModule: true,
    default: {
      args: [],
      executablePath: jest.fn().mockResolvedValue('/usr/bin/chromium'),
      headless: true,
    },
  }),
  { virtual: true },
);

jest.mock('puppeteer-core', () => ({
  __esModule: true,
  default: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

const mockS3Send = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn(),
}));

const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
});

const mockUser: JwtPayload = {
  sub: 10,
  id_sede: 2,
  rol: 'vendedor',
  nombre: 'Vendedor Test',
};

const ventaRows = [
  {
    id_venta: 1,
    id_sede: 2,
    id_empleado: 10,
    sede_nombre: 'Sede Lima',
    sede_direccion: 'Av. Lima 123',
    sede_telefono: '999999999',
    vendedor: 'Juan Perez',
    fecha_emision: new Date('2026-01-01'),
    monto_descuento: '0',
    tipo_descuento: null,
    id_cliente: 1,
    cliente_nombre: 'Ana Lopez',
    cliente_tipo_doc: 'DNI',
    cliente_nro_doc: '12345678',
    producto: 'Laptop',
    sku: 'SKU-1',
    cantidad: 1,
    precio_unitario_momento: '1000',
    importe: '1000',
  },
];

const reparacionRows = [
  {
    id_reparacion: 5,
    id_sede: 2,
    sede_nombre: 'Sede Lima',
    sede_direccion: 'Av. Lima 123',
    sede_telefono: '999999999',
    tecnico: 'Carlos Ríos',
    fecha_ingreso: new Date('2026-06-01'),
    monto_cotizado: '150',
    monto_descuento: '0',
    tipo_descuento: null,
    id_cliente: 1,
    cliente_nombre: 'Ana Lopez',
    cliente_tipo_doc: 'DNI',
    cliente_nro_doc: '12345678',
    marca: 'Samsung',
    modelo: 'Galaxy S21',
    tipo_servicio: 'hardware',
    diagnostico_tecnico: 'Pantalla rota',
    fecha_estimada: '2026-06-10',
    producto: 'Pantalla Samsung S21',
    sku: 'REP-001',
    cantidad: 1,
    precio_cobrado: '80',
    importe: '80',
  },
];

describe('NotasVentaService', () => {
  let service: NotasVentaService;
  let boletaRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    boletaRepo = createMockRepository();
    dataSource = { query: jest.fn(), transaction: jest.fn() };
    configService = {
      get: jest.fn().mockImplementation((key: string, def?: string) => {
        const config: Record<string, string> = {
          R2_ACCOUNT_ID: 'test-account-id',
          R2_ACCESS_KEY_ID: 'test-key',
          R2_SECRET_ACCESS_KEY: 'test-secret',
          R2_BUCKET_NAME: 'test-bucket',
          R2_PUBLIC_URL: 'https://cdn.test.com',
        };
        return config[key] ?? def ?? '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotasVentaService,
        { provide: getRepositoryToken(NotaVenta), useValue: boletaRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
        { provide: PdfService, useValue: { generateFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf')) } },
      ],
    }).compile();

    service = module.get<NotasVentaService>(NotasVentaService);
    await service.onModuleInit();
    mockS3Send.mockClear();
  });

  afterEach(() => jest.clearAllMocks());

  function mockEmitQueries({
    owned = true,
    rows = ventaRows,
    pagos = [{ metodo_pago: 'efectivo', monto: '1000' }],
    count = '0',
  } = {}) {
    dataSource.query
      .mockResolvedValueOnce(owned ? [{ id_venta: 1 }] : [])
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce(pagos)
      .mockResolvedValueOnce([{ total: count }]);
  }

  function mockTransaction(overrides: Record<string, unknown> = {}) {
    const saved = {
      id_boleta: 1,
      numero: 'NV002-0000001',
      id_venta: 1,
      total: 1000,
      estado: 'emitida',
      url_pdf: null as string | null,
      ...overrides,
    };
    dataSource.transaction.mockImplementation((cb) =>
      cb({
        save: jest.fn().mockImplementation((_entity, value) => {
          Object.assign(saved, value);
          return Promise.resolve(saved);
        }),
      }),
    );
    boletaRepo.create.mockReturnValue(saved);
    return saved;
  }

  describe('emitir', () => {
    it('valida', async () => {
      mockEmitQueries({ owned: false });

      await expect(service.emitir(1, mockUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(boletaRepo.findOne).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValueOnce([{ id_venta: 1 }]);
      boletaRepo.findOne.mockResolvedValue({ id_boleta: 1, id_venta: 1 });

      await expect(service.emitir(1, mockUser)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValueOnce([{ id_venta: 1 }]);
      boletaRepo.findOne.mockResolvedValue(null);
      configService.get.mockImplementation((key: string, def?: string) => {
        const config: Record<string, string> = {
          R2_ACCOUNT_ID: 'test-account-id',
          R2_ACCESS_KEY_ID: 'test-key',
          R2_SECRET_ACCESS_KEY: 'test-secret',
          R2_PUBLIC_URL: 'https://cdn.test.com',
        };
        return config[key] ?? def ?? '';
      });

      await expect(service.emitir(1, mockUser)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      mockEmitQueries();
      const saved = mockTransaction();

      const result = await service.emitir(1, mockUser);

      expect(boletaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          numero: 'NV002-0000001',
          id_venta: 1,
          total: 1000,
        }),
      );
      expect(result).toBe(saved);
      expect(result.url_pdf).toBe(
        'https://cdn.test.com/boletas/ventas/NV002-0000001.pdf',
      );
      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });

    it('valida', async () => {
      mockEmitQueries();
      mockTransaction();

      await service.emitir(1, mockUser);

      const [sql, params] = dataSource.query.mock.calls[1];
      expect(sql).toContain('id_venta = $1');
      expect(sql).toContain('id_empleado = $2');
      expect(params).toEqual([1, mockUser.sub]);
    });
  });

  describe('findByVenta', () => {
    it('valida', async () => {
      const boleta = { id_boleta: 1, id_venta: 1, total: 1000 };
      dataSource.query.mockResolvedValueOnce([{ id_venta: 1 }]);
      boletaRepo.findOne.mockResolvedValue(boleta);

      await expect(service.findByVenta(1, mockUser)).resolves.toEqual(boleta);
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValueOnce([]);

      await expect(service.findByVenta(1, mockUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(boletaRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ── emitirParaCambio ──────────────────────────────────────────────────────

  describe('emitirParaCambio', () => {
    const mockCambioRow = {
      id_cambio: 7,
      id_sede: 2,
      id_empleado: 10,
      cantidad: 1,
      precio_devuelto: '22.50',
      precio_entregado: '85.00',
      diferencia_cobrada: '62.50',
      metodo_pago_dif: 'efectivo',
      motivo: 'defecto',
      detalle: null,
      fecha_cambio: new Date('2026-06-22'),
      id_venta_origen: 1,
      nombre_item_devuelto: 'Cable USB-C 2m',
      sku_devuelto: 'CAB-USBC-2M',
      nombre_item_entregado: 'Auriculares Bluetooth',
      sku_entregado: 'AUR-BT-001',
      sede_nombre: 'TechStore Lima Centro',
      sede_direccion: 'Av. Test 123',
      sede_telefono: '01-234-5678',
      vendedor: 'Luis Mamani Quispe',
    };

    it('cambio de otra sede → NotFoundException', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.emitirParaCambio(7, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cambio ya tiene boleta → ConflictException', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id_cambio: 7 }]) // assertCambioInSede
        .mockResolvedValueOnce([mockCambioRow]); // main data fetch
      boletaRepo.findOne.mockResolvedValueOnce({ id_boleta: 99 });
      await expect(service.emitirParaCambio(7, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('emite boleta, sube a R2, persiste con prefijo C', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id_cambio: 7 }]) // assertCambioInSede
        .mockResolvedValueOnce([mockCambioRow]) // main data fetch
        .mockResolvedValueOnce([{ total: '0' }]); // generarNumero COUNT

      boletaRepo.findOne.mockResolvedValueOnce(null);
      boletaRepo.create.mockImplementation((dto) => ({ ...dto, id_boleta: 5 }));

      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => Promise<void>) => {
          const manager = {
            save: jest
              .fn()
              .mockResolvedValueOnce({
                id_boleta: 5,
                numero: 'C002-0000001',
                url_pdf: null,
              })
              .mockResolvedValueOnce({
                id_boleta: 5,
                numero: 'C002-0000001',
                url_pdf: 'https://r2.dev/boletas/cambios/C002-0000001.pdf',
              }),
          };
          await cb(manager);
        },
      );

      const result = await service.emitirParaCambio(7, mockUser);

      expect(result.numero).toMatch(/^C/);
      expect(mockS3Send).toHaveBeenCalledTimes(1);
      expect(result.url_pdf).toContain('boletas/cambios/');
    });
  });

  // ── findByCambio ──────────────────────────────────────────────────────────

  describe('findByCambio', () => {
    it('cambio de otra sede → NotFoundException', async () => {
      dataSource.query.mockResolvedValueOnce([]);
      await expect(service.findByCambio(7, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cambio sin boleta → NotFoundException', async () => {
      dataSource.query.mockResolvedValueOnce([{ id_cambio: 7 }]);
      boletaRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findByCambio(7, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('boleta encontrada → la devuelve', async () => {
      dataSource.query.mockResolvedValueOnce([{ id_cambio: 7 }]);
      boletaRepo.findOne.mockResolvedValueOnce({
        id_boleta: 5,
        numero: 'C002-0000001',
        id_cambio: 7,
        url_pdf: 'https://r2.dev/boletas/cambios/C002-0000001.pdf',
      });
      const result = await service.findByCambio(7, mockUser);
      expect(result.id_boleta).toBe(5);
      expect(result.numero).toBe('C002-0000001');
    });
  });

  describe('emitirParaReparacion', () => {
    function mockReparacionQueries({
      inSede = true,
      rows = reparacionRows,
      pagos = [{ metodo_pago: 'efectivo', monto: '150' }],
      count = '0',
    } = {}) {
      dataSource.query
        .mockResolvedValueOnce(inSede ? [{ id_reparacion: 5 }] : [])
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce(pagos)
        .mockResolvedValueOnce([{ total: count }]);
    }

    function mockReparacionTransaction() {
      return mockTransaction({
        id_boleta: 2,
        id_reparacion: 5,
        id_venta: null,
        total: 230,
      });
    }

    it('reparacion de otra sede → NotFoundException', async () => {
      mockReparacionQueries({ inSede: false });
      await expect(
        service.emitirParaReparacion(5, mockUser),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(boletaRepo.findOne).not.toHaveBeenCalled();
    });

    it('reparacion ya tiene boleta → ConflictException', async () => {
      dataSource.query.mockResolvedValueOnce([{ id_reparacion: 5 }]);
      boletaRepo.findOne.mockResolvedValue({ id_boleta: 1, id_reparacion: 5 });
      await expect(
        service.emitirParaReparacion(5, mockUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('emite boleta, sube a R2 en ruta reparaciones/, devuelve boleta', async () => {
      mockReparacionQueries();
      const saved = mockReparacionTransaction();
      boletaRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.emitirParaReparacion(5, mockUser);

      expect(boletaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_reparacion: 5,
          id_venta: null,
          estado: 'emitida',
        }),
      );
      expect(mockS3Send).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
      expect(result.url_pdf).toContain('boletas/reparaciones/');
    });
  });
});
