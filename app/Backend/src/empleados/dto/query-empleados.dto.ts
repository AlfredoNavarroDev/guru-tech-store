import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Filtros de búsqueda de empleados. Extiende PaginationDto (page + limit).
export class QueryEmpleadosDto extends PaginationDto {
  @ApiPropertyOptional({ example: 3, description: 'Filtrar por id_rol' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_rol?: number;

  // El @Transform convierte el string 'true'/'false' que llega por query string a booleano.
  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar por estado activo/inactivo',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo?: boolean;
}
