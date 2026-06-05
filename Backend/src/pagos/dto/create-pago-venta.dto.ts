import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * @purpose DTO para registrar pago en venta. id_venta desde ruta, no body.
 * Métodos de pago sincronizados con CHECK constraint de BD.
 */
export class CreatePagoVentaDto {
  /** Métodos sincronizados con CHECK constraint de BD. */
  @ApiProperty({
    example: 'efectivo',
    enum: ['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin', 'otro'],
  })
  @IsIn(['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin', 'otro'])
  metodo_pago: string;

  /** Min(0.01) → no permite pagos de S/0.00. BD también tiene CHECK (monto > 0). */
  @ApiProperty({ example: 150.0, description: 'Monto del pago (> 0)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto: number;

  /** Voucher o nro de operación. Obligatorio para métodos electrónicos (Sprint 2). */
  @ApiPropertyOptional({
    example: 'OP-123456',
    description: 'Voucher o nro de operación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_transaccion?: string;
}
