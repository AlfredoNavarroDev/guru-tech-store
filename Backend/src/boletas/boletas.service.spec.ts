import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BoletasService } from './boletas.service';
import { Boleta } from './entities/boleta.entity';

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockS3Send = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn(),
}));

const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('BoletasService', () => {
  let service: BoletasService;
  let boletaRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let configService: { get: jest.Mock };

  const ventaRow = {
    id_venta: 1,
    id_sede: 2,
    sede: 'Sede Lima',
    vendedor: 'Juan Perez',
    cliente: 'Ana Lopez',
    doc_cliente: '12345678',
    fecha_emision: new Date('2026-01-01'),
    monto_descuento: '0',
    tipo_descuento: null,
  };

  const detalles = [
    {
      producto: 'Laptop',
      cantidad: 1,
      precio_unitario_momento: 1000,
      importe: 1000,
    },
  ];

  const buildManager = (numero = 'B002-0000001') => {
    const boletaSaved = {
      id_boleta: 1,
      numero,
      id_venta: 1,
      total: 1000,
      estado: 'emitida',
      url_pdf: null,
    };
    return {
      save: jest.fn().mockResolvedValue(boletaSaved),
    };
  };

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
    mockS3Send.mockClear();
  });

  afterEach(() => jest.clearAllMocks());

  describe('emitir', () => {
    it('throws ConflictException when boleta already exists for venta', async () => {
      console.log(
        '\n🔍 Acción   : emitir(1) — boleta ya existe para esa venta',
      );
      console.log(
        '📌 Espera   : ConflictException, dataSource.query no llamado',
      );

      boletaRepo.findOne.mockResolvedValue({ id_boleta: 1, id_venta: 1 });

      let caught: Error | undefined;
      try {
        await service.emitir(1);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(ConflictException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when venta does not exist', async () => {
      console.log('\n🔍 Acción   : emitir(999) — venta inexistente');
      console.log('📌 Espera   : NotFoundException, transaction no llamado');

      boletaRepo.findOne.mockResolvedValue(null);
      dataSource.query.mockResolvedValueOnce([]);

      let caught: Error | undefined;
      try {
        await service.emitir(999);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('calculates total without discount when tipo_descuento is null', async () => {
      console.log('\n🔍 Acción   : emitir(1) — sin descuento, importe=1000');
      console.log('📌 Espera   : total = 1000');

      boletaRepo.findOne.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([ventaRow])
        .mockResolvedValueOnce(detalles)
        .mockResolvedValueOnce([{ total: '0' }]);

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      boletaRepo.create.mockReturnValue({
        numero: 'B002-0000001',
        id_venta: 1,
        id_reparacion: null,
        total: 1000,
        estado: 'emitida',
        url_pdf: null,
      });

      await service.emitir(1);

      const createArg = boletaRepo.create.mock.calls[0][0];
      console.log('✅ Resultado: total =', createArg.total);

      expect(createArg.total).toBe(1000);
    });

    it('calculates total with porcentaje discount correctly', async () => {
      console.log(
        '\n🔍 Acción   : emitir(1) — descuento 10% sobre subtotal=1000',
      );
      console.log('📌 Espera   : total = 900');

      const ventaConDescuento = {
        ...ventaRow,
        monto_descuento: '10',
        tipo_descuento: 'porcentaje',
      };

      boletaRepo.findOne.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([ventaConDescuento])
        .mockResolvedValueOnce(detalles)
        .mockResolvedValueOnce([{ total: '0' }]);

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      boletaRepo.create.mockReturnValue({});

      await service.emitir(1);

      const createArg = boletaRepo.create.mock.calls[0][0];
      console.log('✅ Resultado: total =', createArg.total);

      expect(createArg.total).toBe(900);
    });

    it('calculates total with monto_fijo discount correctly', async () => {
      console.log(
        '\n🔍 Acción   : emitir(1) — descuento fijo S/50 sobre subtotal=1000',
      );
      console.log('📌 Espera   : total = 950');

      const ventaConDescuento = {
        ...ventaRow,
        monto_descuento: '50',
        tipo_descuento: 'monto_fijo',
      };

      boletaRepo.findOne.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([ventaConDescuento])
        .mockResolvedValueOnce(detalles)
        .mockResolvedValueOnce([{ total: '0' }]);

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      boletaRepo.create.mockReturnValue({});

      await service.emitir(1);

      const createArg = boletaRepo.create.mock.calls[0][0];
      console.log('✅ Resultado: total =', createArg.total);

      expect(createArg.total).toBe(950);
    });

    it('clamps total to 0 when discount exceeds subtotal', async () => {
      console.log(
        '\n🔍 Acción   : emitir(1) — descuento fijo S/1500 sobre subtotal=1000',
      );
      console.log('📌 Espera   : total = 0 (no negativo)');

      const ventaConDescuento = {
        ...ventaRow,
        monto_descuento: '1500',
        tipo_descuento: 'monto_fijo',
      };

      boletaRepo.findOne.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([ventaConDescuento])
        .mockResolvedValueOnce(detalles)
        .mockResolvedValueOnce([{ total: '0' }]);

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      boletaRepo.create.mockReturnValue({});

      await service.emitir(1);

      const createArg = boletaRepo.create.mock.calls[0][0];
      console.log('✅ Resultado: total =', createArg.total);

      expect(createArg.total).toBe(0);
    });

    it('generates numero with correct format B{sede_padded}-{seq_padded}', async () => {
      console.log(
        '\n🔍 Acción   : emitir(1) — id_sede=2, 5 boletas existentes → seq=6',
      );
      console.log('📌 Espera   : numero = "B002-0000006"');

      boletaRepo.findOne.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([ventaRow])
        .mockResolvedValueOnce(detalles)
        .mockResolvedValueOnce([{ total: '5' }]);

      const manager = buildManager('B002-0000006');
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      boletaRepo.create.mockReturnValue({});

      await service.emitir(1);

      const createArg = boletaRepo.create.mock.calls[0][0];
      console.log('✅ Resultado: numero =', createArg.numero);

      expect(createArg.numero).toBe('B002-0000006');
    });

    it('queries generarNumero with correct sede prefix', async () => {
      console.log(
        '\n🔍 Acción   : emitir(1) — verificar que COUNT usa prefijo correcto',
      );
      console.log('📌 Espera   : COUNT query llamado con "B002-%"');

      boletaRepo.findOne.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([ventaRow])
        .mockResolvedValueOnce(detalles)
        .mockResolvedValueOnce([{ total: '0' }]);

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      boletaRepo.create.mockReturnValue({});

      await service.emitir(1);

      const [, countParams] = dataSource.query.mock.calls[2];
      console.log('✅ Resultado: COUNT params =', countParams);

      expect(countParams).toEqual(['B002-%']);
    });

    it('sets url_pdf on boleta after S3 upload', async () => {
      console.log(
        '\n🔍 Acción   : emitir(1) — verificar que url_pdf se asigna',
      );
      console.log(
        '📌 Espera   : boleta.url_pdf contiene "https://cdn.test.com/boletas/"',
      );

      boletaRepo.findOne.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([ventaRow])
        .mockResolvedValueOnce(detalles)
        .mockResolvedValueOnce([{ total: '0' }]);

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      const initialBoleta = {
        numero: 'B002-0000001',
        id_venta: 1,
        total: 1000,
        estado: 'emitida',
        url_pdf: null as string | null,
      };
      boletaRepo.create.mockReturnValue(initialBoleta);

      const result = await service.emitir(1);

      console.log('✅ Resultado: url_pdf =', result.url_pdf);

      expect(result.url_pdf).toContain('https://cdn.test.com/boletas/');
      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByVenta', () => {
    it('returns boleta when found', async () => {
      console.log('\n🔍 Acción   : findByVenta(1) — boleta existe');
      console.log('📌 Espera   : retorna boleta con id_venta = 1');

      const boleta = {
        id_boleta: 1,
        id_venta: 1,
        total: 1000,
        estado: 'emitida',
        url_pdf: 'https://cdn.test.com/boletas/B002-0000001.pdf',
      };
      boletaRepo.findOne.mockResolvedValue(boleta);

      const result = await service.findByVenta(1);

      console.log('✅ Resultado:', JSON.stringify(result));

      expect(result).toEqual(boleta);
      expect(boletaRepo.findOne).toHaveBeenCalledWith({
        where: { id_venta: 1 },
      });
    });

    it('throws NotFoundException when boleta does not exist for venta', async () => {
      console.log('\n🔍 Acción   : findByVenta(999) — boleta inexistente');
      console.log(
        '📌 Espera   : NotFoundException "No hay boleta para la venta 999"',
      );

      boletaRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.findByVenta(999);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(NotFoundException);
    });
  });
});
