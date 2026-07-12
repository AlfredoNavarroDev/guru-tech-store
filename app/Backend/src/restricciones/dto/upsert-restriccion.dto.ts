import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertRestriccionDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  es_no_cambiable?: boolean;

  @ApiPropertyOptional({ example: 90, description: 'null to remove limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_dias_garantia?: number | null;
}
