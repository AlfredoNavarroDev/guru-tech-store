import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({
    example: 'DNI',
    description: "Tipo: 'DNI' | 'CE' | 'pasaporte'",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['DNI', 'CE', 'pasaporte'])
  tipo_documento: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
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

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  es_extranjero?: boolean;
}
