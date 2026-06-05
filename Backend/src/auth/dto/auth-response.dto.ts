import { ApiProperty } from '@nestjs/swagger';

/**
 * @purpose Respuesta unificada de login y refresh.
 * Incluye tokens + datos de sesión → frontend no necesita llamada extra.
 */
export class AuthResponseDto {
  // Vida corta (JWT_EXPIRES_IN). Se envía en Authorization: Bearer <token>.
  @ApiProperty({ description: 'Token JWT de acceso' })
  access_token: string;

  // Vida larga (REFRESH_EXPIRES_IN, default 30d). Solo para /auth/refresh.
  @ApiProperty({ description: 'Refresh token para renovar el access token' })
  refresh_token: string;

  @ApiProperty({ description: 'Nombre del empleado' })
  nombre: string;

  // Ej: ['vendedor']. Frontend los usa para menú; guards los leen del JWT.
  @ApiProperty({ description: 'Roles del empleado' })
  roles: string[];

  // ID numérico de sede para filtrado multi-sede.
  @ApiProperty({ description: 'ID de la sede del empleado' })
  id_sede: number;

  // Nombre legible para UI.
  @ApiProperty({ description: 'Nombre de la sede del empleado' })
  sede: string;
}
