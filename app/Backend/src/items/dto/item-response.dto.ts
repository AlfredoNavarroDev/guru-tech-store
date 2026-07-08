import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO de respuesta que devuelve la API para cada ítem; refleja la forma de la fila SQL ya normalizada.
export class ItemResponseDto {
  @ApiProperty() id_item: number;
  @ApiProperty({ enum: ['producto', 'repuesto'] }) tipo: string;
  @ApiProperty() sku: string;
  @ApiProperty() nombre: string;
  // Nullable porque el ítem puede no tener marca asociada.
  @ApiPropertyOptional() id_marca: number | null;
  @ApiPropertyOptional() marca: string | null;
  @ApiPropertyOptional() modelo: string | null;
  // Solo presente en repuestos; null en productos.
  @ApiPropertyOptional() calidad: string | null;
  @ApiProperty() precio_compra_actual: number;
  @ApiProperty() precio_venta_actual: number;
  // Array de nombres de categorías; vacío en repuestos sin categoría.
  @ApiProperty({ type: [String] }) categorias: string[];
  @ApiPropertyOptional({ type: String, nullable: true }) imagen_url:
    | string
    | null;
  @ApiProperty() created_at: Date;
  @ApiPropertyOptional() updated_at: Date | null;
  // Stock disponible en la sede del usuario autenticado; 0 si no hay inventario registrado.
  @ApiProperty() stock_disponible: number;
}
