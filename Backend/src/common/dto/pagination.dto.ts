import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * @purpose DTO reutilizable para paginación page-based.
 * @Type → convierte query params string a número antes de validar.
 * @Max(100) → protege contra peticiones que carguen miles de registros.
 */
export class PaginationDto {
  @ApiPropertyOptional({ example: 1, description: 'Página (inicia en 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Registros por página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

/** Envelope estándar para cualquier listado paginado. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
