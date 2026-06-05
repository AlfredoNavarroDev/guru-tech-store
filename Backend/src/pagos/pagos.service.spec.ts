import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PagosService } from './pagos.service';
import { VentaNotFoundException } from '../common/exceptions';
import { Pago } from './entities/pago.entity';
import type { CreatePagoVentaDto } from './dto/create-pago-venta.dto';

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('PagosService', () => {
  let service: PagosService;
  let pagoRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    pagoRepo = createMockRepository();
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: getRepositoryToken(Pago), useValue: pagoRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PagosService>(PagosService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createForVenta', () => {
    const dto: CreatePagoVentaDto = { metodo_pago: 'efectivo', monto: 150 };

    it('creates and returns pago when venta exists', async () => {
      console.log(
        '\n🔍 Acción   : createForVenta(1, { metodo_pago:"efectivo", monto:150 }) — venta existe',
      );
      console.log('📌 Espera   : Pago creado y guardado, retorna objeto Pago');

      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      const pago = {
        id_pago: 1,
        id_venta: 1,
        metodo_pago: 'efectivo',
        monto: 150,
      };
      pagoRepo.create.mockReturnValue(pago);
      pagoRepo.save.mockResolvedValue(pago);

      const result = await service.createForVenta(1, dto);

      console.log('✅ Resultado:', JSON.stringify(result));

      expect(result).toEqual(pago);
    });

    it('sets es_adelanto to false and id_reparacion to null', async () => {
      console.log(
        '\n🔍 Acción   : createForVenta() — verificar campos internos del pago',
      );
      console.log(
        '📌 Espera   : pagoRepo.create llamado con es_adelanto=false, id_reparacion=null',
      );

      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(1, dto);

      const createArg = pagoRepo.create.mock.calls[0][0];
      console.log(
        '✅ Resultado: es_adelanto =',
        createArg.es_adelanto,
        '| id_reparacion =',
        createArg.id_reparacion,
      );

      expect(pagoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_venta: 1,
          metodo_pago: 'efectivo',
          monto: 150,
          es_adelanto: false,
          id_reparacion: null,
        }),
      );
    });

    it('stores referencia_transaccion when provided', async () => {
      console.log(
        '\n🔍 Acción   : createForVenta() con referencia_transaccion="OP-123"',
      );
      console.log(
        '📌 Espera   : pagoRepo.create llamado con referencia_transaccion="OP-123"',
      );

      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(1, {
        ...dto,
        referencia_transaccion: 'OP-123',
      });

      const createArg = pagoRepo.create.mock.calls[0][0];
      console.log(
        '✅ Resultado: referencia_transaccion =',
        createArg.referencia_transaccion,
      );

      expect(pagoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ referencia_transaccion: 'OP-123' }),
      );
    });

    it('stores null referencia_transaccion when not provided', async () => {
      console.log(
        '\n🔍 Acción   : createForVenta() sin referencia_transaccion',
      );
      console.log(
        '📌 Espera   : pagoRepo.create llamado con referencia_transaccion=null',
      );

      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(1, dto);

      const createArg = pagoRepo.create.mock.calls[0][0];
      console.log(
        '✅ Resultado: referencia_transaccion =',
        createArg.referencia_transaccion,
      );

      expect(pagoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ referencia_transaccion: null }),
      );
    });

    it('throws NotFoundException when venta does not exist', async () => {
      console.log(
        '\n🔍 Acción   : createForVenta(999, dto) — venta inexistente',
      );
      console.log(
        '📌 Espera   : NotFoundException, pagoRepo.create no se llama',
      );

      dataSource.query.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.createForVenta(999, dto);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );
      console.log(
        '   pagoRepo.create() llamado:',
        pagoRepo.create.mock.calls.length,
        'veces',
      );

      expect(caught).toBeInstanceOf(VentaNotFoundException);
      expect(pagoRepo.create).not.toHaveBeenCalled();
    });

    it('queries assertVentaExists with correct id', async () => {
      console.log(
        '\n🔍 Acción   : createForVenta(5, dto) — verificar SQL de validación',
      );
      console.log(
        '📌 Espera   : dataSource.query llamado con WHERE id_venta = $1 y param 5',
      );

      dataSource.query.mockResolvedValue([{ id_venta: 5 }]);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(5, dto);

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene "WHERE id_venta = $1" =',
        sql.includes('WHERE id_venta = $1'),
        '| params =',
        params,
      );

      expect(sql).toContain('WHERE id_venta = $1');
      expect(params).toEqual([5]);
    });
  });

  describe('findByVenta', () => {
    it('returns pagos when venta exists', async () => {
      console.log('\n🔍 Acción   : findByVenta(1) — venta existe con 2 pagos');
      console.log('📌 Espera   : array de 2 pagos');

      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      const pagos = [{ id_pago: 1 }, { id_pago: 2 }];
      pagoRepo.find.mockResolvedValue(pagos);

      const result = await service.findByVenta(1);

      console.log(
        '✅ Resultado:',
        result.length,
        'pago(s), ids =',
        result.map((p: any) => p.id_pago),
      );

      expect(result).toEqual(pagos);
      expect(pagoRepo.find).toHaveBeenCalledWith({ where: { id_venta: 1 } });
    });

    it('throws NotFoundException when venta does not exist', async () => {
      console.log('\n🔍 Acción   : findByVenta(999) — venta inexistente');
      console.log('📌 Espera   : NotFoundException, pagoRepo.find no se llama');

      dataSource.query.mockResolvedValue([]);

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
      console.log(
        '   pagoRepo.find() llamado:',
        pagoRepo.find.mock.calls.length,
        'veces',
      );

      expect(caught).toBeInstanceOf(VentaNotFoundException);
      expect(pagoRepo.find).not.toHaveBeenCalled();
    });

    it('returns empty array when venta exists but has no pagos', async () => {
      console.log(
        '\n🔍 Acción   : findByVenta(1) — venta existe pero sin pagos registrados',
      );
      console.log('📌 Espera   : array vacío []');

      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      pagoRepo.find.mockResolvedValue([]);

      const result = await service.findByVenta(1);

      console.log('✅ Resultado: pagos.length =', result.length);

      expect(result).toEqual([]);
    });
  });
});
