import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * @purpose Clase base para excepciones de dominio.
 * Añade errorCode semántico al HTTP status → frontend distingue causas.
 * Centraliza formato de respuesta: { statusCode, errorCode, message }.
 */
export class AppException extends HttpException {
  /** Código semántico legible por máquinas (ej: 'AUTH_INVALID_CREDENTIALS'). */
  readonly errorCode: string;

  constructor(errorCode: string, message: string, status: HttpStatus) {
    // Objeto como body → getResponse() devuelve estructura completa.
    super({ statusCode: status, errorCode, message }, status);
    this.errorCode = errorCode;
  }
}
