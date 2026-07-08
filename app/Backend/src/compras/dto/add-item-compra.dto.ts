import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

// DTO para añadir un ítem a una compra existente con su precio de costo y precio sugerido de venta.
export class AddItemCompraDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  id_item: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  cantidad_comprada: number;

  // Precio pagado al proveedor; máximo 2 decimales.
  @ApiProperty({ example: 120.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo_unidad: number;

  // Precio de venta recomendado que el sistema puede tomar como referencia.
  @ApiProperty({ example: 220.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_venta_sugerido: number;
}
