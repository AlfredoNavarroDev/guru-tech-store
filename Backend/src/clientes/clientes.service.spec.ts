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
    it('returns all clients when no filters provided', async () => {
      console.log('\n🔍 Acción   : findAll() sin filtros');
      console.log(
        '📌 Espera   : query con ORDER BY nombre_completo, params vacíos',
      );

      const rows = [{ id_cliente: 1, nombre_completo: 'Ana Lopez' }];
      dataSource.query.mockResolvedValue(rows);

      const result = await service.findAll({});
      const [sql, params] = dataSource.query.mock.calls[0];

      console.log(
        '✅ Resultado:',
        result.length,
        'registro(s), SQL termina en:',
        sql.slice(-30),
        '| params:',
        params,
      );

      expect(result).toEqual(rows);
      expect(sql).toContain('ORDER BY nombre_completo');
      expect(params).toEqual([]);
    });

    it('appends nombre ILIKE filter', async () => {
      console.log('\n🔍 Acción   : findAll({ nombre: "Ana" })');
      console.log('📌 Espera   : SQL contiene ILIKE, params = ["%Ana%"]');

      dataSource.query.mockResolvedValue([]);
      await service.findAll({ nombre: 'Ana' });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene ILIKE =',
        sql.includes('ILIKE'),
        '| params =',
        params,
      );

      expect(sql).toContain('ILIKE');
      expect(params).toContain('%Ana%');
    });

    it('appends nro_documento exact filter', async () => {
      console.log('\n🔍 Acción   : findAll({ nro_documento: "12345678" })');
      console.log(
        '📌 Espera   : SQL contiene nro_documento, params = ["12345678"]',
      );

      dataSource.query.mockResolvedValue([]);
      await service.findAll({ nro_documento: '12345678' });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene nro_documento =',
        sql.includes('nro_documento'),
        '| params =',
        params,
      );

      expect(sql).toContain('nro_documento');
      expect(params).toContain('12345678');
    });

    it('appends both nombre and nro_documento filters', async () => {
      console.log(
        '\n🔍 Acción   : findAll({ nombre: "Ana", nro_documento: "12345678" })',
      );
      console.log(
        '📌 Espera   : SQL contiene ILIKE, params = ["%Ana%", "12345678"]',
      );

      dataSource.query.mockResolvedValue([]);
      await service.findAll({ nombre: 'Ana', nro_documento: '12345678' });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log('✅ Resultado: params =', params);

      expect(sql).toContain('ILIKE');
      expect(params).toEqual(['%Ana%', '12345678']);
    });
  });

  describe('findOne', () => {
    it('returns client when found', async () => {
      console.log('\n🔍 Acción   : findOne(1) — cliente existe');
      console.log(
        '📌 Espera   : retorna objeto ClienteVista con id_cliente = 1',
      );

      const row = { id_cliente: 1, nombre_completo: 'Ana Lopez' };
      dataSource.query.mockResolvedValue([row]);

      const result = await service.findOne(1);

      console.log('✅ Resultado:', JSON.stringify(result));

      expect(result).toEqual(row);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id_cliente = $1'),
        [1],
      );
    });

    it('throws NotFoundException when client does not exist', async () => {
      console.log('\n🔍 Acción   : findOne(999) — cliente inexistente');
      console.log(
        '📌 Espera   : NotFoundException "Cliente 999 no encontrado"',
      );

      dataSource.query.mockResolvedValue([]);

      let caught: Error | undefined;
      try {
        await service.findOne(999);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );

      expect(caught).toBeInstanceOf(ClienteNotFoundException);
    });
  });

  describe('create', () => {
    const dto: CreateClienteDto = {
      tipo_documento: 'DNI',
      nro_documento: '12345678',
      nombre_completo: 'Ana Lopez',
    };

    it('creates and returns new client', async () => {
      console.log('\n🔍 Acción   : create() con DNI 12345678 no duplicado');
      console.log('📌 Espera   : retorna cliente creado con id_cliente = 1');

      clienteRepo.findOne.mockResolvedValue(null);
      const newCliente = { id_cliente: 1, ...dto };
      clienteRepo.create.mockReturnValue(newCliente);
      clienteRepo.save.mockResolvedValue(newCliente);

      const result = await service.create(dto);

      console.log('✅ Resultado:', JSON.stringify(result));

      expect(result).toEqual(newCliente);
      expect(clienteRepo.create).toHaveBeenCalledWith(dto);
      expect(clienteRepo.save).toHaveBeenCalledWith(newCliente);
    });

    it('checks for duplicate by tipo_documento and nro_documento', async () => {
      console.log(
        '\n🔍 Acción   : create() — verificar que busca duplicado por tipo+nro de documento',
      );
      console.log(
        '📌 Espera   : clienteRepo.findOne llamado con { tipo_documento, nro_documento }',
      );

      clienteRepo.findOne.mockResolvedValue(null);
      clienteRepo.create.mockReturnValue({});
      clienteRepo.save.mockResolvedValue({});

      await service.create(dto);

      const callArgs = clienteRepo.findOne.mock.calls[0][0];
      console.log(
        '✅ Resultado: findOne llamado con where =',
        JSON.stringify(callArgs.where),
      );

      expect(clienteRepo.findOne).toHaveBeenCalledWith({
        where: {
          tipo_documento: dto.tipo_documento,
          nro_documento: dto.nro_documento,
        },
      });
    });

    it('throws ConflictException when duplicate document exists', async () => {
      console.log('\n🔍 Acción   : create() con DNI 12345678 ya registrado');
      console.log('📌 Espera   : ConflictException, save() no se llama');

      clienteRepo.findOne.mockResolvedValue({ id_cliente: 99 });

      let caught: Error | undefined;
      try {
        await service.create(dto);
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );
      console.log(
        '   save() llamado:',
        clienteRepo.save.mock.calls.length,
        'veces',
      );

      expect(caught).toBeInstanceOf(ClienteDuplicadoException);
      expect(clienteRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates and returns client with new data', async () => {
      console.log('\n🔍 Acción   : update(1, { nombre_completo: "New Name" })');
      console.log(
        '📌 Espera   : retorna cliente con nombre_completo actualizado',
      );

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

      console.log('✅ Resultado: nombre_completo =', result.nombre_completo);

      expect(result.nombre_completo).toBe('New Name');
    });

    it('throws NotFoundException when client does not exist', async () => {
      console.log('\n🔍 Acción   : update(999, {}) — cliente inexistente');
      console.log('📌 Espera   : NotFoundException, save() no se llama');

      clienteRepo.findOne.mockResolvedValue(null);

      let caught: Error | undefined;
      try {
        await service.update(999, {});
      } catch (e) {
        caught = e as Error;
      }

      console.log(
        '✅ Resultado:',
        caught?.constructor?.name,
        '-',
        caught?.message,
      );
      console.log(
        '   save() llamado:',
        clienteRepo.save.mock.calls.length,
        'veces',
      );

      expect(caught).toBeInstanceOf(ClienteNotFoundException);
      expect(clienteRepo.save).not.toHaveBeenCalled();
    });
  });
});
