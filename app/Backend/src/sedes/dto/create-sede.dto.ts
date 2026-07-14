// app/Backend/src/sedes/dto/create-sede.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSedeDto {
  @ApiProperty({ example: 'TechStore San Isidro', description: 'Nombre de la sede' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiPropertyOptional({ example: 'Av. Javier Prado 123, San Isidro' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ example: '01-4441234' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'hora_apertura debe tener formato HH:MM' })
  hora_apertura?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'hora_cierre debe tener formato HH:MM' })
  hora_cierre?: string;
}
