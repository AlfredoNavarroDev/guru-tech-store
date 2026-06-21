import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryStockDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['producto', 'repuesto'] })
  @IsOptional()
  @IsIn(['producto', 'repuesto'])
  tipo?: 'producto' | 'repuesto';

  @ApiPropertyOptional({ example: 3, description: 'FK → Marcas.id_marca' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_marca?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'true → solo ítems con cantidad_actual <= stock_minimo',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  requiere_reposicion?: boolean;
}
