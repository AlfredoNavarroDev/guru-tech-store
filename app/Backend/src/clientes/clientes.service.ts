import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { ClienteView } from './entities/cliente-view.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClienteDto } from './dto/query-cliente.dto';
import {
  ClienteDuplicadoException,
  ClienteNotFoundException,
} from '../common/exceptions';

// Servicio de clientes. Lectura desde vista, escritura con TypeORM + validación de unicidad.
@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(ClienteView)
    private readonly clienteViewRepo: Repository<ClienteView>,
  ) {}

  // Lista clientes con filtros opcionales.
  async findAll(query: QueryClienteDto): Promise<ClienteView[]> {
    if (query.search) {
      return this.clienteViewRepo.find({
        where: [
          { nombre_completo: ILike(`%${query.search}%`) },
          { nro_documento: ILike(`%${query.search}%`) },
        ],
        order: { nombre_completo: 'ASC' },
      });
    }
    const where: FindOptionsWhere<ClienteView> = {};
    if (query.nombre) where.nombre_completo = ILike(`%${query.nombre}%`);
    if (query.nro_documento) where.nro_documento = ILike(`%${query.nro_documento}%`);
    return this.clienteViewRepo.find({ where, order: { nombre_completo: 'ASC' } });
  }

  // Obtiene cliente por ID desde la vista (incluye total compras). Lanza 404 si no existe.
  async findOne(id: number): Promise<ClienteView> {
    const cliente = await this.clienteViewRepo.findOne({ where: { id_cliente: id } });
    if (!cliente) throw new ClienteNotFoundException(id);
    return cliente;
  }

  // Crea cliente validando unicidad (tipo_documento + nro_documento) en la app.
  async create(dto: CreateClienteDto): Promise<Cliente> {
    const exists = await this.clienteRepo.findOne({
      where: {
        tipo_documento: dto.tipo_documento,
        nro_documento: dto.nro_documento,
      },
    });
    if (exists) {
      throw new ClienteDuplicadoException(
        dto.tipo_documento,
        dto.nro_documento,
      );
    }
    const cliente = this.clienteRepo.create({
      ...dto,
      es_extranjero: dto.tipo_documento !== 'DNI',
    });
    return this.clienteRepo.save(cliente);
  }

  // Actualiza cliente (patch parcial). Si cambia tipo_documento, recalcula es_extranjero.
  async update(id: number, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.clienteRepo.findOne({
      where: { id_cliente: id },
    });
    if (!cliente) throw new ClienteNotFoundException(id);
    Object.assign(cliente, dto);
    if (dto.tipo_documento !== undefined) {
      cliente.es_extranjero = dto.tipo_documento !== 'DNI';
    }
    return this.clienteRepo.save(cliente);
  }
}
