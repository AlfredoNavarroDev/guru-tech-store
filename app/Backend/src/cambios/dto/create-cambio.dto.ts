import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Motivos de cambio permitidos por el sistema de negocio.
const MOTIVOS_CAMBIO = ['defecto', 'garantia', 'otro'] as const;

// DTO para registrar un cambio de producto; valida stock, pertenencia y cantidades antes de persistir.
export class CreateCambioDto {
  // ID de la venta original desde la que el cliente devuelve el producto.
  @ApiProperty({ example: 1042 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_venta_origen: number;

  // Garantía asociada; solo se proporciona cuando el motivo es 'garantia'.
  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_garantia?: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_item_devuelto: number;

  // No puede exceder la cantidad comprada en la venta de origen.
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

  // Valor asignado al ítem devuelto para calcular la diferencia.
  @ApiProperty({ example: 2200.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio_devuelto: number;

  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_item_entregado: number;

  // Valor del ítem que el cliente recibe; puede ser igual o superior al devuelto.
  @ApiProperty({ example: 2350.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio_entregado: number;

  // Diferencia entre precio_entregado y precio_devuelto que el cliente debe abonar; 0 si no hay.
  @ApiProperty({ example: 150.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  diferencia_cobrada: number;

  // Requerido solo si diferencia_cobrada > 0.
  @ApiPropertyOptional({ example: 'efectivo' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  metodo_pago_dif?: string;

  @ApiPropertyOptional({ example: 'TXN-123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_transaccion?: string;

  // El motivo debe ser uno de los valores definidos en MOTIVOS_CAMBIO.
  @ApiProperty({ enum: MOTIVOS_CAMBIO, example: 'defecto' })
  @IsString()
  @IsNotEmpty()
  @IsIn(MOTIVOS_CAMBIO)
  @MaxLength(50)
  motivo: string;

  @ApiPropertyOptional({ example: 'Pantalla con línea horizontal' })
  @IsOptional()
  @IsString()
  detalle?: string;
}
