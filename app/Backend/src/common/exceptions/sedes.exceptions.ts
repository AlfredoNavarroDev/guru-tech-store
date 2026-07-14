import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 403 — Operación bloqueada porque la sede está fuera de horario. */
export class SedeCerradaException extends AppException {
  constructor(horaApertura: string, horaCierre: string) {
    super(
      'SEDE_CERRADA',
      `La sede está cerrada. Horario de atención: ${horaApertura} – ${horaCierre}`,
      HttpStatus.FORBIDDEN,
    );
  }
}
