import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Parámetros de búsqueda para el listado de compras; hereda paginación de PaginationDto.
export class ComprasQueryDto extends PaginationDto {
  // Filtra resultados por nombre de proveedor usando ILIKE (búsqueda parcial case-insensitive).
  @ApiPropertyOptional({
    description: 'Filtrar por nombre de proveedor (ILIKE)',
  })
  @IsOptional()
  @IsString()
  proveedor?: string;
}
