import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// DTO de filtros para el historial paginado de reparaciones (HU-18). Extiende paginación base.
export class QueryReparacionesDto extends PaginationDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_cliente?: number;

  // Permite filtrar por un estado específico del workflow (ej. solo las que están en diagnóstico).
  @ApiPropertyOptional({ example: 2, description: 'Filtrar por id_estado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_estado?: number;

  // Rango de fechas de ingreso; fecha_hasta se amplía hasta las 23:59:59 en el servicio.
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

  // Búsqueda parcial ILIKE; útil para filtrar por fabricante sin nombre exacto.
  @ApiPropertyOptional({ example: 'Samsung' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ example: 'Galaxy S21' })
  @IsOptional()
  @IsString()
  modelo?: string;

  // Acepta IMEI parcial; la consulta usa ILIKE con wildcards a ambos lados.
  @ApiPropertyOptional({
    example: '012345678901234',
    description: 'IMEI exacto o parcial',
  })
  @IsOptional()
  @IsString()
  imei?: string;
}
