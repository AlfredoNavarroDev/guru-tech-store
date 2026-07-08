import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Longitudes exactas esperadas según tipo de documento.
const DOC_EXACT: Record<string, number> = { DNI: 8, CE: 12, pasaporte: 9 };

// Validador personalizado que cruza tipo_documento y nro_documento para verificar la longitud.
@ValidatorConstraint({ name: 'documentoLength', async: false })
class DocumentoLengthConstraint implements ValidatorConstraintInterface {
  validate(nro: string, args: ValidationArguments): boolean {
    const { tipo_documento } = args.object as CreateClienteDto;
    const expected = DOC_EXACT[tipo_documento];
    // Si el tipo no está en el mapa (ya cubierto por @IsIn), no rechaza aquí.
    return expected == null || nro?.length === expected;
  }

  defaultMessage(args: ValidationArguments): string {
    const { tipo_documento } = args.object as CreateClienteDto;
    if (tipo_documento === 'DNI') return 'El DNI tiene 8 dígitos';
    if (tipo_documento === 'CE') return 'El CE tiene 12 caracteres';
    if (tipo_documento === 'pasaporte')
      return 'El pasaporte tiene 9 caracteres';
    return 'Longitud de documento inválida';
  }
}

// DTO para crear cliente. Soporta DNI, CE y pasaporte.
export class CreateClienteDto {
  @ApiProperty({
    example: 'DNI',
    description: "Tipo: 'DNI' | 'CE' | 'pasaporte'",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['DNI', 'CE', 'pasaporte'])
  tipo_documento: string;

  @ApiProperty({
    example: '12345678',
    description: 'DNI: 8 dígitos · CE: 12 caracteres · Pasaporte: 9 caracteres',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Validate(DocumentoLengthConstraint)
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
