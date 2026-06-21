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

export class QueryItemsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['producto', 'repuesto'] })
  @IsOptional()
  @IsIn(['producto', 'repuesto'])
  tipo?: 'producto' | 'repuesto';

  @ApiPropertyOptional({ example: 'cable' })
  @IsOptional()
  @IsString()
  nombre?: string;

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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  con_stock?: boolean;
}
