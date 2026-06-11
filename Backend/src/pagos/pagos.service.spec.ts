import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PagosService } from './pagos.service';
import { VentaNotFoundException } from '../common/exceptions';
import { Pago } from './entities/pago.entity';
import type { CreatePagoVentaDto } from './dto/create-pago-venta.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('PagosService', () => {
  let service: PagosService;
  let pagoRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { query: jest.Mock };
  const mockUser: JwtPayload = {
    sub: 10,
    id_sede: 2,
    rol: 'vendedor',
    nombre: 'Vendedor Test',
  };

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

    it('valida', async () => {
      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      const pago = {
        id_pago: 1,
        id_venta: 1,
        metodo_pago: 'efectivo',
        monto: 150,
      };
      pagoRepo.create.mockReturnValue(pago);
      pagoRepo.save.mockResolvedValue(pago);

      const result = await service.createForVenta(1, dto, mockUser);

      expect(result).toEqual(pago);
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(1, dto, mockUser);

      const createArg = pagoRepo.create.mock.calls[0][0];

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

    it('valida', async () => {
      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(
        1,
        {
          ...dto,
          referencia_transaccion: 'OP-123',
        },
        mockUser,
      );

      const createArg = pagoRepo.create.mock.calls[0][0];

      expect(pagoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ referencia_transaccion: 'OP-123' }),
      );
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(1, dto, mockUser);

      const createArg = pagoRepo.create.mock.calls[0][0];

      expect(pagoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ referencia_transaccion: null }),
      );
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.createForVenta(999, dto, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(VentaNotFoundException);
      expect(pagoRepo.create).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([{ id_venta: 5 }]);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(5, dto, mockUser);

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('WHERE id_venta = $1');
      expect(sql).toContain('id_empleado = $2');
      expect(params).toEqual([5, mockUser.sub]);
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([]);

      await expect(
        service.createForVenta(5, dto, mockUser),
      ).rejects.toBeInstanceOf(VentaNotFoundException);
      expect(pagoRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findByVenta', () => {
    it('valida', async () => {
      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      const pagos = [{ id_pago: 1 }, { id_pago: 2 }];
      pagoRepo.find.mockResolvedValue(pagos);

      const result = await service.findByVenta(1, mockUser);

      expect(result).toEqual(pagos);
      expect(pagoRepo.find).toHaveBeenCalledWith({ where: { id_venta: 1 } });
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.findByVenta(999, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(VentaNotFoundException);
      expect(pagoRepo.find).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([{ id_venta: 1 }]);
      pagoRepo.find.mockResolvedValue([]);

      const result = await service.findByVenta(1, mockUser);

      expect(result).toEqual([]);
    });
  });
});
