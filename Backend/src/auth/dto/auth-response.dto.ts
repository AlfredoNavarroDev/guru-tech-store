import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'Token JWT' })
  access_token: string;

  @ApiProperty({ description: 'Nombre del empleado' })
  nombre: string;

  @ApiProperty({ description: 'Roles del empleado' })
  roles: string[];

  @ApiProperty({ description: 'ID de la sede del empleado' })
  id_sede: number;
}
