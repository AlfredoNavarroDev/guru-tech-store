import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateDetalleVentaDto {
  @ApiProperty({ example: 1, description: 'ID del item (producto)' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_item: number;

  @ApiProperty({ example: 2, description: 'Cantidad vendida (> 0)' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad: number;

  @ApiProperty({
    example: 150.0,
    description: 'Precio unitario capturado en el momento',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_unitario_momento: number;

  @ApiProperty({
    example: 80.0,
    description: 'Costo unitario capturado en el momento',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costo_unitario_momento: number;

  @ApiProperty({
    example: 300.0,
    description: 'precio_unitario_momento * cantidad',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  importe: number;
}
