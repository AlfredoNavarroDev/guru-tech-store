import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PromocionesService } from './promociones.service';
import { Promocion } from './entities/promocion.entity';

const adminUser = { sub: 1, id_sede: 2, rol: 'administrador', nombre: 'Admin' } as any;
const propietarioUser = { sub: 2, id_sede: 1, rol: 'propietario', nombre: 'Owner' } as any;

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
  getRawOne: jest.fn().mockResolvedValue(getRawOneResult),
  getRawMany: jest.fn().mockResolvedValue(getRawManyResult),
});

describe('PromocionesService', () => {
  let service: PromocionesService;
  let promoRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock; update: jest.Mock };
  let dataSource: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    promoRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ id_promocion: 1, ...e })),
      create: jest.fn().mockImplementation((data) => data),
      update: jest.fn().mockResolvedValue({}),
    };
    dataSource = { createQueryBuilder: jest.fn().mockReturnValue(makeQb()) };

    const module = await Test.createTestingModule({
      providers: [
        PromocionesService,
        { provide: getRepositoryToken(Promocion), useValue: promoRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(PromocionesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('forces id_sede from JWT for administrador', async () => {
      await service.create(
        {
          nombre: 'Promo',
          id_sede: 99,
          valor_descuento: 10,
          tipo_descuento: 'porcentaje',
          id_item_afectado: 1,
        } as any,
        adminUser,
      );
      expect(promoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id_sede: adminUser.id_sede }),
      );
    });

    it('allows propietario to create global promo (id_sede null)', async () => {
      await service.create(
        {
          nombre: 'Global',
          valor_descuento: 5,
          tipo_descuento: 'monto_fijo',
          id_categoria_afectada: 1,
        } as any,
        propietarioUser,
      );
      expect(promoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id_sede: null }),
      );
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException if admin tries to remove another sede promo', async () => {
      promoRepo.findOne.mockResolvedValue({
        id_promocion: 1,
        id_sede: 5,
        created_by: null,
        estado: 'activa',
        id_item_afectado: null,
        id_categoria_afectada: null,
        fecha_inicio: null,
        fecha_fin: null,
      });
      await expect(service.remove(1, adminUser)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if promo does not exist', async () => {
      promoRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(99, adminUser)).rejects.toThrow(NotFoundException);
    });
  });
});
