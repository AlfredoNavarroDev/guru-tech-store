import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpdateEstadoReparacionDto {
  @ApiProperty({
    example: 3,
    description: 'ID del nuevo estado de la reparación',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_estado: number;

  @ApiPropertyOptional({ example: 'Pantalla reemplazada, batería OK' })
  @IsOptional()
  @IsString()
  diagnostico_tecnico?: string;

  @ApiPropertyOptional({
    example: 280.0,
    description: 'Actualiza la cotización si cambió durante el diagnóstico',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monto_cotizado?: number;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Actualiza la fecha estimada de entrega (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha_estimada debe tener formato YYYY-MM-DD',
  })
  fecha_estimada?: string;
}
