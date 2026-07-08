import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Representa un ítem individual dentro de la respuesta de una compra.
export class DetalleCompraResponseDto {
  @ApiProperty() id_detalle_compra: number;
  @ApiProperty() id_item: number;
  // Nombre del ítem resuelto desde el catálogo; null si el ítem fue eliminado.
  @ApiPropertyOptional() item_nombre: string | null;
  @ApiPropertyOptional() sku: string | null;
  @ApiProperty() cantidad_comprada: number;
  @ApiProperty() costo_unidad: number;
  @ApiProperty() precio_venta_sugerido: number;
}

// Representa la cabecera de una compra con su coste total calculado; los ítems son opcionales.
export class CompraResponseDto {
  @ApiProperty() id_compra: number;
  @ApiProperty() id_empleado_refiller: number;
  // Nombre del empleado resuelto en la vista v_compra_cabecera; null si el empleado fue eliminado.
  @ApiPropertyOptional() empleado: string | null;
  @ApiProperty() id_sede_destino: number;
  @ApiProperty() id_proveedor: number;
  @ApiPropertyOptional() proveedor: string | null;
  @ApiProperty() fecha_compra: Date;
  // Suma de (costo_unidad × cantidad) de todos los ítems, calculada en la vista.
  @ApiProperty() costo_total: number;
  // Presente solo en la respuesta de findOne, no en el listado paginado.
  @ApiPropertyOptional({ type: [DetalleCompraResponseDto] })
  detalles?: DetalleCompraResponseDto[];
}
