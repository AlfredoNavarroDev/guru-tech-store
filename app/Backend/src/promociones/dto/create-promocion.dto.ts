import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePromocionDto {
  @ApiProperty({ example: 'Promo verano' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_sede?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_item_afectado?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_categoria_afectada?: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor_descuento: number;

  @ApiProperty({ enum: ['porcentaje', 'monto_fijo'] })
  @IsIn(['porcentaje', 'monto_fijo'])
  tipo_descuento: 'porcentaje' | 'monto_fijo';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fecha_inicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fecha_fin?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dia_semana?: number;
}
