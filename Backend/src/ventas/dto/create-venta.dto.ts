import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateDetalleVentaDto } from './create-detalle-venta.dto';

export class CreateVentaDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'ID del cliente; null = venta anónima',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_cliente?: number;

  @ApiProperty({ type: [CreateDetalleVentaDto], description: 'Mínimo 1 item' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleVentaDto)
  items: CreateDetalleVentaDto[];

  @ApiPropertyOptional({ example: 10.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto_descuento?: number;

  @ApiPropertyOptional({
    example: 'porcentaje',
    enum: ['porcentaje', 'monto_fijo'],
  })
  @IsOptional()
  @IsIn(['porcentaje', 'monto_fijo'])
  tipo_descuento?: 'porcentaje' | 'monto_fijo';

  @ApiPropertyOptional({ example: 'Descuento por volumen' })
  @IsOptional()
  @IsString()
  justificacion_descuento?: string;
}
