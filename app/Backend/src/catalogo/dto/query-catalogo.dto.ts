import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

// Filtros opcionales del catálogo; se combinan en AND si se envían varios a la vez.
export class QueryCatalogoDto {
  // @Type convierte el query string de texto a número antes de validar con @IsInt.
  @ApiPropertyOptional({ description: 'Filtrar por id_categoria' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoria?: number;

  @ApiPropertyOptional({ description: 'Filtrar por id_marca' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  marca?: number;

  // Búsqueda parcial e insensible a mayúsculas aplicada con ILIKE en la query SQL.
  @ApiPropertyOptional({ description: 'Buscar por nombre (parcial)' })
  @IsOptional()
  @IsString()
  nombre?: string;

  // Cuando es true, excluye del resultado los productos sin existencias en la sede.
  @ApiPropertyOptional({
    description: 'Solo items con stock > 0',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  con_stock?: boolean;
}
