import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { RestriccionesService } from './restricciones.service';

describe('RestriccionesService', () => {
  let service: RestriccionesService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        RestriccionesService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(RestriccionesService);
  });

  describe('resolveItemRestriction', () => {
    it('returns item-level restriction when it exists', async () => {
      dataSource.query.mockResolvedValueOnce([
        { es_no_cambiable: true, max_dias_garantia: 30 },
      ]);
      const result = await service.resolveItemRestriction(1);
      expect(result).toEqual({ es_no_cambiable: true, max_dias_garantia: 30 });
      expect(dataSource.query).toHaveBeenCalledTimes(1);
    });

    it('falls back to category restriction and picks most restrictive', async () => {
      dataSource.query
        .mockResolvedValueOnce([]) // no item restriction
        .mockResolvedValueOnce([
          { es_no_cambiable: false, max_dias_garantia: 60 },
          { es_no_cambiable: true, max_dias_garantia: 45 },
        ]);
      const result = await service.resolveItemRestriction(1);
      expect(result).toEqual({ es_no_cambiable: true, max_dias_garantia: 45 });
    });

    it('returns null when no restriction exists', async () => {
      dataSource.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      const result = await service.resolveItemRestriction(1);
      expect(result).toBeNull();
    });
  });
});
