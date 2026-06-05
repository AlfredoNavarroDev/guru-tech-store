import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Empleado } from './entities/empleado.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import {
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from '../common/exceptions';

/**
 * @purpose Autenticación con doble token (access + refresh).
 * @dependencies JwtService, ConfigService, DataSource, TypeORM repos.
 * @side_effects Persiste y revoca refresh tokens en BD.
 *
 * El refresh token se guarda hasheado en BD para permitir revocación
 * en logout, cierre forzado de sesión o detección de tokens robados.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    // DataSource se usa para consultas SQL crudas que involucran tablas
    // fuera del contexto de AuthModule (Sedes, Empleado_Roles, Roles).
    // Evita crear dependencias circulares importando otros módulos.
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Autentica empleado por nro_documento + contraseña.
   * Devuelve access token, refresh token, roles y sede.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const empleado = await this.empleadoRepo.findOne({
      where: { nro_documento: dto.nro_documento },
    });

    // Mismo error para "no existe" e "inactivo" → evita enumeración de usuarios.
    if (!empleado || empleado.estado !== 'activo') {
      throw new InvalidCredentialsException();
    }

    const valid = await bcrypt.compare(dto.password, empleado.password_hash);
    if (!valid) throw new InvalidCredentialsException();

    const roles = await this.getRoles(empleado.id_empleado);

    // Sede en respuesta → frontend la muestra sin llamada extra.
    const sedeRows = await this.dataSource.query<{ nombre: string }[]>(
      `SELECT nombre FROM Sedes WHERE id_sede = $1`,
      [empleado.id_sede],
    );
    const sedeNombre = sedeRows.length > 0 ? sedeRows[0].nombre : 'Sin sede';

    // Payload mínimo: sub, id_sede, roles, nombre.
    const payload: JwtPayload = {
      sub: empleado.id_empleado,
      id_sede: empleado.id_sede!,
      roles,
      nombre: empleado.nombre_completo,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.issueRefreshToken(empleado.id_empleado);

    return {
      access_token,
      refresh_token,
      nombre: empleado.nombre_completo,
      roles,
      id_sede: empleado.id_sede!,
      sede: sedeNombre,
    };
  }

  /**
   * Rotación de tokens: revoca el refresh token actual y emite uno nuevo.
   * Si se reusa un token ya revocado → posible robo detectado.
   */
  async refresh(token: string): Promise<AuthResponseDto> {
    let decoded: { sub: number; type: string };

    // verify lanza si expirado/firma inválida → convertimos a error de dominio.
    try {
      decoded = this.jwtService.verify<{ sub: number; type: string }>(token);
    } catch {
      throw new InvalidRefreshTokenException();
    }

    // type: 'refresh' evita que un access token se use como refresh token.
    if (decoded.type !== 'refresh') {
      throw new InvalidRefreshTokenException();
    }

    // Verificamos que no esté revocado en BD.
    const record = await this.refreshTokenRepo.findOne({
      where: { id_empleado: decoded.sub, revoked: false },
    });

    if (!record) throw new InvalidRefreshTokenException();

    // Doble check de expiración: JWT (criptográfico) + BD (revocación administrativa).
    if (record.expires_at <= new Date())
      throw new InvalidRefreshTokenException();

    // bcrypt.compare confirma que el token es exactamente el emitido.
    const match = await bcrypt.compare(token, record.token_hash);
    if (!match) throw new InvalidRefreshTokenException();

    // Revocar antes de emitir → si falla a mitad, el viejo ya no sirve.
    record.revoked = true;
    await this.refreshTokenRepo.save(record);

    const empleado = await this.empleadoRepo.findOne({
      where: { id_empleado: decoded.sub },
    });

    // Si el empleado fue desactivado con sesión abierta → se niega renovación.
    if (!empleado || empleado.estado !== 'activo') {
      throw new InvalidRefreshTokenException();
    }

    const roles = await this.getRoles(empleado.id_empleado);

    const sedeRows = await this.dataSource.query<{ nombre: string }[]>(
      `SELECT nombre FROM Sedes WHERE id_sede = $1`,
      [empleado.id_sede],
    );
    const sedeNombre = sedeRows.length > 0 ? sedeRows[0].nombre : 'Sin sede';

    const payload: JwtPayload = {
      sub: empleado.id_empleado,
      id_sede: empleado.id_sede!,
      roles,
      nombre: empleado.nombre_completo,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.issueRefreshToken(empleado.id_empleado);

    return {
      access_token,
      refresh_token,
      nombre: empleado.nombre_completo,
      roles,
      id_sede: empleado.id_sede!,
      sede: sedeNombre,
    };
  }

  /**
   * Cierra sesión revocando el refresh token activo.
   * Silencioso ante tokens inválidos/expirados → no revela estado de sesión.
   */
  async logout(userId: number, refreshTokenRaw: string): Promise<void> {
    const record = await this.refreshTokenRepo.findOne({
      where: { id_empleado: userId, revoked: false },
    });

    // Sin token activo o ya expirado → nada que revocar.
    if (!record || record.expires_at <= new Date()) return;

    const match = await bcrypt.compare(refreshTokenRaw, record.token_hash);
    if (!match) return;

    record.revoked = true;
    await this.refreshTokenRepo.save(record);
  }

  /**
   * Genera y persiste refresh token (JWT + hash bcrypt en BD).
   * Solo se guarda el hash, nunca el token en claro.
   */
  private async issueRefreshToken(id_empleado: number): Promise<string> {
    const refreshExpiresIn = this.configService.get<string>(
      'REFRESH_EXPIRES_IN',
      '30d',
    );

    const refreshTokenRaw = this.jwtService.sign(
      { sub: id_empleado, type: 'refresh' },
      { expiresIn: refreshExpiresIn as unknown as number },
    );

    const token_hash = await bcrypt.hash(refreshTokenRaw, 10);
    const expires_at = this.parseExpiry(refreshExpiresIn);

    const entity = this.refreshTokenRepo.create({
      id_empleado,
      token_hash,
      expires_at,
      revoked: false,
    });

    await this.refreshTokenRepo.save(entity);

    return refreshTokenRaw;
  }

  /**
   * Convierte '30d' | '1h' | '15m' | '60s' → Date absoluto.
   * Fallback: 30 días si el formato no coincide.
   */
  private parseExpiry(expiresIn: string): Date {
    const match = /^(\d+)([dhms])$/.exec(expiresIn);
    if (!match) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback 30d

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60 * 1_000,
      h: 60 * 60 * 1_000,
      d: 24 * 60 * 60 * 1_000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }

  /**
   * Obtiene roles del empleado desde Empleado_Roles.
   * Van en el JWT para que los guards autoricen sin consultar BD.
   */
  private async getRoles(id_empleado: number): Promise<string[]> {
    const rows = await this.dataSource.query<{ nombre_rol: string }[]>(
      `SELECT r.nombre_rol FROM Empleado_Roles er
       JOIN Roles r ON r.id_rol = er.id_rol
       WHERE er.id_empleado = $1`,
      [id_empleado],
    );
    return rows.map((r) => r.nombre_rol);
  }
}
