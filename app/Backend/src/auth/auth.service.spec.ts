import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import {
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from '../common/exceptions';
import { Empleado } from './entities/empleado.entity';
import { RefreshToken } from './entities/refresh-token.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-refresh-token'),
}));
import * as bcrypt from 'bcrypt';

const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn().mockResolvedValue({}),
  create: jest.fn().mockReturnValue({}),
  update: jest.fn().mockResolvedValue({}),
});

describe('AuthService', () => {
  let service: AuthService;
  let empleadoRepo: ReturnType<typeof createMockRepository>;
  let refreshTokenRepo: ReturnType<typeof createMockRepository>;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    empleadoRepo = createMockRepository();
    refreshTokenRepo = createMockRepository();
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue('7d') };
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Empleado), useValue: empleadoRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    const dto = { nro_documento: '12345678', password: 'secret' };

    const empleado: Partial<Empleado> = {
      id_empleado: 1,
      id_sede: 2,
      nro_documento: '12345678',
      nombre_completo: 'Juan Perez',
      password_hash: 'hashed',
      estado: 'activo',
    };

    it('valida', async () => {
      empleadoRepo.findOne.mockResolvedValue(empleado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      dataSource.query.mockResolvedValueOnce([
        { nombre_rol: 'vendedor', nombre_sede: 'Sede Central' },
      ]);
      jwtService.sign.mockReturnValueOnce('jwt-token');

      const result = await service.login(dto);

      expect(result).toEqual({
        access_token: 'jwt-token',
        refresh_token: expect.any(String),
        nombre: 'Juan Perez',
        rol: 'vendedor',
        id_sede: 2,
        sede: 'Sede Central',
        id_empleado: 1,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        id_sede: 2,
        rol: 'vendedor',
        nombre: 'Juan Perez',
      });
      expect(result.refresh_token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('valida', async () => {
      empleadoRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.login(dto);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(InvalidCredentialsException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      empleadoRepo.findOne.mockResolvedValue({
        ...empleado,
        estado: 'inactivo',
      });

      let caught: Error | undefined;
      try {
        await service.login(dto);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(InvalidCredentialsException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      empleadoRepo.findOne.mockResolvedValue(empleado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      let caught: Error | undefined;
      try {
        await service.login(dto);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(InvalidCredentialsException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      empleadoRepo.findOne.mockResolvedValue(empleado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      dataSource.query.mockResolvedValueOnce([]);
      jwtService.sign.mockReturnValueOnce('jwt-token');

      await service.login(dto);

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('WHERE e.id_empleado = $1');
      expect(params).toEqual([1]);
    });
  });

  describe('refresh', () => {
    const token = 'valid-refresh-token';
    const activeRecord = {
      id_empleado: 1,
      token_hash: 'hashed-token',
      expires_at: new Date(Date.now() + 100_000),
      revoked: false,
    };
    const empleado = {
      id_empleado: 1,
      id_sede: 2,
      nombre_completo: 'Juan Perez',
      estado: 'activo',
    };

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([{ ...activeRecord }]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      refreshTokenRepo.save.mockResolvedValue({});
      empleadoRepo.findOne.mockResolvedValue(empleado);
      dataSource.query.mockResolvedValueOnce([
        { nombre_rol: 'vendedor', nombre_sede: 'Sede Central' },
      ]);
      jwtService.sign.mockReturnValueOnce('new-access-token');

      const result = await service.refresh(token);

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: expect.any(String),
        nombre: 'Juan Perez',
        rol: 'vendedor',
        id_sede: 2,
        sede: 'Sede Central',
        id_empleado: 1,
      });
      expect(jwtService.verify).not.toHaveBeenCalled();
      expect(result.refresh_token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('valida', async () => {
      const record = { ...activeRecord };
      refreshTokenRepo.find.mockResolvedValue([record]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      refreshTokenRepo.save.mockResolvedValue({});
      empleadoRepo.findOne.mockResolvedValue(empleado);
      dataSource.query.mockResolvedValueOnce([
        { nombre_rol: 'vendedor', nombre_sede: 'Sede Central' },
      ]);
      jwtService.sign.mockReturnValueOnce('new-access-token');

      await service.refresh(token);

      expect(record.revoked).toBe(true);
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true }),
      );
    });

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([{ ...activeRecord }]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([
        {
          ...activeRecord,
          expires_at: new Date(Date.now() - 1_000),
        },
      ]);

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([{ ...activeRecord }]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });
  });

  describe('logout', () => {
    const rawToken = 'raw-refresh-token';
    const activeRecord = {
      id_empleado: 1,
      token_hash: 'hashed-token',
      expires_at: new Date(Date.now() + 100_000),
      revoked: false,
    };

    it('valida', async () => {
      const record = { ...activeRecord };
      refreshTokenRepo.find.mockResolvedValue([record]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      refreshTokenRepo.save.mockResolvedValue({});

      await service.logout(1, rawToken);

      expect(record.revoked).toBe(true);
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true }),
      );
    });

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([]);

      await service.logout(1, rawToken);

      expect(refreshTokenRepo.save).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([
        {
          ...activeRecord,
          expires_at: new Date(Date.now() - 1_000),
        },
      ]);

      await service.logout(1, rawToken);

      expect(refreshTokenRepo.save).not.toHaveBeenCalled();
    });

    it('valida', async () => {
      refreshTokenRepo.find.mockResolvedValue([{ ...activeRecord }]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.logout(1, rawToken);

      expect(refreshTokenRepo.save).not.toHaveBeenCalled();
    });
  });
});
