import { ChatbotService } from './chatbot.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '../common/types';

const makeUser = (rol: string, id_sede: number | null = 1): JwtPayload => ({
  sub: 1,
  id_sede,
  rol,
  nombre: 'Test User',
});

describe('ChatbotService', () => {
  let service: ChatbotService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest
      .fn()
      .mockResolvedValue([{ activas: '0', total: '0', critico: '0' }]);
    service = new ChatbotService(
      { query: mockQuery } as unknown as DataSource,
      {
        get: jest.fn().mockReturnValue('fake-key'),
      } as unknown as ConfigService,
    );
  });

  describe('getSuggestions', () => {
    it('returns empty array when id_sede is null', async () => {
      const result = await service.getSuggestions(makeUser('vendedor', null));
      expect(result).toEqual([]);
    });

    it('returns non-empty array for vendedor', async () => {
      const result = await service.getSuggestions(makeUser('vendedor'));
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((s) => expect(typeof s).toBe('string'));
    });

    it('returns non-empty array for tecnico', async () => {
      const result = await service.getSuggestions(makeUser('tecnico'));
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns non-empty array for abastecedor', async () => {
      const result = await service.getSuggestions(makeUser('abastecedor'));
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns non-empty array for admin / unknown rol', async () => {
      const result = await service.getSuggestions(makeUser('admin'));
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns fallback suggestions when query throws', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));
      const result = await service.getSuggestions(makeUser('vendedor'));
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
