import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class GarantiaNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'GARANTIA_NOT_FOUND',
      `Garantía ${id} no encontrada`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class GarantiaYaExisteException extends AppException {
  constructor(idReparacion: number) {
    super(
      'GARANTIA_YA_EXISTE',
      `Ya existe una garantía activa para la reparación ${idReparacion}`,
      HttpStatus.CONFLICT,
    );
  }
}
