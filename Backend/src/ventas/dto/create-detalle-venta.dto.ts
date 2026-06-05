import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

// DTO de línea de ítem en venta. El servidor valida precio, costo e importe.
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

  // Precio congelado al momento de la venta para reportes históricos precisos.
  @ApiProperty({
    example: 150.0,
    description: 'Precio unitario capturado en el momento',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio_unitario_momento: number;

  // Precio sin promoción al momento. null si no había promoción.
  @ApiPropertyOptional({
    example: 200.0,
    description:
      'Precio normal (sin promo) al momento de la venta. null si no hubo promoción.',
    nullable: true,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_normal_momento?: number | null;

  // Costo congelado para cálculo de margen bruto histórico.
  @ApiProperty({
    example: 80.0,
    description: 'Costo unitario capturado en el momento',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costo_unitario_momento: number;

  // El cliente precalcula; el servidor revalida: importe ≈ precio × cantidad (±0.01).
  @ApiProperty({
    example: 300.0,
    description: 'precio_unitario_momento * cantidad',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  importe: number;
}
