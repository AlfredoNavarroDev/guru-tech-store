import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCambioDto {
  @ApiProperty({ example: 1042 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id_venta_origen: number;

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

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

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

  @ApiProperty({ example: 2350.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio_entregado: number;

  @ApiProperty({ example: 150.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  diferencia_cobrada: number;

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

  @ApiProperty({ example: 'Defecto de fábrica' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  motivo: string;

  @ApiPropertyOptional({ example: 'Pantalla con línea horizontal' })
  @IsOptional()
  @IsString()
  detalle?: string;
}
