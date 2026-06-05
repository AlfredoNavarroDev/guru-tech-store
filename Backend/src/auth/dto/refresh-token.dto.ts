import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @purpose DTO compartido por /auth/refresh y /auth/logout.
 * Ambos endpoints reciben el mismo campo → un solo DTO evita duplicación.
 */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
