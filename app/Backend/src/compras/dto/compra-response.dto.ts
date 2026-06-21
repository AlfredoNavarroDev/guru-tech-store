import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DetalleCompraResponseDto {
  @ApiProperty() id_detalle_compra: number;
  @ApiProperty() id_item: number;
  @ApiPropertyOptional() item_nombre: string | null;
  @ApiPropertyOptional() sku: string | null;
  @ApiProperty() cantidad_comprada: number;
  @ApiProperty() costo_unidad: number;
  @ApiProperty() precio_venta_sugerido: number;
}

export class CompraResponseDto {
  @ApiProperty() id_compra: number;
  @ApiProperty() id_empleado_refiller: number;
  @ApiPropertyOptional() empleado: string | null;
  @ApiProperty() id_sede_destino: number;
  @ApiProperty() id_proveedor: number;
  @ApiPropertyOptional() proveedor: string | null;
  @ApiProperty() fecha_compra: Date;
  @ApiProperty() costo_total: number;
  @ApiPropertyOptional({ type: [DetalleCompraResponseDto] })
  detalles?: DetalleCompraResponseDto[];
}
