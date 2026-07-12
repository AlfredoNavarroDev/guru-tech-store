import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// DTO para reclamar una garantía de reparación. Todos los campos son opcionales:
// si se omiten, el servicio hereda los datos del equipo de la reparación original.
export class CreateReclamoGarantiaDto {
  // Sobrescribe la marca del equipo original si el cliente trae un dispositivo distinto.
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

  // Objeto JSONB libre para registrar el estado físico del equipo en recepción.
  @ApiPropertyOptional({
    example: { pantalla: 'rota', bateria: 'ok' },
    description: 'Checklist de estado físico del equipo (JSONB libre)',
  })
  @IsOptional()
  @IsObject()
  checklist_estado?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Vuelve a fallar la pantalla' })
  @IsOptional()
  @IsString()
  diagnostico_tecnico?: string;

  @ApiProperty({ enum: ['diagnostico', 'reparacion'], example: 'reparacion' })
  @IsIn(['diagnostico', 'reparacion'])
  tipo_accion: 'diagnostico' | 'reparacion';

  @ApiPropertyOptional({
    example: '2026-07-05',
    description: 'Fecha estimada de entrega (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fecha_estimada debe tener formato YYYY-MM-DD',
  })
  fecha_estimada?: string;
}
