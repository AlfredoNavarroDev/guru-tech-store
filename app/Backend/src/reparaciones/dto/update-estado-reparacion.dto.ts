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

// DTO para avanzar el estado de una reparación (HU-16). Solo acepta saltos de un paso a la vez.
export class UpdateEstadoReparacionDto {
  // Nuevo estado destino; el servicio valida que el salto de orden sea permitido.
  @ApiProperty({
    example: 3,
    description: 'ID del nuevo estado de la reparación',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_estado: number;

  // Permite actualizar el diagnóstico al mismo tiempo que se avanza el estado.
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

  // Solo se aplica al marcar como 'entregado'; si es 0 no se crea registro de garantía.
  @ApiPropertyOptional({
    example: 30,
    description: 'Días de garantía al marcar como entregado (por defecto 30)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dias_garantia?: number;
}
