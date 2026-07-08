import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 404 — Proveedor no encontrado. */
export class ProveedorNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'PROVEEDOR_NOT_FOUND',
      `Proveedor ${id} no encontrado`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — El RUC ya pertenece a otro proveedor registrado. */
export class ProveedorRucDuplicadoException extends AppException {
  constructor(ruc: string) {
    super(
      'PROVEEDOR_RUC_DUPLICADO',
      `RUC '${ruc}' ya está registrado`,
      HttpStatus.CONFLICT,
    );
  }
}
