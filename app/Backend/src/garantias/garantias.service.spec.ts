import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GarantiasService } from './garantias.service';
import {
  GarantiaNoActivaException,
  GarantiaNotFoundException,
  GarantiaTipoInvalidoException,
  GarantiaYaExisteException,
  ReparacionNotFoundException,
} from '../common/exceptions';
import { ReparacionesService } from '../reparaciones/reparaciones.service';
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

describe('GarantiasService', () => {
  let service: GarantiasService;
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let reparacionesService: { findOne: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn(), transaction: jest.fn() };
    reparacionesService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GarantiasService,
        { provide: DataSource, useValue: dataSource },
        { provide: ReparacionesService, useValue: reparacionesService },
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
      dataSource.query
        .mockResolvedValueOnce([{ id_reparacion: 7 }]) // reparacion pertenece a sede
        .mockResolvedValueOnce([]) // sin garantia activa previa
        .mockResolvedValueOnce([garantiaRow]); // INSERT RETURNING

      const result = await service.create(dto, mockTecnico);

      expect(result.tipo).toBe('reparacion');
      expect(result.referencia_label).toBe('Reparación #7');
      expect(result.estado).toBe('activa');
    });

    it('lanza ForbiddenException si rol=vendedor', async () => {
      await expect(service.create(dto, mockVendedor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si fecha_fin <= fecha_inicio', async () => {
      await expect(
        service.create({ ...dto, fecha_fin: dto.fecha_inicio }, mockTecnico),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('lanza ReparacionNotFoundException si reparacion no pertenece a sede', async () => {
      dataSource.query.mockResolvedValueOnce([]); // reparacion not found

      await expect(service.create(dto, mockTecnico)).rejects.toThrow(
        ReparacionNotFoundException,
      );
    });

    it('lanza GarantiaYaExisteException si ya hay garantia activa', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ id_reparacion: 7 }]) // reparacion ok
        .mockResolvedValueOnce([{ id_garantia: 99 }]); // garantia activa previa

      await expect(service.create(dto, mockTecnico)).rejects.toThrow(
        GarantiaYaExisteException,
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const baseQuery: QueryGarantiasDto = { page: 1, limit: 20 };

    it('vendedor recibe garantias de ventas (lazy update + scoped join)', async () => {
      dataSource.query
        .mockResolvedValueOnce([]) // lazy UPDATE
        .mockResolvedValueOnce([{ total: '1' }]) // COUNT
        .mockResolvedValueOnce([
          { ...garantiaRow, id_venta: 42, id_reparacion: null },
        ]); // rows

      const result = await service.findAll(mockVendedor, baseQuery);

      expect(result.total).toBe(1);
      expect(result.items[0].tipo).toBe('venta');
      const updateSql: string = dataSource.query.mock.calls[0][0];
      expect(updateSql).toContain("estado = 'vencida'");
    });

    it('filtro por estado agrega clausula AND', async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll(mockTecnico, { ...baseQuery, estado: 'vencida' });

      const countSql: string = dataSource.query.mock.calls[1][0];
      expect(countSql).toContain('g.estado =');
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devuelve DTO si garantia pertenece a la sede', async () => {
      dataSource.query
        .mockResolvedValueOnce([]) // lazy UPDATE
        .mockResolvedValueOnce([garantiaRow]); // SELECT

      const result = await service.findOne(1, mockTecnico);
      expect(result.id_garantia).toBe(1);
    });

    it('lanza GarantiaNotFoundException si no pertenece a sede', async () => {
      dataSource.query
        .mockResolvedValueOnce([]) // lazy UPDATE
        .mockResolvedValueOnce([]); // SELECT sin filas

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
      dataSource.query
        .mockResolvedValueOnce([garantiaReclamableRow]) // SELECT garantia + reparacion
        .mockResolvedValueOnce([{ id_estado: 1 }]); // SELECT primer estado
      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => Promise<void>) => {
          const manager = {
            query: jest
              .fn()
              .mockResolvedValueOnce([{ id_reparacion: 55 }]) // INSERT reparacion
              .mockResolvedValueOnce(undefined), // UPDATE garantia
          };
          await cb(manager);
        },
      );
      reparacionesService.findOne.mockResolvedValueOnce({
        id_reparacion: 55,
        id_garantia_reclamada: 1,
      });

      const result = await service.crearReclamo(1, {}, mockTecnico);

      expect(result.id_reparacion).toBe(55);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(reparacionesService.findOne).toHaveBeenCalledWith(55, mockTecnico);
    });

    it('lanza ForbiddenException si rol=vendedor', async () => {
      await expect(service.crearReclamo(1, {}, mockVendedor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('lanza GarantiaNotFoundException si no existe', async () => {
      dataSource.query.mockResolvedValueOnce([]);

      await expect(service.crearReclamo(999, {}, mockTecnico)).rejects.toThrow(
        GarantiaNotFoundException,
      );
    });

    it('lanza GarantiaNotFoundException si la reparacion es de otra sede', async () => {
      dataSource.query.mockResolvedValueOnce([
        { ...garantiaReclamableRow, id_sede: 99 },
      ]);

      await expect(service.crearReclamo(1, {}, mockTecnico)).rejects.toThrow(
        GarantiaNotFoundException,
      );
    });

    it('lanza GarantiaTipoInvalidoException si la garantia es de venta', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          ...garantiaReclamableRow,
          id_venta: 42,
          id_reparacion: null,
          id_sede: null,
        },
      ]);

      await expect(service.crearReclamo(1, {}, mockTecnico)).rejects.toThrow(
        GarantiaTipoInvalidoException,
      );
    });

    it('lanza GarantiaNoActivaException si la garantia esta vencida', async () => {
      dataSource.query.mockResolvedValueOnce([
        { ...garantiaReclamableRow, estado: 'vencida' },
      ]);

      await expect(service.crearReclamo(1, {}, mockTecnico)).rejects.toThrow(
        GarantiaNoActivaException,
      );
    });

    it('lanza GarantiaNoActivaException si la garantia ya esta invalidada', async () => {
      dataSource.query.mockResolvedValueOnce([
        { ...garantiaReclamableRow, estado: 'invalidada' },
      ]);

      await expect(service.crearReclamo(1, {}, mockTecnico)).rejects.toThrow(
        GarantiaNoActivaException,
      );
    });
  });
});
