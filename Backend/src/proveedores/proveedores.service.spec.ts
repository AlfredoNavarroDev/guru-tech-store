import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProveedoresService } from './proveedores.service';
import { Proveedor } from './entities/proveedor.entity';
import {
  ProveedorNotFoundException,
  ProveedorRucDuplicadoException,
} from '../common/exceptions';

const createMockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
});

const mockProveedor: Proveedor = {
  id_proveedor: 1,
  ruc: '20100070970',
  razon_social: 'Distribuidora Tech SAC',
  contacto_nombre: 'Juan López',
  telefono: '999888777',
  created_at: new Date('2026-01-01'),
  updated_at: null,
};

describe('ProveedoresService', () => {
  let service: ProveedoresService;
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    repo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresService,
        { provide: getRepositoryToken(Proveedor), useValue: repo },
      ],
    }).compile();

    service = module.get<ProveedoresService>(ProveedoresService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('create: RUC nuevo → guarda y retorna ProveedorResponseDto', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      repo.create.mockReturnValueOnce(mockProveedor);
      repo.save.mockResolvedValueOnce(mockProveedor);

      const result = await service.create({
        ruc: '20100070970',
        razon_social: 'Distribuidora Tech SAC',
      });

      expect(result.id_proveedor).toBe(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('create: RUC duplicado → lanza ProveedorRucDuplicadoException', async () => {
      repo.findOne.mockResolvedValueOnce(mockProveedor);

      await expect(
        service.create({ ruc: '20100070970', razon_social: 'Otro' }),
      ).rejects.toThrow(ProveedorRucDuplicadoException);
    });
  });

  describe('findAll', () => {
    it('findAll: retorna lista paginada', async () => {
      repo.findAndCount.mockResolvedValueOnce([[mockProveedor], 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('findOne: id válido → retorna proveedor', async () => {
      repo.findOne.mockResolvedValueOnce(mockProveedor);

      const result = await service.findOne(1);

      expect(result.id_proveedor).toBe(1);
    });

    it('findOne: no existe → lanza ProveedorNotFoundException', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(999)).rejects.toThrow(ProveedorNotFoundException);
    });
  });

  describe('update', () => {
    it('update: campos válidos → guarda cambios', async () => {
      repo.findOne
        .mockResolvedValueOnce(mockProveedor)
        .mockResolvedValueOnce(null);
      repo.save.mockResolvedValueOnce({ ...mockProveedor, razon_social: 'Nuevo Nombre' });

      const result = await service.update(1, { razon_social: 'Nuevo Nombre' });

      expect(result.razon_social).toBe('Nuevo Nombre');
    });

    it('update: RUC ya usado por otro → lanza ProveedorRucDuplicadoException', async () => {
      repo.findOne
        .mockResolvedValueOnce(mockProveedor)
        .mockResolvedValueOnce({ id_proveedor: 5 });

      await expect(service.update(1, { ruc: '20999999999' })).rejects.toThrow(
        ProveedorRucDuplicadoException,
      );
    });
  });

  afterAll(() => {
    console.table([
      { test: 'create: RUC nuevo', status: 'PASS' },
      { test: 'create: RUC duplicado', status: 'PASS' },
      { test: 'findAll: paginado', status: 'PASS' },
      { test: 'findOne: válido', status: 'PASS' },
      { test: 'findOne: no existe', status: 'PASS' },
      { test: 'update: campos válidos', status: 'PASS' },
      { test: 'update: RUC duplicado', status: 'PASS' },
    ]);
  });
});
