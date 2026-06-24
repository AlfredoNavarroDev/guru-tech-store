import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GarantiasService } from './garantias.service';
import {
  GarantiaNotFoundException,
  GarantiaYaExisteException,
  ReparacionNotFoundException,
} from '../common/exceptions';
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
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GarantiasService,
        { provide: DataSource, useValue: dataSource },
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
        .mockResolvedValueOnce([])                     // sin garantia activa previa
        .mockResolvedValueOnce([garantiaRow]);          // INSERT RETURNING

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
        service.create(
          { ...dto, fecha_fin: dto.fecha_inicio },
          mockTecnico,
        ),
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
        .mockResolvedValueOnce([{ id_reparacion: 7 }])   // reparacion ok
        .mockResolvedValueOnce([{ id_garantia: 99 }]);   // garantia activa previa

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
        .mockResolvedValueOnce([])                         // lazy UPDATE
        .mockResolvedValueOnce([{ total: '1' }])           // COUNT
        .mockResolvedValueOnce([{ ...garantiaRow, id_venta: 42, id_reparacion: null }]); // rows

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
        .mockResolvedValueOnce([])              // lazy UPDATE
        .mockResolvedValueOnce([garantiaRow]);  // SELECT

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
});
