import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RestriccionesService } from './restricciones.service';
import { ItemRestriccion } from './entities/item-restriccion.entity';
import { CategoriaRestriccion } from './entities/categoria-restriccion.entity';

const createMockQb = () => {
  const qb = {
    innerJoin: jest.fn(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  qb.innerJoin.mockReturnThis();
  return qb;
};

describe('RestriccionesService', () => {
  let service: RestriccionesService;
  let itemRestriccionRepo: { findOne: jest.Mock; upsert: jest.Mock; createQueryBuilder: jest.Mock };
  let catRestriccionRepo: { upsert: jest.Mock; createQueryBuilder: jest.Mock };
  let mockQb: ReturnType<typeof createMockQb>;

  beforeEach(async () => {
    mockQb = createMockQb();
    itemRestriccionRepo = {
      findOne: jest.fn(),
      upsert: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };
    catRestriccionRepo = {
      upsert: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };

    const module = await Test.createTestingModule({
      providers: [
        RestriccionesService,
        { provide: getRepositoryToken(ItemRestriccion), useValue: itemRestriccionRepo },
        { provide: getRepositoryToken(CategoriaRestriccion), useValue: catRestriccionRepo },
      ],
    }).compile();
    service = module.get(RestriccionesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolveItemRestriction', () => {
    it('returns item-level restriction when it exists', async () => {
      itemRestriccionRepo.findOne.mockResolvedValue({ es_no_cambiable: true, max_dias_garantia: 30 });
      const result = await service.resolveItemRestriction(1);
      expect(result).toEqual({ es_no_cambiable: true, max_dias_garantia: 30 });
      expect(catRestriccionRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('falls back to category restriction and picks most restrictive', async () => {
      itemRestriccionRepo.findOne.mockResolvedValue(null);
      mockQb.getMany.mockResolvedValue([
        { es_no_cambiable: false, max_dias_garantia: 60 },
        { es_no_cambiable: true, max_dias_garantia: 45 },
      ]);
      const result = await service.resolveItemRestriction(1);
      expect(result).toEqual({ es_no_cambiable: true, max_dias_garantia: 45 });
    });

    it('returns null when no restriction exists', async () => {
      itemRestriccionRepo.findOne.mockResolvedValue(null);
      mockQb.getMany.mockResolvedValue([]);
      const result = await service.resolveItemRestriction(1);
      expect(result).toBeNull();
    });

    it('returns null max_dias_garantia when all categories have null', async () => {
      itemRestriccionRepo.findOne.mockResolvedValue(null);
      mockQb.getMany.mockResolvedValue([
        { es_no_cambiable: false, max_dias_garantia: null },
      ]);
      const result = await service.resolveItemRestriction(1);
      expect(result?.max_dias_garantia).toBeNull();
    });
  });
});
