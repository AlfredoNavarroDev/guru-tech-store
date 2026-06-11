import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Empleado } from '../auth/entities/empleado.entity';
import { Rol } from '../auth/entities/rol.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PaginatedResult } from '../common/dto/pagination.dto';
import {
  EmpleadoNotFoundException,
  EmpleadoDocumentoDuplicadoException,
  EmpleadoSelfDeactivateException,
  RolNotFoundException,
} from '../common/exceptions';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { UpdatePasswordEmpleadoDto } from './dto/update-password-empleado.dto';
import { UpdateEstadoEmpleadoDto } from './dto/update-estado-empleado.dto';
import { QueryEmpleadosDto } from './dto/query-empleados.dto';

@Injectable()
export class EmpleadosService {
  constructor(
    @InjectRepository(Empleado)
    private readonly empleadosRepo: Repository<Empleado>,
    @InjectRepository(Rol)
    private readonly rolesRepo: Repository<Rol>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateEmpleadoDto, currentUser: JwtPayload): Promise<Empleado> {
    await this.validateRolExists(dto.id_rol);
    await this.validateDocumentoUnico(dto.tipo_documento, dto.nro_documento);

    const password_hash = await bcrypt.hash(dto.password, 10);
    const empleado = this.empleadosRepo.create({
      tipo_documento: dto.tipo_documento,
      nro_documento: dto.nro_documento,
      nombre_completo: dto.nombre_completo,
      id_rol: dto.id_rol,
      password_hash,
      id_sede: currentUser.id_sede,
      telefono: dto.telefono ?? null,
      sueldo_semanal_soles: dto.sueldo_semanal_soles ?? null,
      es_extranjero: dto.es_extranjero ?? false,
      direccion_completa: dto.direccion_completa ?? null,
      created_by: currentUser.sub,
    });
    return this.empleadosRepo.save(empleado);
  }

  async findAll(currentUser: JwtPayload, query: QueryEmpleadosDto): Promise<PaginatedResult<Empleado>> {
    const qb = this.empleadosRepo
      .createQueryBuilder('e')
      .where('e.id_sede = :id_sede', { id_sede: currentUser.id_sede })
      .orderBy('e.nombre_completo', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.id_rol !== undefined) {
      qb.andWhere('e.id_rol = :id_rol', { id_rol: query.id_rol });
    }
    if (query.activo !== undefined) {
      qb.andWhere('e.estado = :estado', { estado: query.activo ? 'activo' : 'inactivo' });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: number, currentUser: JwtPayload): Promise<Empleado> {
    const empleado = await this.empleadosRepo.findOne({
      where: { id_empleado: id, id_sede: currentUser.id_sede },
    });
    if (!empleado) throw new EmpleadoNotFoundException(id);
    return empleado;
  }

  async update(id: number, dto: UpdateEmpleadoDto, currentUser: JwtPayload): Promise<Empleado> {
    const empleado = await this.findOne(id, currentUser);
    if (dto.id_rol !== undefined) await this.validateRolExists(dto.id_rol);
    Object.assign(empleado, dto);
    return this.empleadosRepo.save(empleado);
  }

  async updatePassword(id: number, dto: UpdatePasswordEmpleadoDto, currentUser: JwtPayload): Promise<void> {
    const empleado = await this.findOne(id, currentUser);
    empleado.password_hash = await bcrypt.hash(dto.nueva_password, 10);
    await this.empleadosRepo.save(empleado);
  }

  // HU-24: Al desactivar → revocar todos los refresh tokens activos del empleado.
  async updateEstado(id: number, dto: UpdateEstadoEmpleadoDto, currentUser: JwtPayload): Promise<void> {
    if (id === currentUser.sub) throw new EmpleadoSelfDeactivateException();
    await this.findOne(id, currentUser);

    if (!dto.activo) {
      await this.dataSource.query(
        `UPDATE "refreshtokens" SET revoked = true WHERE id_empleado = $1 AND revoked = false`,
        [id],
      );
    }

    await this.empleadosRepo.update(id, { estado: dto.activo ? 'activo' : 'inactivo' });
  }

  private async validateRolExists(id_rol: number): Promise<void> {
    const rol = await this.rolesRepo.findOne({ where: { id_rol } });
    if (!rol) throw new RolNotFoundException(id_rol);
  }

  private async validateDocumentoUnico(tipo_documento: string, nro_documento: string): Promise<void> {
    const exists = await this.empleadosRepo.findOne({ where: { tipo_documento, nro_documento } });
    if (exists) throw new EmpleadoDocumentoDuplicadoException();
  }
}
