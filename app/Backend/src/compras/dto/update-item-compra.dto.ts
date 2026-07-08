import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

// DTO para editar un ítem de compra; solo la cantidad es obligatoria, precios son opcionales.
export class UpdateItemCompraDto {
  // Nueva cantidad; el trigger de BD calcula el delta respecto al valor anterior y ajusta stock.
  @ApiProperty({
    example: 3,
    description: 'Nueva cantidad. Trigger ajusta delta en stock.',
  })
  @IsInt()
  @Min(1)
  cantidad_comprada: number;

  @ApiPropertyOptional({ example: 115.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo_unidad?: number;

  @ApiPropertyOptional({ example: 210.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_venta_sugerido?: number;
}
