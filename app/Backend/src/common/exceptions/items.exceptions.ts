import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/** 404 — Ítem de catálogo no encontrado. */
export class ItemNotFoundException extends AppException {
  constructor(id: number) {
    super('ITEM_NOT_FOUND', `Item ${id} no encontrado`, HttpStatus.NOT_FOUND);
  }
}

/** 409 — El SKU ya está asignado a otro ítem del catálogo. */
export class ItemSkuDuplicadoException extends AppException {
  constructor(sku: string) {
    super(
      'ITEM_SKU_DUPLICADO',
      `SKU '${sku}' ya está en uso`,
      HttpStatus.CONFLICT,
    );
  }
}

/** 400 — Todo producto debe pertenecer al menos a una categoría. */
export class ItemCategoriasRequeridaException extends AppException {
  constructor() {
    super(
      'ITEM_CATEGORIAS_REQUERIDA',
      'Un producto debe tener al menos una categoría',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** 400 — El campo calidad no aplica a ítems que no sean repuestos. */
export class ItemCalidadSoloRepuestoException extends AppException {
  constructor() {
    super(
      'ITEM_CALIDAD_SOLO_REPUESTO',
      'El campo calidad solo aplica a ítems de tipo repuesto',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** 409 — El ajuste de inventario dejaría el stock en negativo. */
export class ItemStockInsuficienteException extends AppException {
  constructor() {
    super(
      'ITEM_STOCK_INSUFICIENTE',
      'Stock insuficiente: el ajuste dejaría el inventario en negativo',
      HttpStatus.CONFLICT,
    );
  }
}

/** 404 — El ítem existe en catálogo pero no tiene registro de inventario en la sede indicada. */
export class ItemInventarioNotFoundException extends AppException {
  constructor(id: number, idSede: number) {
    super(
      'ITEM_INVENTARIO_NOT_FOUND',
      `Ítem ${id} no tiene inventario registrado en la sede ${idSede}`,
      HttpStatus.NOT_FOUND,
    );
  }
}
