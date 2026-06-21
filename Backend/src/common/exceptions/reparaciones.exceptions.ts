import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class ReparacionNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'REPARACION_NOT_FOUND',
      `Reparación ${id} no encontrada`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class RepuestoUsadoNotFoundException extends AppException {
  constructor(reparacionId: number, repuestoId: number) {
    super(
      'REPUESTO_USADO_NOT_FOUND',
      `Repuesto ${repuestoId} no encontrado en reparación ${reparacionId}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class EstadoReparacionNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'ESTADO_REPARACION_NOT_FOUND',
      `Estado de reparación ${id} no existe`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ReparacionEntregadaException extends AppException {
  constructor(id: number) {
    super(
      'REPARACION_ENTREGADA',
      `Reparación ${id} ya fue entregada, no se puede modificar`,
      HttpStatus.CONFLICT,
    );
  }
}
