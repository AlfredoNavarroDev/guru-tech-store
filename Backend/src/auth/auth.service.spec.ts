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
  findOne: jest.fn(),
  save: jest.fn().mockResolvedValue({}),
  create: jest.fn().mockReturnValue({}),
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

    it('returns token and employee data on success', async () => {
      console.log(
        '\n🔍 Acción   : login() con credenciales válidas (empleado activo, password correcto)',
      );
      console.log(
        '📌 Espera   : objeto { access_token, refresh_token, nombre, roles, id_sede, sede }',
      );

      empleadoRepo.findOne.mockResolvedValue(empleado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      dataSource.query
        .mockResolvedValueOnce([{ nombre_rol: 'vendedor' }])
        .mockResolvedValueOnce([{ nombre: 'Sede Central' }]);
      jwtService.sign
        .mockReturnValueOnce('jwt-token')
        .mockReturnValueOnce('refresh-jwt-token');

      const result = await service.login(dto);

      console.log('✅ Resultado:', JSON.stringify(result));

      expect(result).toEqual({
        access_token: 'jwt-token',
        refresh_token: 'refresh-jwt-token',
        nombre: 'Juan Perez',
        roles: ['vendedor'],
        id_sede: 2,
        sede: 'Sede Central',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        id_sede: 2,
        roles: ['vendedor'],
        nombre: 'Juan Perez',
      });
    });

    it('returns multiple roles when employee has several', async () => {
      console.log(
        '\n🔍 Acción   : login() con empleado que tiene varios roles',
      );
      console.log('📌 Espera   : roles: ["vendedor", "supervisor"]');

      empleadoRepo.findOne.mockResolvedValue(empleado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      dataSource.query
        .mockResolvedValueOnce([
          { nombre_rol: 'vendedor' },
          { nombre_rol: 'supervisor' },
        ])
        .mockResolvedValueOnce([{ nombre: 'Sede Central' }]);
      jwtService.sign
        .mockReturnValueOnce('jwt-token')
        .mockReturnValueOnce('refresh-jwt-token');

      const result = await service.login(dto);

      console.log('✅ Resultado: roles =', result.roles);

      expect(result.roles).toEqual(['vendedor', 'supervisor']);
    });

    it('throws UnauthorizedException when employee not found', async () => {
      console.log('\n🔍 Acción   : login() con nro_documento inexistente');
      console.log(
        '📌 Espera   : UnauthorizedException "Credenciales inválidas"',
      );

      empleadoRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.login(dto);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(InvalidCredentialsException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when employee estado is not activo', async () => {
      console.log('\n🔍 Acción   : login() con empleado en estado "inactivo"');
      console.log(
        '📌 Espera   : UnauthorizedException "Credenciales inválidas"',
      );

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

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(InvalidCredentialsException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password is invalid', async () => {
      console.log('\n🔍 Acción   : login() con password incorrecto');
      console.log(
        '📌 Espera   : UnauthorizedException "Credenciales inválidas"',
      );

      empleadoRepo.findOne.mockResolvedValue(empleado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      let caught: Error | undefined;
      try {
        await service.login(dto);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(InvalidCredentialsException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('queries getRoles with correct employee id', async () => {
      console.log(
        '\n🔍 Acción   : login() exitoso — verificar que getRoles usa id_empleado correcto',
      );
      console.log('📌 Espera   : dataSource.query llamado con id_empleado = 1');

      empleadoRepo.findOne.mockResolvedValue(empleado);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ nombre: 'Sin sede' }]);
      jwtService.sign
        .mockReturnValueOnce('jwt-token')
        .mockReturnValueOnce('refresh-jwt-token');

      await service.login(dto);

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene WHERE er.id_empleado = $1, params =',
        params,
      );

      expect(sql).toContain('WHERE er.id_empleado = $1');
      expect(params).toEqual([1]);
    });
  });

  describe('refresh', () => {
    const token = 'valid-refresh-token';
    const decoded = { sub: 1, type: 'refresh' };
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

    it('returns new tokens on success', async () => {
      console.log(
        '\n🔍 Acción   : refresh() con token válido, record activo, empleado activo',
      );
      console.log(
        '📌 Espera   : { access_token, refresh_token, nombre, roles, id_sede, sede }',
      );

      jwtService.verify.mockReturnValue(decoded);
      refreshTokenRepo.findOne.mockResolvedValue({ ...activeRecord });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      refreshTokenRepo.save.mockResolvedValue({});
      empleadoRepo.findOne.mockResolvedValue(empleado);
      dataSource.query
        .mockResolvedValueOnce([{ nombre_rol: 'vendedor' }])
        .mockResolvedValueOnce([{ nombre: 'Sede Central' }]);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refresh(token);

      console.log('✅ Resultado:', JSON.stringify(result));

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        nombre: 'Juan Perez',
        roles: ['vendedor'],
        id_sede: 2,
        sede: 'Sede Central',
      });
    });

    it('revokes old refresh token before issuing new one', async () => {
      console.log(
        '\n🔍 Acción   : refresh() — verificar que revoca el token anterior',
      );
      console.log(
        '📌 Espera   : record.revoked = true y refreshTokenRepo.save llamado',
      );

      const record = { ...activeRecord };
      jwtService.verify.mockReturnValue(decoded);
      refreshTokenRepo.findOne.mockResolvedValue(record);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      refreshTokenRepo.save.mockResolvedValue({});
      empleadoRepo.findOne.mockResolvedValue(empleado);
      dataSource.query
        .mockResolvedValueOnce([{ nombre_rol: 'vendedor' }])
        .mockResolvedValueOnce([{ nombre: 'Sede Central' }]);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      await service.refresh(token);

      console.log('✅ Resultado: record.revoked =', record.revoked);

      expect(record.revoked).toBe(true);
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true }),
      );
    });

    it('throws InvalidRefreshTokenException when JWT verification fails', async () => {
      console.log('\n🔍 Acción   : refresh() con token JWT malformado');
      console.log('📌 Espera   : InvalidRefreshTokenException');

      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      console.log('✅ Resultado:', caught?.constructor?.name);

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('throws InvalidRefreshTokenException when token type is not refresh', async () => {
      console.log('\n🔍 Acción   : refresh() con token de tipo "access"');
      console.log('📌 Espera   : InvalidRefreshTokenException');

      jwtService.verify.mockReturnValue({ sub: 1, type: 'access' });

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      console.log('✅ Resultado:', caught?.constructor?.name);

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('throws InvalidRefreshTokenException when no active record found', async () => {
      console.log(
        '\n🔍 Acción   : refresh() cuando no existe record activo en BD',
      );
      console.log('📌 Espera   : InvalidRefreshTokenException');

      jwtService.verify.mockReturnValue(decoded);
      refreshTokenRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      console.log('✅ Resultado:', caught?.constructor?.name);

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('throws InvalidRefreshTokenException when record is expired', async () => {
      console.log(
        '\n🔍 Acción   : refresh() con record cuyo expires_at ya pasó',
      );
      console.log('📌 Espera   : InvalidRefreshTokenException');

      jwtService.verify.mockReturnValue(decoded);
      refreshTokenRepo.findOne.mockResolvedValue({
        ...activeRecord,
        expires_at: new Date(Date.now() - 1_000),
      });

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      console.log('✅ Resultado:', caught?.constructor?.name);

      expect(caught).toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('throws InvalidRefreshTokenException when token hash does not match', async () => {
      console.log('\n🔍 Acción   : refresh() con token cuyo hash no coincide');
      console.log('📌 Espera   : InvalidRefreshTokenException');

      jwtService.verify.mockReturnValue(decoded);
      refreshTokenRepo.findOne.mockResolvedValue({ ...activeRecord });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      let caught: Error | undefined;
      try {
        await service.refresh(token);
      } catch (e) {
        caught = e as Error;
      }

      console.log('✅ Resultado:', caught?.constructor?.name);

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

    it('revokes token when record is valid and hash matches', async () => {
      console.log(
        '\n🔍 Acción   : logout(1, token) — record activo, hash coincide',
      );
      console.log('📌 Espera   : record.revoked = true, save() llamado');

      const record = { ...activeRecord };
      refreshTokenRepo.findOne.mockResolvedValue(record);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      refreshTokenRepo.save.mockResolvedValue({});

      await service.logout(1, rawToken);

      console.log('✅ Resultado: record.revoked =', record.revoked);

      expect(record.revoked).toBe(true);
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true }),
      );
    });

    it('does nothing when no active record found', async () => {
      console.log('\n🔍 Acción   : logout(1, token) — sin record activo en BD');
      console.log('📌 Espera   : save() NO se llama');

      refreshTokenRepo.findOne.mockResolvedValue(null);

      await service.logout(1, rawToken);

      console.log(
        '✅ Resultado: save() llamado',
        refreshTokenRepo.save.mock.calls.length,
        'veces',
      );

      expect(refreshTokenRepo.save).not.toHaveBeenCalled();
    });

    it('does nothing when record is expired', async () => {
      console.log('\n🔍 Acción   : logout(1, token) — record expirado');
      console.log('📌 Espera   : save() NO se llama');

      refreshTokenRepo.findOne.mockResolvedValue({
        ...activeRecord,
        expires_at: new Date(Date.now() - 1_000),
      });

      await service.logout(1, rawToken);

      console.log(
        '✅ Resultado: save() llamado',
        refreshTokenRepo.save.mock.calls.length,
        'veces',
      );

      expect(refreshTokenRepo.save).not.toHaveBeenCalled();
    });

    it('does nothing when token hash does not match', async () => {
      console.log('\n🔍 Acción   : logout(1, token) — hash no coincide');
      console.log('📌 Espera   : save() NO se llama');

      refreshTokenRepo.findOne.mockResolvedValue({ ...activeRecord });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.logout(1, rawToken);

      console.log(
        '✅ Resultado: save() llamado',
        refreshTokenRepo.save.mock.calls.length,
        'veces',
      );

      expect(refreshTokenRepo.save).not.toHaveBeenCalled();
    });
  });
});
