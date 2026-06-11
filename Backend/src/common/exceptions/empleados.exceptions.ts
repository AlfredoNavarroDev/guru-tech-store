import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class EmpleadoNotFoundException extends AppException {
  constructor(id: number) {
    super('EMPLEADO_NOT_FOUND', `Empleado con id ${id} no encontrado`, HttpStatus.NOT_FOUND);
  }
}

export class EmpleadoDocumentoDuplicadoException extends AppException {
  constructor() {
    super('EMPLEADO_DOCUMENTO_DUPLICADO', 'Ya existe un empleado con ese tipo y número de documento', HttpStatus.CONFLICT);
  }
}

export class EmpleadoSelfDeactivateException extends AppException {
  constructor() {
    super('EMPLEADO_SELF_DEACTIVATE', 'No puedes desactivar tu propia cuenta', HttpStatus.FORBIDDEN);
  }
}

export class RolNotFoundException extends AppException {
  constructor(id: number) {
    super('ROL_NOT_FOUND', `Rol con id ${id} no encontrado`, HttpStatus.BAD_REQUEST);
  }
}
