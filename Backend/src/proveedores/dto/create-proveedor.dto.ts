import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty({
    example: '20100070970',
    description: 'RUC peruano (11 dígitos) o extranjero (max 15)',
  })
  @IsString()
  @IsNotEmpty()
  @Length(8, 15)
  @Matches(/^\d+$/, { message: 'ruc debe contener solo dígitos' })
  ruc: string;

  @ApiProperty({ example: 'Distribuidora Tech SAC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  razon_social: string;

  @ApiPropertyOptional({ example: 'Juan López' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto_nombre?: string;

  @ApiPropertyOptional({ example: '999888777' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;
}
