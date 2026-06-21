import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClientesService } from './clientes.service';
import {
  ClienteNotFoundException,
  ClienteDuplicadoException,
} from '../common/exceptions';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('ClientesService', () => {
  let service: ClientesService;
  let clienteRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    clienteRepo = createMockRepository();
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: getRepositoryToken(Cliente), useValue: clienteRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('valida', async () => {
      const rows = [{ id_cliente: 1, nombre_completo: 'Ana Lopez' }];
      dataSource.query.mockResolvedValue(rows);

      const result = await service.findAll({});
      const [sql, params] = dataSource.query.mock.calls[0];

      expect(result).toEqual(rows);
      expect(sql).toContain('ORDER BY nombre_completo');
      expect(params).toEqual([]);
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([]);
      await service.findAll({ nombre: 'Ana' });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('ILIKE');
      expect(params).toContain('%Ana%');
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([]);
      await service.findAll({ nro_documento: '12345678' });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('nro_documento');
      expect(params).toContain('%12345678%');
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([]);
      await service.findAll({ nombre: 'Ana', nro_documento: '12345678' });

      const [sql, params] = dataSource.query.mock.calls[0];

      expect(sql).toContain('ILIKE');
      expect(params).toEqual(['%Ana%', '%12345678%']);
    });
  });

  describe('findOne', () => {
    it('valida', async () => {
      const row = { id_cliente: 1, nombre_completo: 'Ana Lopez' };
      dataSource.query.mockResolvedValue([row]);

      const result = await service.findOne(1);

      expect(result).toEqual(row);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id_cliente = $1'),
        [1],
      );
    });

    it('valida', async () => {
      dataSource.query.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.findOne(999);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(ClienteNotFoundException);
    });
  });

  describe('create', () => {
    const dto: CreateClienteDto = {
      tipo_documento: 'DNI',
      nro_documento: '12345678',
      nombre_completo: 'Ana Lopez',
    };

    it('valida', async () => {
      clienteRepo.findOne.mockResolvedValue(null);
      const newCliente = { id_cliente: 1, ...dto };
      clienteRepo.create.mockReturnValue(newCliente);
      clienteRepo.save.mockResolvedValue(newCliente);

      const result = await service.create(dto);

      expect(result).toEqual(newCliente);
      expect(clienteRepo.create).toHaveBeenCalledWith({
        ...dto,
        es_extranjero: false,
      });
      expect(clienteRepo.save).toHaveBeenCalledWith(newCliente);
    });

    it('valida', async () => {
      clienteRepo.findOne.mockResolvedValue(null);
      clienteRepo.create.mockReturnValue({});
      clienteRepo.save.mockResolvedValue({});

      await service.create(dto);

      const callArgs = clienteRepo.findOne.mock.calls[0][0];

      expect(clienteRepo.findOne).toHaveBeenCalledWith({
        where: {
          tipo_documento: dto.tipo_documento,
          nro_documento: dto.nro_documento,
        },
      });
    });

    it('valida', async () => {
      clienteRepo.findOne.mockResolvedValue({ id_cliente: 99 });

      let caught: Error | undefined;
      try {
        await service.create(dto);
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(ClienteDuplicadoException);
      expect(clienteRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('valida', async () => {
      const existing: Partial<Cliente> = {
        id_cliente: 1,
        nombre_completo: 'Old Name',
      };
      clienteRepo.findOne.mockResolvedValue(existing);
      clienteRepo.save.mockResolvedValue({
        ...existing,
        nombre_completo: 'New Name',
      });

      const result = await service.update(1, {
        nombre_completo: 'New Name',
      });

      expect(result.nombre_completo).toBe('New Name');
    });

    it('valida', async () => {
      clienteRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.update(999, {});
      } catch (e) {
        caught = e as Error;
      }

      expect(caught).toBeInstanceOf(ClienteNotFoundException);
      expect(clienteRepo.save).not.toHaveBeenCalled();
    });
  });
});
