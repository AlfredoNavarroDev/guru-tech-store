import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// DTO de filtros para el listado de ítems; extiende PaginationDto para heredar page y limit.
export class QueryItemsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['producto', 'repuesto'] })
  @IsOptional()
  @IsIn(['producto', 'repuesto'])
  tipo?: 'producto' | 'repuesto';

  // Filtro de nombre con búsqueda parcial (ILIKE en el servicio).
  @ApiPropertyOptional({ example: 'cable' })
  @IsOptional()
  @IsString()
  nombre?: string;

  // Filtro de SKU con búsqueda parcial (ILIKE en el servicio).
  @ApiPropertyOptional({ example: 'PRD-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 3, description: 'FK → Marcas.id_marca' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_marca?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoria_id?: number;

  // Cuando es true, restringe los resultados a ítems con stock > 0 en la sede del usuario.
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  // Transform necesario porque los query params llegan como string desde la URL.
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  con_stock?: boolean;
}
