import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorResponseDto } from './dto/proveedor-response.dto';
import { PaginatedResult, PaginationDto } from '../common/dto/pagination.dto';
import {
  ProveedorNotFoundException,
  ProveedorRucDuplicadoException,
} from '../common/exceptions';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepo: Repository<Proveedor>,
  ) {}

  async create(dto: CreateProveedorDto): Promise<ProveedorResponseDto> {
    const existing = await this.proveedorRepo.findOne({
      where: { ruc: dto.ruc },
    });
    if (existing) throw new ProveedorRucDuplicadoException(dto.ruc);

    const proveedor = this.proveedorRepo.create({
      ruc: dto.ruc,
      razon_social: dto.razon_social,
      contacto_nombre: dto.contacto_nombre ?? null,
      telefono: dto.telefono ?? null,
    });
    return this.toResponse(await this.proveedorRepo.save(proveedor));
  }

  async findAll(
    query: PaginationDto,
  ): Promise<PaginatedResult<ProveedorResponseDto>> {
    const [items, total] = await this.proveedorRepo.findAndCount({
      order: { razon_social: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      items: items.map((item) => this.toResponse(item)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: number): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepo.findOne({
      where: { id_proveedor: id },
    });
    if (!proveedor) throw new ProveedorNotFoundException(id);
    return this.toResponse(proveedor);
  }

  async update(
    id: number,
    dto: UpdateProveedorDto,
  ): Promise<ProveedorResponseDto> {
    const proveedor = await this.proveedorRepo.findOne({
      where: { id_proveedor: id },
    });
    if (!proveedor) throw new ProveedorNotFoundException(id);

    if (dto.ruc) {
      const dup = await this.proveedorRepo.findOne({ where: { ruc: dto.ruc } });
      if (dup && dup.id_proveedor !== id)
        throw new ProveedorRucDuplicadoException(dto.ruc);
    }

    Object.assign(proveedor, {
      ruc: dto.ruc ?? proveedor.ruc,
      razon_social: dto.razon_social ?? proveedor.razon_social,
      contacto_nombre: dto.contacto_nombre ?? proveedor.contacto_nombre,
      telefono: dto.telefono ?? proveedor.telefono,
    });

    return this.toResponse(await this.proveedorRepo.save(proveedor));
  }

  private toResponse(p: Proveedor): ProveedorResponseDto {
    return {
      id_proveedor: p.id_proveedor,
      ruc: p.ruc,
      razon_social: p.razon_social,
      contacto_nombre: p.contacto_nombre,
      telefono: p.telefono,
      created_at: p.created_at,
      updated_at: p.updated_at ?? null,
    };
  }
}
