import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 404 — Empleado no encontrado en la base de datos. */
export class EmpleadoNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'EMPLEADO_NOT_FOUND',
      `Empleado con id ${id} no encontrado`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — Tipo y número de documento ya están asignados a otro empleado. */
export class EmpleadoDocumentoDuplicadoException extends AppException {
  constructor() {
    super(
      'EMPLEADO_DOCUMENTO_DUPLICADO',
      'Ya existe un empleado con ese tipo y número de documento',
      HttpStatus.CONFLICT,
    );
  }
}

/** 403 — Un empleado no puede desactivar su propia cuenta. */
export class EmpleadoSelfDeactivateException extends AppException {
  constructor() {
    super(
      'EMPLEADO_SELF_DEACTIVATE',
      'No puedes desactivar tu propia cuenta',
      HttpStatus.FORBIDDEN,
    );
  }
}

/** 400 — El id de rol enviado no existe en la tabla de roles. */
export class RolNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'ROL_NOT_FOUND',
      `Rol con id ${id} no encontrado`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
