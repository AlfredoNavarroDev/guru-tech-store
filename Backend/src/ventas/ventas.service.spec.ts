import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VentasService } from './ventas.service';
import {
  VentaNotFoundException,
  StockInsuficienteException,
  ImporteInvalidoException,
  DescuentoSinJustificacionException,
} from '../common/exceptions';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { CreateVentaDto } from './dto/create-venta.dto';
import type { QueryVentasDto } from './dto/query-ventas.dto';

const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockUser: JwtPayload = {
  sub: 10,
  id_sede: 1,
  roles: ['vendedor'],
  nombre: 'Vendedor Test',
};

const validItem = {
  id_item: 1,
  cantidad: 2,
  precio_unitario_momento: 100,
  costo_unitario_momento: 60,
  importe: 200,
};

describe('VentasService', () => {
  let service: VentasService;
  let ventaRepo: ReturnType<typeof createMockRepository>;
  let detalleRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { query: jest.Mock; transaction: jest.Mock };

  beforeEach(async () => {
    ventaRepo = createMockRepository();
    detalleRepo = createMockRepository();
    dataSource = { query: jest.fn(), transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: getRepositoryToken(Venta), useValue: ventaRepo },
        { provide: getRepositoryToken(DetalleVenta), useValue: detalleRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<VentasService>(VentasService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const buildManager = () => ({
      create: jest.fn().mockReturnValue({}),
      save: jest
        .fn()
        .mockResolvedValueOnce({ id_venta: 1 })
        .mockResolvedValueOnce({}),
    });

    it('creates venta and returns it with detalles loaded', async () => {
      console.log(
        '\n🔍 Acción   : create() con item válido (precio=100, cantidad=2, importe=200)',
      );
      console.log(
        '📌 Espera   : Venta guardada con detalles cargados via ventaRepo.findOne',
      );

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      const savedVenta = { id_venta: 1, detalles: [{ id_detalle_v: 1 }] };
      ventaRepo.findOne.mockResolvedValue(savedVenta);

      const result = await service.create({ items: [validItem] }, mockUser);

      console.log(
        '✅ Resultado: id_venta =',
        result.id_venta,
        '| detalles.length =',
        (result as any).detalles?.length,
      );

      expect(result).toEqual(savedVenta);
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(ventaRepo.findOne).toHaveBeenCalledWith({
        where: { id_venta: 1 },
        relations: { detalles: true },
      });
    });

    it('passes correct employee and sede to manager.create', async () => {
      console.log(
        '\n🔍 Acción   : create() — verificar que usa id_empleado y id_sede del JWT',
      );
      console.log(
        '📌 Espera   : manager.create(Venta, { id_empleado: 10, id_sede: 1 })',
      );

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      ventaRepo.findOne.mockResolvedValue({ id_venta: 1, detalles: [] });

      await service.create({ items: [validItem] }, mockUser);

      const createCall = manager.create.mock.calls[0][1];
      console.log(
        '✅ Resultado: id_empleado =',
        createCall.id_empleado,
        '| id_sede =',
        createCall.id_sede,
      );

      expect(manager.create).toHaveBeenCalledWith(
        Venta,
        expect.objectContaining({
          id_empleado: mockUser.sub,
          id_sede: mockUser.id_sede,
        }),
      );
    });

    it('throws BadRequestException when monto_descuento > 0 without justificacion', async () => {
      console.log(
        '\n🔍 Acción   : create() con monto_descuento=10 sin justificacion_descuento',
      );
      console.log(
        '📌 Espera   : BadRequestException antes de abrir transacción',
      );

      let caught: Error | undefined;
      try {
        await service.create(
          { items: [validItem], monto_descuento: 10 },
          mockUser,
        );
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
        '   transaction() llamado:',
        dataSource.transaction.mock.calls.length,
        'veces',
      );

      expect(caught).toBeInstanceOf(DescuentoSinJustificacionException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('does not throw when monto_descuento > 0 with justificacion', async () => {
      console.log(
        '\n🔍 Acción   : create() con monto_descuento=10 y justificacion_descuento presente',
      );
      console.log('📌 Espera   : sin excepción, venta creada normalmente');

      const manager = buildManager();
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof manager) => Promise<void>) => cb(manager),
      );
      ventaRepo.findOne.mockResolvedValue({ id_venta: 1, detalles: [] });

      const dto: CreateVentaDto = {
        items: [validItem],
        monto_descuento: 10,
        justificacion_descuento: 'descuento por volumen',
      };

      let error: Error | undefined;
      try {
        await service.create(dto, mockUser);
      } catch (e) {
        error = e as Error;
      }

      console.log(
        '✅ Resultado: excepción lanzada =',
        error?.constructor?.name ?? 'ninguna',
      );

      expect(error).toBeUndefined();
    });

    it('throws BadRequestException when importe does not match precio * cantidad', async () => {
      console.log(
        '\n🔍 Acción   : create() con importe=999 pero precio=100 * cantidad=2 = 200',
      );
      console.log('📌 Espera   : BadRequestException "Importe inválido"');

      const badItem = { ...validItem, importe: 999 };

      let caught: Error | undefined;
      try {
        await service.create({ items: [badItem] }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(ImporteInvalidoException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException when transaction throws Stock insuficiente', async () => {
      console.log(
        '\n🔍 Acción   : create() cuando el trigger BD lanza "Stock insuficiente"',
      );
      console.log(
        '📌 Espera   : ConflictException envolviendo el error del trigger',
      );

      dataSource.transaction.mockRejectedValue(
        new Error('Stock insuficiente para id_item 1'),
      );

      let caught: Error | undefined;
      try {
        await service.create({ items: [validItem] }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(StockInsuficienteException);
    });

    it('rethrows unknown transaction errors', async () => {
      console.log(
        '\n🔍 Acción   : create() cuando la transacción falla por error desconocido',
      );
      console.log('📌 Espera   : error re-lanzado sin envolver');

      dataSource.transaction.mockRejectedValue(
        new Error('DB connection failed'),
      );

      let caught: Error | undefined;
      try {
        await service.create({ items: [validItem] }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught?.message).toBe('DB connection failed');
    });
  });

  describe('findAll', () => {
    const baseQuery: QueryVentasDto = { page: 1, limit: 20 };

    it('returns paginated result with total and totalPages', async () => {
      console.log(
        '\n🔍 Acción   : findAll() sin filtros, page=1, limit=20, total=3 registros',
      );
      console.log(
        '📌 Espera   : { items, total:3, page:1, limit:20, totalPages:1 }',
      );

      const rows = [{ id_venta: 1 }];
      dataSource.query
        .mockResolvedValueOnce([{ total: '3' }])
        .mockResolvedValueOnce(rows);

      const result = await service.findAll(mockUser, baseQuery);

      console.log(
        '✅ Resultado:',
        JSON.stringify({
          ...result,
          items: `[${result.items.length} item(s)]`,
        }),
      );

      expect(result).toEqual({
        items: rows,
        total: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('filters by id_empleado from user.sub', async () => {
      console.log(
        '\n🔍 Acción   : findAll() — verificar que solo trae ventas del empleado autenticado',
      );
      console.log('📌 Espera   : primer param del query = user.sub (10)');

      dataSource.query
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll(mockUser, baseQuery);

      const [, params] = dataSource.query.mock.calls[0];
      console.log('✅ Resultado: params[0] =', params[0]);

      expect(params[0]).toBe(mockUser.sub);
    });

    it('appends fecha_desde filter', async () => {
      console.log('\n🔍 Acción   : findAll({ fecha_desde: "2026-01-01" })');
      console.log('📌 Espera   : SQL contiene "fecha_emision >="');

      dataSource.query
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll(mockUser, {
        ...baseQuery,
        fecha_desde: '2026-01-01',
      });

      const [sql] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene "fecha_emision >=" =',
        sql.includes('fecha_emision >='),
      );

      expect(sql).toContain('fecha_emision >=');
    });

    it('appends fecha_hasta with 23:59:59', async () => {
      console.log('\n🔍 Acción   : findAll({ fecha_hasta: "2026-12-31" })');
      console.log(
        '📌 Espera   : SQL contiene "fecha_emision <=", param incluye "23:59:59"',
      );

      dataSource.query
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll(mockUser, {
        ...baseQuery,
        fecha_hasta: '2026-12-31',
      });

      const [sql, params] = dataSource.query.mock.calls[0];
      const fechaParam = params.find((p: string | number) =>
        String(p).includes('23:59:59'),
      );
      console.log('✅ Resultado: param fecha_hasta =', fechaParam);

      expect(sql).toContain('fecha_emision <=');
      expect(params).toContain('2026-12-31 23:59:59');
    });

    it('appends id_cliente subquery filter', async () => {
      console.log('\n🔍 Acción   : findAll({ id_cliente: 5 })');
      console.log(
        '📌 Espera   : SQL contiene subquery de id_cliente, params incluye 5',
      );

      dataSource.query
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findAll(mockUser, { ...baseQuery, id_cliente: 5 });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene "id_cliente" =',
        sql.includes('id_cliente'),
        '| params =',
        params,
      );

      expect(sql).toContain('id_cliente');
      expect(params).toContain(5);
    });

    it('calculates correct totalPages for non-round division', async () => {
      console.log('\n🔍 Acción   : findAll() con total=45 registros, limit=20');
      console.log('📌 Espera   : totalPages = ceil(45/20) = 3');

      dataSource.query
        .mockResolvedValueOnce([{ total: '45' }])
        .mockResolvedValueOnce([]);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      console.log('✅ Resultado: totalPages =', result.totalPages);

      expect(result.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('returns rows when venta found for this employee', async () => {
      console.log(
        '\n🔍 Acción   : findOne(1) — venta existe y pertenece al empleado',
      );
      console.log('📌 Espera   : array de filas de v_vendedor_ventas');

      const rows = [{ id_venta: 1 }, { id_venta: 1 }];
      dataSource.query.mockResolvedValue(rows);

      const result = await service.findOne(1, mockUser);

      console.log(
        '✅ Resultado:',
        result.length,
        'fila(s), id_venta =',
        (result[0] as any).id_venta,
      );

      expect(result).toEqual(rows);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('id_venta = $1'),
        [1, mockUser.sub],
      );
    });

    it('filters by id_empleado so employees cannot see others sales', async () => {
      console.log(
        '\n🔍 Acción   : findOne(1) con empleado que no es propietario de la venta',
      );
      console.log(
        '📌 Espera   : NotFoundException (query usa AND id_empleado = $2)',
      );

      dataSource.query.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.findOne(1, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '| SQL contiene "id_empleado = $2" =',
        sql.includes('id_empleado = $2'),
        '| params =',
        params,
      );

      expect(caught).toBeInstanceOf(VentaNotFoundException);
      expect(sql).toContain('id_empleado = $2');
    });

    it('throws NotFoundException when venta does not exist', async () => {
      console.log('\n🔍 Acción   : findOne(999) — venta inexistente');
      console.log('📌 Espera   : NotFoundException "Venta 999 no encontrada"');

      dataSource.query.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.findOne(999, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(VentaNotFoundException);
    });
  });
});
