import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * @purpose Endpoints de autenticación: login, refresh, logout.
 * @dependencies AuthService, JwtAuthGuard, CurrentUser.
 * Errores manejados por excepciones de dominio en common/exceptions.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** HU-01: Login con nro_documento + contraseña. Retorna par de tokens + datos de sesión. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'HU-01 — Inicio de sesión' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /** HU-23: Renueva access token con refresh token (rotación de tokens). */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'HU-23 — Renovar access token con refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refresh_token);
  }

  /** HU-02: Cierra sesión revocando refresh token. Requiere JWT válido. */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'HU-02 — Cierre de sesión (revocar refresh token)' })
  logout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RefreshTokenDto,
  ): Promise<void> {
    // user.sub = id_empleado del JWT verificado → garantiza pertenencia.
    return this.authService.logout(user.sub, dto.refresh_token);
  }
}
