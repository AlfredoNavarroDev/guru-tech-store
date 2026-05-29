import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClienteDto } from './dto/query-cliente.dto';

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
}

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryClienteDto): Promise<ClienteVista[]> {
    let sql = `SELECT * FROM v_vendedor_clientes WHERE 1=1`;
    const params: (string | number)[] = [];
    let idx = 1;

    if (query.nombre) {
      sql += ` AND nombre_completo ILIKE $${idx++}`;
      params.push(`%${query.nombre}%`);
    }
    if (query.nro_documento) {
      sql += ` AND nro_documento = $${idx++}`;
      params.push(query.nro_documento);
    }

    sql += ` ORDER BY nombre_completo`;
    return this.dataSource.query<ClienteVista[]>(sql, params);
  }

  async findOne(id: number): Promise<ClienteVista> {
    const rows = await this.dataSource.query<ClienteVista[]>(
      `SELECT * FROM v_vendedor_clientes WHERE id_cliente = $1`,
      [id],
    );
    if (!rows.length)
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    return rows[0];
  }

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const exists = await this.clienteRepo.findOne({
      where: {
        tipo_documento: dto.tipo_documento,
        nro_documento: dto.nro_documento,
      },
    });
    if (exists) {
      throw new ConflictException(
        `Ya existe un cliente con ${dto.tipo_documento} ${dto.nro_documento}`,
      );
    }
    const cliente = this.clienteRepo.create(dto);
    return this.clienteRepo.save(cliente);
  }

  async update(id: number, dto: UpdateClienteDto): Promise<Cliente> {
    const cliente = await this.clienteRepo.findOne({
      where: { id_cliente: id },
    });
    if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);
    Object.assign(cliente, dto);
    return this.clienteRepo.save(cliente);
  }
}
