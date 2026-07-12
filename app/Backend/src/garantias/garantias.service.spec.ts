import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GarantiasService } from './garantias.service';
import { Garantia } from './entities/garantia.entity';
import { GarantiaReclamoView } from './entities/garantia-reclamo-view.entity';
import {
  GarantiaNoActivaException,
  GarantiaNotFoundException,
  GarantiaTipoInvalidoException,
  GarantiaYaExisteException,
  ReparacionNotFoundException,
} from '../common/exceptions';
import { ReparacionesService } from '../reparaciones/reparaciones.service';
import { RestriccionesService } from '../restricciones/restricciones.service';
import type { JwtPayload } from '../common/types';
import type { QueryGarantiasDto } from './dto/query-garantias.dto';

const mockTecnico: JwtPayload = {
  sub: 5,
  id_sede: 2,
  rol: 'tecnico',
  nombre: 'Técnico Test',
};

const mockVendedor: JwtPayload = {
  sub: 10,
  id_sede: 1,
  rol: 'vendedor',
  nombre: 'Vendedor Test',
};

const garantiaRow = {
  id_garantia: 1,
  id_venta: null,
  id_reparacion: 7,
  fecha_inicio: '2026-06-01',
  fecha_fin: '2026-07-01',
  estado: 'activa',
  motivo_invalidacion: null,
  created_at: new Date('2026-06-01'),
};

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
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 0 }),
  getRawOne: jest.fn().mockResolvedValue(getRawOneResult),
  getRawMany: jest.fn().mockResolvedValue(getRawManyResult),
});

