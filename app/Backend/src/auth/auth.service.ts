import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
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

// Autenticación con doble token (access + refresh).
// El refresh token se guarda hasheado en BD para permitir revocación en logout.
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    // DataSource para consultas SQL a tablas fuera de AuthModule (Sedes, Roles).
    private readonly dataSource: DataSource,
  ) {}

  // Autentica por nro_documento + contraseña. Retorna tokens, roles y sede.
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const empleado = await this.empleadoRepo.findOne({
      where: { nro_documento: dto.nro_documento },
    });

    // Mismo error para "no existe" e "inactivo" — evita enumeración de usuarios.
    if (!empleado || empleado.estado !== 'activo') {
      throw new InvalidCredentialsException();
    }

    const valid = await bcrypt.compare(dto.password, empleado.password_hash);
    if (!valid) throw new InvalidCredentialsException();

    const { rol, sede: sedeNombre } = await this.getEmpleadoData(
      empleado.id_empleado,
    );

    // Payload mínimo: sub, id_sede, rol, nombre.
    const payload: JwtPayload = {
      sub: empleado.id_empleado,
      id_sede: empleado.id_sede ?? null,
      rol,
      nombre: empleado.nombre_completo,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.issueRefreshToken(empleado.id_empleado);

    return {
      access_token,
      refresh_token,
      nombre: empleado.nombre_completo,
      rol,
      id_sede: empleado.id_sede ?? null,
      sede: sedeNombre,
    };
  }

  // Rotación de tokens: revoca el actual y emite uno nuevo.
  async refresh(token: string): Promise<AuthResponseDto> {
    const record = await this.findMatchingRefreshToken(token);
    if (!record) throw new InvalidRefreshTokenException();

    // Revocar antes de emitir: si falla a mitad, el viejo ya no sirve.
    record.revoked = true;
    await this.refreshTokenRepo.save(record);

    const empleado = await this.empleadoRepo.findOne({
      where: { id_empleado: record.id_empleado },
    });

    // Si el empleado fue desactivado con sesión abierta, se niega la renovación.
    if (!empleado || empleado.estado !== 'activo') {
      throw new InvalidRefreshTokenException();
    }

    const { rol, sede: sedeNombre } = await this.getEmpleadoData(
      empleado.id_empleado,
    );

    const payload: JwtPayload = {
      sub: empleado.id_empleado,
      id_sede: empleado.id_sede ?? null,
      rol,
      nombre: empleado.nombre_completo,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.issueRefreshToken(empleado.id_empleado);

    return {
      access_token,
      refresh_token,
      nombre: empleado.nombre_completo,
      rol,
      id_sede: empleado.id_sede ?? null,
      sede: sedeNombre,
    };
  }

  // Cierra sesión revocando el refresh token activo. Silencioso ante tokens inválidos.
  async logout(userId: number, refreshTokenRaw: string): Promise<void> {
    const record = await this.findMatchingRefreshToken(refreshTokenRaw, userId);
    if (!record) return;

    record.revoked = true;
    await this.refreshTokenRepo.save(record);
  }

  // Genera y persiste refresh token opaco (UUID v4 + hash bcrypt en BD).
  private async issueRefreshToken(id_empleado: number): Promise<string> {
    const refreshExpiresIn = this.configService.get<string>(
      'REFRESH_EXPIRES_IN',
      '7d',
    );

    const refreshTokenRaw = randomUUID();

    await this.refreshTokenRepo.update(
      { id_empleado, revoked: false },
      { revoked: true },
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

  private async findMatchingRefreshToken(
    refreshTokenRaw: string,
    id_empleado?: number,
  ): Promise<RefreshToken | null> {
    const records = await this.refreshTokenRepo.find({
      where:
        id_empleado === undefined
          ? { revoked: false }
          : { id_empleado, revoked: false },
    });

    const now = new Date();
    for (const record of records) {
      if (record.expires_at <= now) continue;
      if (await bcrypt.compare(refreshTokenRaw, record.token_hash)) {
        return record;
      }
    }

    return null;
  }

  // Convierte '30d' | '1h' | '15m' | '60s' a Date absoluto. Fallback: 30 días.
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

  // Un query combina rol + sede para evitar dos roundtrips.
  private async getEmpleadoData(
    id_empleado: number,
  ): Promise<{ rol: string; sede: string }> {
    const rows = await this.dataSource.query<
      { nombre_rol: string; nombre_sede: string }[]
    >(
      `SELECT r.nombre_rol, COALESCE(s.nombre, 'Sin sede') AS nombre_sede
       FROM Empleados e
       JOIN  Roles r  ON r.id_rol  = e.id_rol
       LEFT JOIN Sedes s ON s.id_sede = e.id_sede
       WHERE e.id_empleado = $1`,
      [id_empleado],
    );
    if (!rows.length) return { rol: 'desconocido', sede: 'Sin sede' };
    return { rol: rows[0].nombre_rol, sede: rows[0].nombre_sede };
  }
}
