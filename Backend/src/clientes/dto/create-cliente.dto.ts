import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** @purpose DTO para crear cliente. tipo_documento: DNI | CE | pasaporte. */
export class CreateClienteDto {
  @ApiProperty({
    example: 'DNI',
    description: "Tipo: 'DNI' | 'CE' | 'pasaporte'",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['DNI', 'CE', 'pasaporte'])
  tipo_documento: string;

  @ApiProperty({ example: '12345678', description: 'DNI: 8 dígitos · CE: 12 caracteres · Pasaporte: 9 caracteres' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @ValidateIf((o) => o.tipo_documento === 'DNI')
  @Length(8, 8, { message: 'El DNI debe tener exactamente 8 caracteres' })
  @ValidateIf((o) => o.tipo_documento === 'CE')
  @Length(12, 12, { message: 'El CE debe tener exactamente 12 caracteres' })
  @ValidateIf((o) => o.tipo_documento === 'pasaporte')
  @Length(9, 9, { message: 'El pasaporte debe tener exactamente 9 caracteres' })
  nro_documento: string;

  @ApiProperty({ example: 'Juan Pérez García' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre_completo: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ example: 'Av. Lima 123, Miraflores' })
  @IsOptional()
  @IsString()
  direccion_completa?: string;
}
