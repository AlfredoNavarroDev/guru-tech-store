import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EmpleadosService } from './empleados.service';
import {
  EmpleadoNotFoundException,
  EmpleadoDocumentoDuplicadoException,
  EmpleadoSelfDeactivateException,
  RolNotFoundException,
} from '../common/exceptions';
import { Empleado } from '../auth/entities/empleado.entity';
import { Rol } from '../auth/entities/rol.entity';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockUser: JwtPayload = {
  sub: 1,
  id_sede: 2,
  rol: 'administrador',
  nombre: 'Admin',
};

describe('EmpleadosService', () => {
  let service: EmpleadosService;
  let empleadosRepo: ReturnType<typeof createMockRepository>;
  let rolesRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    empleadosRepo = createMockRepository();
    rolesRepo = createMockRepository();
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpleadosService,
        { provide: getRepositoryToken(Empleado), useValue: empleadosRepo },
        { provide: getRepositoryToken(Rol), useValue: rolesRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<EmpleadosService>(EmpleadosService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      tipo_documento: 'DNI',
      nro_documento: '12345678',
      nombre_completo: 'Juan Pérez',
      id_rol: 3,
      password: 'Contraseña123',
    };

    it('valida', async () => {
      rolesRepo.findOne.mockResolvedValue({ id_rol: 3 });
      empleadosRepo.findOne.mockResolvedValue(null);
      const saved = {
        id_empleado: 5,
        ...dto,
        password_hash: 'hashed',
        id_sede: 2,
      };
      empleadosRepo.create.mockReturnValue(saved);
      empleadosRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto, mockUser);

      expect(result.id_empleado).toBe(5);
      expect(result).not.toHaveProperty('password_hash');
      expect(empleadosRepo.save).toHaveBeenCalledTimes(1);
      // password field debe no aparecer en create() (se reemplaza por password_hash)
      const createCall = empleadosRepo.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(createCall).not.toHaveProperty('password');
      expect(createCall).toHaveProperty('password_hash');
    });

    it('valida', async () => {
      rolesRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.create({ ...dto, id_rol: 99 }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(RolNotFoundException);
      expect(empleadosRepo.save).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      rolesRepo.findOne.mockResolvedValue({ id_rol: 3 });
      empleadosRepo.findOne.mockResolvedValue({ id_empleado: 10 });

      let caught: Error | undefined;
      try {
        await service.create(dto, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(EmpleadoDocumentoDuplicadoException);
      expect(empleadosRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('valida', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([
            [{ id_empleado: 1, password_hash: 'secret' }],
            1,
          ]),
      };
      empleadosRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll(mockUser, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).not.toHaveProperty('password_hash');
      expect(result.totalPages).toBe(1);
      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      empleadosRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll(mockUser, {
        page: 1,
        limit: 20,
        id_rol: 3,
        activo: true,
      });

      expect(mockQb.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('valida', async () => {
      empleadosRepo.findOne.mockResolvedValue({
        id_empleado: 5,
        id_sede: 2,
        password_hash: 'secret',
      });

      const result = await service.findOne(5, mockUser);

      expect(result.id_empleado).toBe(5);
      expect(result).not.toHaveProperty('password_hash');
      expect(empleadosRepo.findOne).toHaveBeenCalledWith({
        where: { id_empleado: 5, id_sede: 2 },
      });
    });

    it('valida', async () => {
      empleadosRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.findOne(999, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(EmpleadoNotFoundException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('valida', async () => {
      const existing = {
        id_empleado: 5,
        nombre_completo: 'Viejo Nombre',
        id_sede: 2,
      };
      empleadosRepo.findOne.mockResolvedValue(existing);
      empleadosRepo.save.mockResolvedValue({
        ...existing,
        nombre_completo: 'Nuevo Nombre',
      });

      const result = await service.update(
        5,
        { nombre_completo: 'Nuevo Nombre' },
        mockUser,
      );

      expect(result.nombre_completo).toBe('Nuevo Nombre');
    });

    it('valida', async () => {
      empleadosRepo.findOne.mockResolvedValue({ id_empleado: 5, id_sede: 2 });
      rolesRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.update(5, { id_rol: 99 }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(RolNotFoundException);
      expect(empleadosRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── updatePassword ────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('valida', async () => {
      const existing = {
        id_empleado: 5,
        password_hash: 'old_hash',
        id_sede: 2,
      };
      empleadosRepo.findOne.mockResolvedValue(existing);
      empleadosRepo.save.mockResolvedValue({
        ...existing,
        password_hash: 'new_hash',
      });

      await service.updatePassword(
        5,
        { nueva_password: 'NewPass123' },
        mockUser,
      );

      expect(empleadosRepo.save).toHaveBeenCalledTimes(1);
      const savedArg = empleadosRepo.save.mock.calls[0][0] as Empleado;
      // Debe ser un hash bcrypt, no la contraseña en texto plano
      expect(savedArg.password_hash).not.toBe('NewPass123');
      expect(await bcrypt.compare('NewPass123', savedArg.password_hash)).toBe(
        true,
      );
    });
  });

  // ─── updateEstado ──────────────────────────────────────────────────────────

  describe('updateEstado', () => {
    it('valida', async () => {
      empleadosRepo.findOne.mockResolvedValue({ id_empleado: 5, id_sede: 2 });
      empleadosRepo.update.mockResolvedValue({ affected: 1 });
      dataSource.query.mockResolvedValue(undefined);

      await service.updateEstado(5, { activo: false }, mockUser);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('revoked = true'),
        [5],
      );
      expect(empleadosRepo.update).toHaveBeenCalledWith(5, {
        estado: 'inactivo',
      });
    });

    it('valida', async () => {
      empleadosRepo.findOne.mockResolvedValue({ id_empleado: 5, id_sede: 2 });
      empleadosRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateEstado(5, { activo: true }, mockUser);

      expect(dataSource.query).not.toHaveBeenCalled();
      expect(empleadosRepo.update).toHaveBeenCalledWith(5, {
        estado: 'activo',
      });
    });

    it('valida', async () => {
      let caught: Error | undefined;
      try {
        await service.updateEstado(1, { activo: false }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(EmpleadoSelfDeactivateException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      empleadosRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.updateEstado(999, { activo: false }, mockUser);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(EmpleadoNotFoundException);
    });
  });

  afterAll(() => {});
});
