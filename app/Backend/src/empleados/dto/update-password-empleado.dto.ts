import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdatePasswordEmpleadoDto {
  @ApiProperty({
    example: 'NuevaContraseña123',
    description: 'Nueva contraseña (mínimo 8 caracteres)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  nueva_password: string;
}
