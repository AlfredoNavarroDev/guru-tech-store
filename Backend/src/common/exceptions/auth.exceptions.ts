import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 401 — Credenciales incorrectas (nro_documento o password). */
export class InvalidCredentialsException extends AppException {
  constructor() {
    super(
      'AUTH_INVALID_CREDENTIALS',
      'Credenciales inválidas',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/** 401 — Refresh token no existe en BD, expirado o revocado. */
export class InvalidRefreshTokenException extends AppException {
  constructor() {
    super(
      'AUTH_INVALID_REFRESH_TOKEN',
      'Refresh token inválido o expirado',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
