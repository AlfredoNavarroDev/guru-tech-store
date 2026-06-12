import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmpleadoDto {
  @ApiProperty({
    example: 'DNI',
    description: "Tipo de documento: 'DNI', 'CE', 'pasaporte'",
  })
  @IsString()
  @IsIn(['DNI', 'CE', 'pasaporte'])
  tipo_documento: string;

  @ApiProperty({
    example: '12345678',
    description: 'Número de documento (único por tipo)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nro_documento: string;

  @ApiProperty({ example: 'Juan Pérez García', description: 'Nombre completo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre_completo: string;

  @ApiProperty({ example: 3, description: 'ID del rol (FK → Roles)' })
  @IsInt()
  @IsPositive()
  id_rol: number;

  @ApiProperty({
    example: '12345678',
    description: 'Contraseña inicial. Por defecto usa el número de documento.',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({
    example: '987654321',
    description: 'Teléfono de contacto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({
    example: 1200.0,
    description: 'Sueldo en soles',
  })
  @IsOptional()
  @IsPositive()
  sueldo_soles?: number;

  @ApiPropertyOptional({
    example: 'quincenal',
    description: "Frecuencia de pago: 'semanal', 'quincenal' o 'mensual'",
  })
  @IsOptional()
  @IsString()
  @IsIn(['semanal', 'quincenal', 'mensual'])
  frecuencia_pago?: 'semanal' | 'quincenal' | 'mensual';

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si el empleado es extranjero',
  })
  @IsOptional()
  @IsBoolean()
  es_extranjero?: boolean;

  @ApiPropertyOptional({
    example: 'Av. Lima 123, Miraflores',
    description: 'Dirección completa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion_completa?: string;
}
