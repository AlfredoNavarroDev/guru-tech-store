import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class AddItemCompraDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  id_item: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  cantidad_comprada: number;

  @ApiProperty({ example: 120.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo_unidad: number;

  @ApiProperty({ example: 220.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_venta_sugerido: number;
}
