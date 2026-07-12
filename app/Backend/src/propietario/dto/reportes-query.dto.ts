// app/Backend/src/propietario/dto/reportes-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportesQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por sede (null = todas)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_sede?: number;

  @ApiPropertyOptional({ description: 'Fecha inicio YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @ApiPropertyOptional({ description: 'Fecha fin YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}
