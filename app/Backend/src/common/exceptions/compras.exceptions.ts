import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 404 — Orden de compra no encontrada. */
export class CompraNotFoundException extends AppException {
  constructor(id: number) {
    super(
      'COMPRA_NOT_FOUND',
      `Compra ${id} no encontrada`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 404 — Línea de detalle no existe dentro de la compra indicada. */
export class DetalleCompraNotFoundException extends AppException {
  constructor(compraId: number, itemId: number) {
    super(
      'DETALLE_COMPRA_NOT_FOUND',
      `Item ${itemId} no encontrado en compra ${compraId}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — No hay stock suficiente para descontar al anular/devolver una compra. */
export class StockInsuficienteCompraException extends AppException {
  constructor(message: string) {
    super('COMPRA_STOCK_INSUFICIENTE', message, HttpStatus.CONFLICT);
  }
}

/** 409 — Se intentó operar sobre una sede que está deshabilitada. */
export class SedeDeshabilitadaException extends AppException {
  constructor(message: string) {
    super('SEDE_DESHABILITADA', message, HttpStatus.CONFLICT);
  }
}

/** 409 — Deadlock de base de datos detectado; el cliente debe reintentar. */
export class DeadlockException extends AppException {
  constructor() {
    super(
      'DEADLOCK_DETECTADO',
      'Operación en conflicto, intente de nuevo en unos segundos',
      HttpStatus.CONFLICT,
    );
  }
}
