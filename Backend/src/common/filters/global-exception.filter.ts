import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * @purpose Filtro global: captura toda excepción no manejada.
 * HttpException → respeta su status. Otras → 500 genérico.
 * Solo loguea stack en errores 500.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  /** Logger con nombre de clase para identificar en logs. */
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // HttpException → respeta su status; otras → 500.
    const status: HttpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // getResponse() → objeto AppException, errores de validación, o string genérico.
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno del servidor';

    // Solo errores 500 llevan stack trace en logs.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    // Spread condicional: objeto → propiedades al nivel raíz; string → { message }.
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'string' ? { message } : message),
    });
  }
}
