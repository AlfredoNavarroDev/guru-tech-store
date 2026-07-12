import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PagosService } from './pagos.service';
import { VentaNotFoundException } from '../common/exceptions';
import { Pago } from './entities/pago.entity';
import type { CreatePagoVentaDto } from './dto/create-pago-venta.dto';
import type { JwtPayload } from '../common/types';

const makeQb = (getRawOneResult?: unknown) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(getRawOneResult),
});

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('PagosService', () => {
  let service: PagosService;
  let pagoRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { createQueryBuilder: jest.Mock };
  const mockUser: JwtPayload = {
    sub: 10,
    id_sede: 2,
    rol: 'vendedor',
    nombre: 'Vendedor Test',
  };

  beforeEach(async () => {
    pagoRepo = createMockRepository();
    dataSource = { createQueryBuilder: jest.fn().mockReturnValue(makeQb({ id_venta: 1 })) };

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
      const pago = { id_pago: 1, id_venta: 1, metodo_pago: 'efectivo', monto: 150 };
      pagoRepo.create.mockReturnValue(pago);
      pagoRepo.save.mockResolvedValue(pago);

      const result = await service.createForVenta(1, dto, mockUser);

      expect(result).toEqual(pago);
    });

    it('valida', async () => {
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(1, dto, mockUser);

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
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(1, { ...dto, referencia_transaccion: 'OP-123' }, mockUser);

      expect(pagoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ referencia_transaccion: 'OP-123' }),
      );
    });

    it('valida', async () => {
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(1, dto, mockUser);

      expect(pagoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ referencia_transaccion: null }),
      );
    });

    it('valida', async () => {
      dataSource.createQueryBuilder.mockReturnValue(makeQb(undefined));

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
      const qb = makeQb({ id_venta: 5 });
      dataSource.createQueryBuilder.mockReturnValue(qb);
      pagoRepo.create.mockReturnValue({});
      pagoRepo.save.mockResolvedValue({});

      await service.createForVenta(5, dto, mockUser);

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('id_venta'),
        expect.objectContaining({ idVenta: 5, idEmpleado: mockUser.sub }),
      );
    });

    it('valida', async () => {
      dataSource.createQueryBuilder.mockReturnValue(makeQb(undefined));

      await expect(service.createForVenta(5, dto, mockUser)).rejects.toBeInstanceOf(
        VentaNotFoundException,
      );
      expect(pagoRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findByVenta', () => {
    it('valida', async () => {
      const pagos = [{ id_pago: 1 }, { id_pago: 2 }];
      pagoRepo.find.mockResolvedValue(pagos);

      const result = await service.findByVenta(1, mockUser);

      expect(result).toEqual(pagos);
      expect(pagoRepo.find).toHaveBeenCalledWith({ where: { id_venta: 1 } });
    });

    it('valida', async () => {
      dataSource.createQueryBuilder.mockReturnValue(makeQb(undefined));

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
      pagoRepo.find.mockResolvedValue([]);

      const result = await service.findByVenta(1, mockUser);

      expect(result).toEqual([]);
    });
  });
});
