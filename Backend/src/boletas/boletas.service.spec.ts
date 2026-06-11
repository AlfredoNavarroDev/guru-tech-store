import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BoletasService } from './boletas.service';
import { Boleta } from './entities/boleta.entity';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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

describe('BoletasService', () => {
  let service: BoletasService;
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
        BoletasService,
        { provide: getRepositoryToken(Boleta), useValue: boletaRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<BoletasService>(BoletasService);
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

  function mockTransaction() {
    const saved = {
      id_boleta: 1,
      numero: 'B002-0000001',
      id_venta: 1,
      total: 1000,
      estado: 'emitida',
      url_pdf: null as string | null,
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
      mockEmitQueries();
      const saved = mockTransaction();

      const result = await service.emitir(1, mockUser);

      expect(boletaRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          numero: 'B002-0000001',
          id_venta: 1,
          total: 1000,
        }),
      );
      expect(result).toBe(saved);
      expect(result.url_pdf).toBe(
        'https://cdn.test.com/boletas/ventas/B002-0000001.pdf',
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
});
