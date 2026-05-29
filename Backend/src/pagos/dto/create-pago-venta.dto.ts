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

export class CreatePagoVentaDto {
  @ApiProperty({
    example: 'efectivo',
    enum: ['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin', 'otro'],
  })
  @IsIn(['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin', 'otro'])
  metodo_pago: string;

  @ApiProperty({ example: 150.0, description: 'Monto del pago (> 0)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiPropertyOptional({
    example: 'OP-123456',
    description: 'Voucher o nro de operación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia_transaccion?: string;
}
