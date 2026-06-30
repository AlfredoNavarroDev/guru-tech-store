import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClienteDto } from './dto/query-cliente.dto';
import {
  ClienteDuplicadoException,
  ClienteNotFoundException,
} from '../common/exceptions';

// Estructura de fila de la vista v_vendedor_clientes.
interface ClienteVista {
  id_cliente: number;
  nombre_completo: string;
  tipo_documento: string;
  nro_documento: string;
  telefono: string | null;
  direccion_completa: string | null;
  es_extranjero: boolean;
  total_compras: number;
  ultima_compra: Date | null;
  total_reparaciones: number;
  ultima_reparacion: Date | null;
}

// Servicio de clientes. Lectura desde vista, escritura con TypeORM + validación de unicidad.
@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    private readonly dataSource: DataSource,
  ) {}

  // Lista clientes con filtros opcionales. SQL parametrizado con ILIKE case-insensitive.
  async findAll(query: QueryClienteDto): Promise<ClienteVista[]> {
    let sql = `SELECT * FROM v_vendedor_clientes WHERE 1=1`;
    const params: (string | number)[] = [];
    let idx = 1;

    if (query.search) {
      sql += ` AND (nombre_completo ILIKE $${idx} OR nro_documento ILIKE $${idx})`;
      params.push(`%${query.search}%`);
      idx++;
    } else {
      if (query.nombre) {
        sql += ` AND nombre_completo ILIKE $${idx++}`;
        params.push(`%${query.nombre}%`);
      }
      if (query.nro_documento) {
        sql += ` AND nro_documento ILIKE $${idx++}`;
        params.push(`%${query.nro_documento}%`);
      }
    }

    sql += ` ORDER BY nombre_completo`;
    return this.dataSource.query<ClienteVista[]>(sql, params);
  }

  // Obtiene cliente por ID desde la vista (incluye total compras). Lanza 404 si no existe.
  async findOne(id: number): Promise<ClienteVista> {
    const rows = await this.dataSource.query<ClienteVista[]>(
      `SELECT * FROM v_vendedor_clientes WHERE id_cliente = $1`,
      [id],
    );
    if (!rows.length) throw new ClienteNotFoundException(id);
    return rows[0];
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
