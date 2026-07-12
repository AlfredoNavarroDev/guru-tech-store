import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PromocionesService } from './promociones.service';

const adminUser = {
  sub: 1,
  id_sede: 2,
  rol: 'administrador',
  nombre: 'Admin',
} as any;
const propietarioUser = {
  sub: 2,
  id_sede: 1,
  rol: 'propietario',
  nombre: 'Owner',
} as any;

describe('PromocionesService', () => {
  let service: PromocionesService;
  let ds: { query: jest.Mock };

  beforeEach(async () => {
    ds = { query: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [PromocionesService, { provide: DataSource, useValue: ds }],
    }).compile();
    service = module.get(PromocionesService);
  });

  describe('create', () => {
    it('forces id_sede from JWT for administrador', async () => {
      ds.query.mockResolvedValue([{ id_promocion: 1 }]);
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
      const params = ds.query.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe(2); // id_sede forced to adminUser.id_sede
    });

    it('allows propietario to create global promo (id_sede null)', async () => {
      ds.query.mockResolvedValue([{ id_promocion: 2 }]);
      await service.create(
        {
          nombre: 'Global',
          valor_descuento: 5,
          tipo_descuento: 'monto_fijo',
          id_categoria_afectada: 1,
        } as any,
        propietarioUser,
      );
      const params = ds.query.mock.calls[0][1] as unknown[];
      expect(params[0]).toBeNull();
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException if admin tries to remove another sede promo', async () => {
      ds.query.mockResolvedValue([{ id_sede: 5 }]); // promo belongs to sede 5, admin is sede 2
      await expect(service.remove(1, adminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException if promo does not exist', async () => {
      ds.query.mockResolvedValue([]); // no promo found
      await expect(service.remove(99, adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
