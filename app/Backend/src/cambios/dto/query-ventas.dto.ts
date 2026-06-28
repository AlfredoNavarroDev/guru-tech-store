import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QueryVentasDto {
  @ApiPropertyOptional({ example: '2026-06-23' })
  @IsOptional()
  @IsDateString()
  fecha?: string;
}
