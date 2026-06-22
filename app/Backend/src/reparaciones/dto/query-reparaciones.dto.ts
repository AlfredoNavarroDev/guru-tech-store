import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryReparacionesDto extends PaginationDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_cliente?: number;

  @ApiPropertyOptional({ example: 2, description: 'Filtrar por id_estado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_estado?: number;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Fecha ingreso desde (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Fecha ingreso hasta (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @ApiPropertyOptional({ example: 'Samsung' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ example: 'Galaxy S21' })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({
    example: '012345678901234',
    description: 'IMEI exacto o parcial',
  })
  @IsOptional()
  @IsString()
  imei?: string;
}
