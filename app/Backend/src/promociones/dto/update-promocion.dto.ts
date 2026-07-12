import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePromocionDto {
  @ApiPropertyOptional({ enum: ['activa', 'pausada', 'cancelada'] })
  @IsOptional()
  @IsIn(['activa', 'pausada', 'cancelada'])
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor_descuento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fecha_inicio?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fecha_fin?: string | null;
}
