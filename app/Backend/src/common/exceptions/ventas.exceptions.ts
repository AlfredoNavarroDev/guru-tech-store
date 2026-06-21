import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 404 — Venta no encontrada. */
export class VentaNotFoundException extends AppException {
  constructor(id: number) {
    super('VENTA_NOT_FOUND', `Venta ${id} no encontrada`, HttpStatus.NOT_FOUND);
  }
}

/** 409 — Stock insuficiente para el ítem solicitado. */
export class StockInsuficienteException extends AppException {
  constructor(message: string) {
    super('STOCK_INSUFICIENTE', message, HttpStatus.CONFLICT);
  }
}

/** 400 — Importe no coincide con precio_unitario × cantidad. */
export class ImporteInvalidoException extends AppException {
  constructor(idItem: number, expected: number, received: number) {
    super(
      'VENTA_IMPORTE_INVALIDO',
      `Importe inválido para id_item ${idItem}: esperado ${expected}, recibido ${received}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** 400 — Descuento > 0 requiere justificación obligatoria. */
export class DescuentoSinJustificacionException extends AppException {
  constructor() {
    super(
      'VENTA_DESCUENTO_SIN_JUSTIFICACION',
      'justificacion_descuento es obligatorio cuando monto_descuento > 0',
      HttpStatus.BAD_REQUEST,
    );
  }
}
