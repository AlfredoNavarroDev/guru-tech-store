import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class AddRepuestoReparacionDto {
  @ApiProperty({
    example: 12,
    description: 'ID del item (tipo=repuesto) a consumir',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_item: number;

  @ApiProperty({
    example: 1,
    description: 'Cantidad a consumir del inventario (> 0)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({
    example: 45.0,
    description: 'Precio cobrado al cliente por el repuesto (>= 0)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_cobrado: number;

  @ApiProperty({
    example: 30.0,
    description: 'Costo unitario para cálculo de margen',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costo_unitario_momento: number;
}
