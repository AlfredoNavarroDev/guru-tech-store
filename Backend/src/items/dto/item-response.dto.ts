import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ItemResponseDto {
  @ApiProperty() id_item: number;
  @ApiProperty({ enum: ['producto', 'repuesto'] }) tipo: string;
  @ApiProperty() sku: string;
  @ApiProperty() nombre: string;
  @ApiPropertyOptional() id_marca: number | null;
  @ApiPropertyOptional() marca: string | null;
  @ApiPropertyOptional() modelo: string | null;
  @ApiPropertyOptional() calidad: string | null;
  @ApiPropertyOptional() especificaciones: Record<string, unknown> | null;
  @ApiProperty() precio_compra_actual: number;
  @ApiProperty() precio_venta_actual: number;
  @ApiProperty({ type: [String] }) categorias: string[];
  @ApiProperty() created_at: Date;
  @ApiPropertyOptional() updated_at: Date | null;
}
