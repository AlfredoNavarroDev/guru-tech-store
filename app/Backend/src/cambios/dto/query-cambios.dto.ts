import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Filtros de búsqueda para el listado de cambios; hereda paginación de PaginationDto.
export class QueryCambiosDto extends PaginationDto {
  // Fecha de inicio del rango (inclusive); formato ISO 8601 YYYY-MM-DD.
  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  // Fecha de fin del rango (inclusive hasta las 23:59:59 del día indicado).
  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}
