import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * @purpose Filtros de catálogo (todos opcionales, acumulativos AND).
 * con_stock → @Transform convierte 'true' string a boolean.
 */
export class QueryCatalogoDto {
  /** @Type → convierte query string a número. */
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

  /** Búsqueda parcial por nombre (ILIKE en SQL). */
  @ApiPropertyOptional({ description: 'Buscar por nombre (parcial)' })
  @IsOptional()
  @IsString()
  nombre?: string;

  /** true → solo productos con stock_disponible > 0. */
  @ApiPropertyOptional({
    description: 'Solo items con stock > 0',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  con_stock?: boolean;
}
