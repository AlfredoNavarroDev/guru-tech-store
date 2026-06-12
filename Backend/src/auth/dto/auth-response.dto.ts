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

  // Rol del empleado para que el frontend renderice menú.
  @ApiProperty({ description: 'Rol del empleado' })
  rol: string;

  // ID numérico de sede para filtrado multi-sede. Null para propietario (sin sede fija).
  @ApiProperty({ description: 'ID de la sede del empleado', nullable: true })
  id_sede: number | null;

  // Nombre legible de la sede para UI.
  @ApiProperty({ description: 'Nombre de la sede del empleado' })
  sede: string;
}
