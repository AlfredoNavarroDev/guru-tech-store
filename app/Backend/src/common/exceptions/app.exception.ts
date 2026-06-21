import { HttpException, HttpStatus } from '@nestjs/common';

/** Clase base para excepciones de dominio con errorCode semántico. */
export class AppException extends HttpException {
  /** Código legible por máquinas (ej: 'AUTH_INVALID_CREDENTIALS'). */
  readonly errorCode: string;

  constructor(errorCode: string, message: string, status: HttpStatus) {
    super({ statusCode: status, errorCode, message }, status);
    this.errorCode = errorCode;
  }
}
