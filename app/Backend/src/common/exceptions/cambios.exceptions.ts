import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class CambioNotFoundException extends AppException {
  constructor(id: number) {
    super('CAMBIO_NOT_FOUND', `Cambio ${id} no encontrado`, HttpStatus.NOT_FOUND);
  }
}

export class ItemNoEnVentaException extends AppException {
  constructor(idItem: number, idVenta: number) {
    super(
      'CAMBIO_ITEM_NO_EN_VENTA',
      `El ítem ${idItem} no pertenece a la venta ${idVenta}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class CantidadExcedidaException extends AppException {
  constructor(cantidad: number, maxCantidad: number) {
    super(
      'CAMBIO_CANTIDAD_EXCEDIDA',
      `Cantidad ${cantidad} excede la cantidad vendida ${maxCantidad}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
