import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class CompraNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'COMPRA_NOT_FOUND',
      `Compra ${id} no encontrada`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DetalleCompraNotFoundException extends AppException {
  constructor(compraId: number, itemId: number) {
    super(
      'DETALLE_COMPRA_NOT_FOUND',
      `Item ${itemId} no encontrado en compra ${compraId}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class StockInsuficienteCompraException extends AppException {
  constructor(message: string) {
    super('COMPRA_STOCK_INSUFICIENTE', message, HttpStatus.CONFLICT);
  }
}

export class SedeDeshabilitadaException extends AppException {
  constructor(message: string) {
    super('SEDE_DESHABILITADA', message, HttpStatus.CONFLICT);
  }
}
