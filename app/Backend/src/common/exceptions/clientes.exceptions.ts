import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 404 — Cliente no encontrado. */
export class ClienteNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'CLIENTE_NOT_FOUND',
      `Cliente ${id} no encontrado`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 422 — Extranjero no puede usar DNI como tipo de documento. */
export class ClienteDocumentoInvalidoException extends AppException {
  constructor() {
    super(
      'CLIENTE_DOCUMENTO_INVALIDO',
      'Un cliente extranjero no puede tener DNI como tipo de documento',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/** 409 — Documento duplicado. */
export class ClienteDuplicadoException extends AppException {
  constructor(tipoDoc: string, nroDoc: string) {
    super(
      'CLIENTE_DUPLICADO',
      `Ya existe un cliente con ${tipoDoc} ${nroDoc}`,
      HttpStatus.CONFLICT,
    );
  }
}
