import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// DTO para registrar pago en reparación. Soporta adelantos parciales.
export class CreatePagoReparacionDto {
  @ApiProperty({
    example: 'efectivo',
    enum: ['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin', 'otro'],
  })
  @IsIn(['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin', 'otro'])
  metodo_pago: string;

  @ApiProperty({
    example: 100.0,
    description: 'Monto del pago (mínimo S/1.00)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  monto: number;

  @ApiPropertyOptional({
    example: true,
    description: 'true = adelanto parcial; false = pago final',
  })
  @IsOptional()
  @IsBoolean()
  es_adelanto?: boolean;

  @ApiPropertyOptional({ example: 'OP-789012' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_transaccion?: string;
}
