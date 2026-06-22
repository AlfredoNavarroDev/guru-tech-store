import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReparacionDto {
  @ApiProperty({ example: 5, description: 'ID del cliente dueño del equipo' })
  @Type(() => Number)
  @IsInt()
  id_cliente: number;

  @ApiPropertyOptional({ example: 'Samsung' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  marca?: string;

  @ApiPropertyOptional({ example: 'Galaxy S21' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  modelo?: string;

  @ApiPropertyOptional({
    example: '012345678901234',
    description: 'IMEI de 15 dígitos',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{15}$/, {
    message: 'imei debe tener exactamente 15 dígitos numéricos',
  })
  imei?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el equipo enciende al ingresar',
  })
  @IsOptional()
  @IsBoolean()
  esta_encendido?: boolean;

  @ApiPropertyOptional({
    example: { pantalla: 'rota', bateria: 'ok', camara: 'funcional' },
    description: 'Checklist de estado físico del equipo (JSONB libre)',
  })
  @IsOptional()
  @IsObject()
  checklist_estado?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Pantalla sin touch, batería hinchada' })
  @IsOptional()
  @IsString()
  diagnostico_tecnico?: string;

  @ApiPropertyOptional({
    example: 250.0,
    description: 'Cotización estimada (>= 0)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto_cotizado?: number;

  @ApiPropertyOptional({ example: 0, description: 'Descuento aplicado (>= 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto_descuento?: number;

  @ApiPropertyOptional({ enum: ['porcentaje', 'monto_fijo'] })
  @IsOptional()
  @IsIn(['porcentaje', 'monto_fijo'])
  tipo_descuento?: 'porcentaje' | 'monto_fijo';

  @ApiPropertyOptional({
    example: '2026-06-28',
    description: 'Fecha estimada de entrega (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha_estimada debe tener formato YYYY-MM-DD',
  })
  fecha_estimada?: string;

  @ApiPropertyOptional({ example: 'Descuento cliente frecuente' })
  @IsOptional()
  @IsString()
  justificacion_descuento?: string;
}
