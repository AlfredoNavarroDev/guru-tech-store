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

// DTO para crear venta (cabecera + detalles en un solo request). id_empleado e id_sede vienen del JWT.
export class CreateVentaDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'ID del cliente; null = venta anónima',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_cliente?: number;

  // Al menos un ítem requerido, cada uno validado anidado.
  @ApiProperty({ type: [CreateDetalleVentaDto], description: 'Mínimo 1 item' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleVentaDto)
  items: CreateDetalleVentaDto[];

  // Validación cruzada descuento-justificación se hace en VentasService.
  @ApiPropertyOptional({ example: 10.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto_descuento?: number;

  // 'porcentaje' | 'monto_fijo'. Solo se persiste; reportes lo interpretan.
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
