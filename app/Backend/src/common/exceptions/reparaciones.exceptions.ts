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

export class EstadoSaltoInvalidoException extends AppException {
  constructor(actual: string, destino: string) {
    super(
      'ESTADO_SALTO_INVALIDO',
      `No se puede saltar de "${actual}" a "${destino}". Los estados deben avanzar en orden`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class PagoExcedeSaldoException extends AppException {
  constructor(monto: number, saldo: number) {
    super(
      'PAGO_EXCEDE_SALDO',
      `El monto S/${monto.toFixed(2)} excede el saldo pendiente de S/${saldo.toFixed(2)}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class PagoSinPrecioException extends AppException {
  constructor(id: number) {
    super(
      'PAGO_SIN_PRECIO',
      `Reparación ${id} no tiene precio definido. Defina el precio antes de registrar pagos`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
