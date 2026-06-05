import { ApiProperty } from '@nestjs/swagger';

// Respuesta unificada de login y refresh. Incluye tokens + datos de sesión.
export class AuthResponseDto {
  // Token JWT de acceso (vida corta).
  @ApiProperty({ description: 'Token JWT de acceso' })
  access_token: string;

  // Refresh token para renovar el access token (vida larga).
  @ApiProperty({ description: 'Refresh token para renovar el access token' })
  refresh_token: string;

  @ApiProperty({ description: 'Nombre del empleado' })
  nombre: string;

  // Roles para que el frontend renderice menú; los guards los leen del JWT.
  @ApiProperty({ description: 'Roles del empleado' })
  roles: string[];

  // ID numérico de sede para filtrado multi-sede.
  @ApiProperty({ description: 'ID de la sede del empleado' })
  id_sede: number;

  // Nombre legible de la sede para UI.
  @ApiProperty({ description: 'Nombre de la sede del empleado' })
  sede: string;
}
