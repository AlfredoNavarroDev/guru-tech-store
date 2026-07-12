import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ILike } from 'typeorm';
import { ClientesService } from './clientes.service';
import {
  ClienteNotFoundException,
  ClienteDuplicadoException,
} from '../common/exceptions';
import { Cliente } from './entities/cliente.entity';
import { ClienteView } from './entities/cliente-view.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('ClientesService', () => {
  let service: ClientesService;
  let clienteRepo: ReturnType<typeof createMockRepo>;
  let clienteViewRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    clienteRepo = createMockRepo();
    clienteViewRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: getRepositoryToken(Cliente), useValue: clienteRepo },
        { provide: getRepositoryToken(ClienteView), useValue: clienteViewRepo },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns all without filters', async () => {
      const rows = [{ id_cliente: 1, nombre_completo: 'Ana Lopez' }];
      clienteViewRepo.find.mockResolvedValue(rows);

      const result = await service.findAll({});
      expect(result).toEqual(rows);
      expect(clienteViewRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { nombre_completo: 'ASC' },
      });
    });

    it('filters by nombre with ILIKE', async () => {
      clienteViewRepo.find.mockResolvedValue([]);
      await service.findAll({ nombre: 'Ana' });

      expect(clienteViewRepo.find).toHaveBeenCalledWith({
        where: { nombre_completo: ILike('%Ana%') },
        order: { nombre_completo: 'ASC' },
      });
    });

    it('filters by nro_documento', async () => {
      clienteViewRepo.find.mockResolvedValue([]);
      await service.findAll({ nro_documento: '12345678' });

      expect(clienteViewRepo.find).toHaveBeenCalledWith({
        where: { nro_documento: ILike('%12345678%') },
        order: { nombre_completo: 'ASC' },
      });
    });

    it('filters by nombre and nro_documento combined', async () => {
      clienteViewRepo.find.mockResolvedValue([]);
      await service.findAll({ nombre: 'Ana', nro_documento: '12345678' });

      expect(clienteViewRepo.find).toHaveBeenCalledWith({
        where: {
          nombre_completo: ILike('%Ana%'),
          nro_documento: ILike('%12345678%'),
        },
        order: { nombre_completo: 'ASC' },
      });
    });

    it('search uses OR across nombre and nro_documento', async () => {
      clienteViewRepo.find.mockResolvedValue([]);
      await service.findAll({ search: 'Ana' });

      expect(clienteViewRepo.find).toHaveBeenCalledWith({
        where: [
          { nombre_completo: ILike('%Ana%') },
          { nro_documento: ILike('%Ana%') },
        ],
        order: { nombre_completo: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('returns cliente by id from view', async () => {
      const row = { id_cliente: 1, nombre_completo: 'Ana Lopez' };
      clienteViewRepo.findOne.mockResolvedValue(row);

      const result = await service.findOne(1);

      expect(result).toEqual(row);
      expect(clienteViewRepo.findOne).toHaveBeenCalledWith({
        where: { id_cliente: 1 },
      });
    });

    it('throws ClienteNotFoundException when not found', async () => {
      clienteViewRepo.findOne.mockResolvedValue(null);

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

    it('creates client and returns saved entity', async () => {
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

    it('checks uniqueness before creating', async () => {
      clienteRepo.findOne.mockResolvedValue(null);
      clienteRepo.create.mockReturnValue({});
      clienteRepo.save.mockResolvedValue({});

      await service.create(dto);

      expect(clienteRepo.findOne).toHaveBeenCalledWith({
        where: {
          tipo_documento: dto.tipo_documento,
          nro_documento: dto.nro_documento,
        },
      });
    });

    it('throws ClienteDuplicadoException on duplicate', async () => {
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
    it('updates and returns patched entity', async () => {
      const existing: Partial<Cliente> = {
        id_cliente: 1,
        nombre_completo: 'Old Name',
      };
      clienteRepo.findOne.mockResolvedValue(existing);
      clienteRepo.save.mockResolvedValue({
        ...existing,
        nombre_completo: 'New Name',
      });

      const result = await service.update(1, { nombre_completo: 'New Name' });

      expect(result.nombre_completo).toBe('New Name');
    });

    it('throws ClienteNotFoundException when not found', async () => {
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