describe('GarantiasService', () => {
  let service: GarantiasService;
  let dataSource: { createQueryBuilder: jest.Mock; transaction: jest.Mock };
  let garantiaRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let garantiaReclamoRepo: { findOne: jest.Mock };
  let reparacionesService: { findOne: jest.Mock };
  let restriccionesService: { resolveItemRestriction: jest.Mock };

  beforeEach(async () => {
    dataSource = { createQueryBuilder: jest.fn(), transaction: jest.fn() };
    garantiaRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn(),
    };
    garantiaReclamoRepo = { findOne: jest.fn() };
    reparacionesService = { findOne: jest.fn() };
    restriccionesService = { resolveItemRestriction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GarantiasService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Garantia), useValue: garantiaRepo },
        {
          provide: getRepositoryToken(GarantiaReclamoView),
          useValue: garantiaReclamoRepo,
        },
        { provide: ReparacionesService, useValue: reparacionesService },
        { provide: RestriccionesService, useValue: restriccionesService },
      ],
    }).compile();

    service = module.get<GarantiasService>(GarantiasService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      id_reparacion: 7,
      fecha_inicio: '2026-06-01',
      fecha_fin: '2026-07-01',
    };

    it('inserta garantia de reparacion y devuelve DTO', async () => {
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb({ id_reparacion: 7 })) // reparacion pertenece a sede
        .mockReturnValueOnce(makeQb(null)); // sin repuesto → omite restricción
      garantiaRepo.findOne.mockResolvedValueOnce(null); // sin garantia activa previa
      garantiaRepo.save.mockResolvedValueOnce(garantiaRow);

      const result = await service.create(dto, mockTecnico);

      expect(result.tipo).toBe('reparacion');
      expect(result.referencia_label).toBe('Reparación #7');
      expect(result.estado).toBe('activa');
    });

    it('lanza ForbiddenException si rol=vendedor', async () => {
      await expect(service.create(dto, mockVendedor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(dataSource.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si fecha_fin <= fecha_inicio', async () => {
      await expect(
        service.create({ ...dto, fecha_fin: dto.fecha_inicio }, mockTecnico),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('lanza ReparacionNotFoundException si reparacion no pertenece a sede', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(makeQb(null)); // rep not found

      await expect(service.create(dto, mockTecnico)).rejects.toThrow(
        ReparacionNotFoundException,
      );
    });

    it('lanza GarantiaYaExisteException si ya hay garantia activa', async () => {
      dataSource.createQueryBuilder.mockReturnValueOnce(makeQb({ id_reparacion: 7 }));
      garantiaRepo.findOne.mockResolvedValueOnce({ id_garantia: 99 }); // garantia activa previa

      await expect(service.create(dto, mockTecnico)).rejects.toThrow(
        GarantiaYaExisteException,
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const baseQuery: QueryGarantiasDto = { page: 1, limit: 20 };

    it('vendedor recibe garantias de ventas (lazy update + scoped join)', async () => {
      const updateQb = makeQb();
      const countQb = makeQb({ total: '1' });
      const rowsQb = makeQb(undefined, [
        { ...garantiaRow, id_venta: 42, id_reparacion: null },
      ]);
      dataSource.createQueryBuilder
        .mockReturnValueOnce(updateQb)
        .mockReturnValueOnce(countQb)
        .mockReturnValueOnce(rowsQb);

      const result = await service.findAll(mockVendedor, baseQuery);

      expect(result.total).toBe(1);
      expect(result.items[0].tipo).toBe('venta');
      expect(updateQb.execute).toHaveBeenCalled();
      expect(updateQb.set).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'vencida' }),
      );
    });

    it('filtro por estado agrega clausula AND', async () => {
      const countQb = makeQb({ total: '0' });
      const rowsQb = makeQb(undefined, []);
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb()) // UPDATE
        .mockReturnValueOnce(countQb) // COUNT
        .mockReturnValueOnce(rowsQb); // ROWS

      await service.findAll(mockTecnico, { ...baseQuery, estado: 'vencida' });

      expect(countQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('g.estado'),
        expect.objectContaining({ estado: 'vencida' }),
      );
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devuelve DTO si garantia pertenece a la sede', async () => {
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb()) // UPDATE
        .mockReturnValueOnce(makeQb(garantiaRow)); // SELECT

      const result = await service.findOne(1, mockTecnico);
      expect(result.id_garantia).toBe(1);
    });

    it('lanza GarantiaNotFoundException si no pertenece a sede', async () => {
      dataSource.createQueryBuilder
        .mockReturnValueOnce(makeQb()) // UPDATE
        .mockReturnValueOnce(makeQb(null)); // SELECT sin resultado

      await expect(service.findOne(999, mockTecnico)).rejects.toThrow(
        GarantiaNotFoundException,
      );
    });
  });

  // ── crearReclamo ─────────────────────────────────────────────────────────

  describe('crearReclamo', () => {
    const garantiaReclamableRow = {
      id_garantia: 1,
      id_venta: null,
      id_reparacion: 7,
      estado: 'activa',
      id_sede: 2,
      id_cliente: 3,
      marca: 'Samsung',
      modelo: 'Galaxy S21',
      imei: '012345678901234',
    };

    it('crea reparacion-reclamo, invalida garantia y devuelve la reparacion nueva', async () => {
      garantiaReclamoRepo.findOne.mockResolvedValueOnce(garantiaReclamableRow);
      dataSource.createQueryBuilder.mockReturnValueOnce(makeQb({ id_estado: 1 }));

      const mockRepo = {
        save: jest.fn().mockResolvedValue({ id_reparacion: 55 }),
        create: jest.fn().mockImplementation((data: unknown) => data),
        update: jest.fn().mockResolvedValue({}),
      };
      const mockManager = { getRepository: jest.fn().mockReturnValue(mockRepo) };
      dataSource.transaction.mockImplementation(
        (fn: (m: typeof mockManager) => Promise<void>) => fn(mockManager),
      );

      reparacionesService.findOne.mockResolvedValueOnce({
        id_reparacion: 55,
        id_garantia_reclamada: 1,
      });

      const result = await service.crearReclamo(
        1,
        { tipo_accion: 'reparacion' as const },
        mockTecnico,
      );

      expect(result.id_reparacion).toBe(55);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(reparacionesService.findOne).toHaveBeenCalledWith(55, mockTecnico);
    });

    it('lanza ForbiddenException si rol=vendedor', async () => {
      await expect(
        service.crearReclamo(
          1,
          { tipo_accion: 'reparacion' as const },
          mockVendedor,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(garantiaReclamoRepo.findOne).not.toHaveBeenCalled();
    });

    it('lanza GarantiaNotFoundException si no existe', async () => {
      garantiaReclamoRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.crearReclamo(
          999,
          { tipo_accion: 'reparacion' as const },
          mockTecnico,
        ),
      ).rejects.toThrow(GarantiaNotFoundException);
    });

    it('lanza GarantiaNotFoundException si la reparacion es de otra sede', async () => {
      garantiaReclamoRepo.findOne.mockResolvedValueOnce({
        ...garantiaReclamableRow,
        id_sede: 99,
      });

      await expect(
        service.crearReclamo(
          1,
          { tipo_accion: 'reparacion' as const },
          mockTecnico,
        ),
      ).rejects.toThrow(GarantiaNotFoundException);
    });

    it('lanza GarantiaTipoInvalidoException si la garantia es de venta', async () => {
      garantiaReclamoRepo.findOne.mockResolvedValueOnce({
        ...garantiaReclamableRow,
        id_venta: 42,
        id_reparacion: null,
        id_sede: null,
      });

      await expect(
        service.crearReclamo(
          1,
          { tipo_accion: 'reparacion' as const },
          mockTecnico,
        ),
      ).rejects.toThrow(GarantiaTipoInvalidoException);
    });

    it('lanza GarantiaNoActivaException si la garantia esta vencida', async () => {
      garantiaReclamoRepo.findOne.mockResolvedValueOnce({
        ...garantiaReclamableRow,
        estado: 'vencida',
      });

      await expect(
        service.crearReclamo(
          1,
          { tipo_accion: 'reparacion' as const },
          mockTecnico,
        ),
      ).rejects.toThrow(GarantiaNoActivaException);
    });

    it('lanza GarantiaNoActivaException si la garantia ya esta invalidada', async () => {
      garantiaReclamoRepo.findOne.mockResolvedValueOnce({
        ...garantiaReclamableRow,
        estado: 'invalidada',
      });

      await expect(
        service.crearReclamo(
          1,
          { tipo_accion: 'reparacion' as const },
          mockTecnico,
        ),
      ).rejects.toThrow(GarantiaNoActivaException);
    });
  });
});
