import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 404 — Garantía no encontrada. */
export class GarantiaNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'GARANTIA_NOT_FOUND',
      `Garantía ${id} no encontrada`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — La reparación ya tiene una garantía activa, no se puede crear otra. */
export class GarantiaYaExisteException extends AppException {
  constructor(idReparacion: number) {
    super(
      'GARANTIA_YA_EXISTE',
      `Ya existe una garantía activa para la reparación ${idReparacion}`,
      HttpStatus.CONFLICT,
    );
  }
}

/** 409 — Solo se puede reclamar una garantía que esté en estado activo. */
export class GarantiaNoActivaException extends AppException {
  constructor(id: number) {
    super(
      'GARANTIA_NO_ACTIVA',
      `Garantía ${id} no está activa, no se puede reclamar`,
      HttpStatus.CONFLICT,
    );
  }
}

/** 400 — El reclamo como servicio técnico exige que la garantía sea de tipo reparación. */
export class GarantiaTipoInvalidoException extends AppException {
  constructor(id: number) {
    super(
      'GARANTIA_TIPO_INVALIDO',
      `Garantía ${id} no es de reparación, no se puede reclamar como servicio técnico`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
