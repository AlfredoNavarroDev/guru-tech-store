import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class ItemNotFoundException extends AppException {
  constructor(id: number) {
    super('ITEM_NOT_FOUND', `Item ${id} no encontrado`, HttpStatus.NOT_FOUND);
  }
}

export class ItemSkuDuplicadoException extends AppException {
  constructor(sku: string) {
    super(
      'ITEM_SKU_DUPLICADO',
      `SKU '${sku}' ya está en uso`,
      HttpStatus.CONFLICT,
    );
  }
}

export class ItemCategoriasRequeridaException extends AppException {
  constructor() {
    super(
      'ITEM_CATEGORIAS_REQUERIDA',
      'Un producto debe tener al menos una categoría',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ItemCalidadSoloRepuestoException extends AppException {
  constructor() {
    super(
      'ITEM_CALIDAD_SOLO_REPUESTO',
      'El campo calidad solo aplica a ítems de tipo repuesto',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ItemStockInsuficienteException extends AppException {
  constructor() {
    super(
      'ITEM_STOCK_INSUFICIENTE',
      'Stock insuficiente: el ajuste dejaría el inventario en negativo',
      HttpStatus.CONFLICT,
    );
  }
}

export class ItemInventarioNotFoundException extends AppException {
  constructor(id: number, idSede: number) {
    super(
      'ITEM_INVENTARIO_NOT_FOUND',
      `Ítem ${id} no tiene inventario registrado en la sede ${idSede}`,
      HttpStatus.NOT_FOUND,
    );
  }
}
