import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Extiende PaginationDto con filtros específicos del stock (todos opcionales).
export class QueryStockDto extends PaginationDto {
  // Sede a consultar. Solo la usa el propietario (sin sede fija); el abastecedor consulta su propia sede.
  @ApiPropertyOptional({
    example: 1,
    description: 'FK → Sedes.id_sede (solo propietario)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_sede?: number;

  // Permite filtrar entre ítems de tipo 'producto' o 'repuesto'.
  @ApiPropertyOptional({ enum: ['producto', 'repuesto'] })
  @IsOptional()
  @IsIn(['producto', 'repuesto'])
  tipo?: 'producto' | 'repuesto';

  // FK hacia la tabla Marcas para acotar el stock por fabricante.
  @ApiPropertyOptional({ example: 3, description: 'FK → Marcas.id_marca' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_marca?: number;

  // Cuando es true, devuelve solo los ítems cuya cantidad_actual <= stock_minimo.
  @ApiPropertyOptional({
    example: true,
    description: 'true → solo ítems con cantidad_actual <= stock_minimo',
  })
  @IsOptional()
  // Convierte explícitamente los strings 'true'/'false' a booleano porque vienen del query string.
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  requiere_reposicion?: boolean;
}
