import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class QueryCatalogoDto {
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

  @ApiPropertyOptional({ description: 'Buscar por nombre (parcial)' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Solo items con stock > 0',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  con_stock?: boolean;
}
