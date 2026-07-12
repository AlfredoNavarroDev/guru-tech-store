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

// DTO para crear empleado. El formato del documento se valida adicionalmente en el servicio.
export class CreateEmpleadoDto {
  @ApiProperty({
    example: 'DNI',
    description: "Tipo de documento: 'DNI', 'CE', 'pasaporte'",
  })
  @IsString()
  @IsIn(['DNI', 'CE', 'pasaporte'])
  tipo_documento: string;

  // Único a nivel global (no por sede) — validado en EmpleadosService.validateDocumentoUnico.
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

  // El servicio verifica que el rol exista antes de persistir.
  @ApiProperty({ example: 3, description: 'ID del rol (FK → Roles)' })
  @IsInt()
  @IsPositive()
  id_rol: number;

  // Contraseña en texto plano; el servicio la hashea con bcrypt antes de guardar.
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

  // Si no se envía, el servicio asigna 'semanal' por defecto.
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

  // Solo usado por propietario para asignar sede al empleado. Admin siempre usa su propia sede.
  @ApiPropertyOptional({ example: 1, description: 'Sede destino (solo propietario)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  id_sede?: number;
}
