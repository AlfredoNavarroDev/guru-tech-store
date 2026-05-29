import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Empleado } from './entities/empleado.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadoRepo: Repository<Empleado>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const empleado = await this.empleadoRepo.findOne({
      where: { nro_documento: dto.nro_documento },
    });

    if (!empleado || empleado.estado !== 'activo') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, empleado.password_hash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const roles = await this.getRoles(empleado.id_empleado);

    const payload: JwtPayload = {
      sub: empleado.id_empleado,
      id_sede: empleado.id_sede!,
      roles,
      nombre: empleado.nombre_completo,
    };

    return {
      access_token: this.jwtService.sign(payload),
      nombre: empleado.nombre_completo,
      roles,
      id_sede: empleado.id_sede!,
    };
  }

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
