import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '12345678',
    description: 'Número de documento del empleado',
  })
  @IsString()
  @IsNotEmpty()
  nro_documento: string;

  @ApiProperty({
    example: 'password123',
    description: 'Contraseña del empleado',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
