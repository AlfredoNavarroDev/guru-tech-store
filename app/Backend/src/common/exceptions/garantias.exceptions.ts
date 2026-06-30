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

export class GarantiaNoActivaException extends AppException {
  constructor(id: number) {
    super(
      'GARANTIA_NO_ACTIVA',
      `Garantía ${id} no está activa, no se puede reclamar`,
      HttpStatus.CONFLICT,
    );
  }
}

export class GarantiaTipoInvalidoException extends AppException {
  constructor(id: number) {
    super(
      'GARANTIA_TIPO_INVALIDO',
      `Garantía ${id} no es de reparación, no se puede reclamar como servicio técnico`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
