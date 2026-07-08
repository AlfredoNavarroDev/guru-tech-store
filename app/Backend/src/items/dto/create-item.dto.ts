import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// DTO de creación de ítem; valida todos los campos obligatorios y opcionales antes de llegar al servicio.
export class CreateItemDto {
  // Determina si el artículo se comercializa como producto o se usa en reparaciones como repuesto.
  @ApiProperty({ example: 'producto', enum: ['producto', 'repuesto'] })
  @IsIn(['producto', 'repuesto'])
  tipo: 'producto' | 'repuesto';

  @ApiProperty({ example: 'PRD-010' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 'Cable USB-C 3m' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @ApiPropertyOptional({ example: 3, description: 'FK → Marcas.id_marca' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_marca?: number;

  @ApiPropertyOptional({ example: 'Galaxy S24' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  // Solo válido cuando tipo='repuesto'; el servicio rechaza calidad en ítems de tipo producto.
  @ApiPropertyOptional({
    example: 'original',
    description: 'Solo para tipo=repuesto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  calidad?: string;

  @ApiProperty({ example: 10.0 })
  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_compra_actual: number;

  @ApiProperty({ example: 25.0 })
  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio_venta_actual: number;

  // IDs de categorías a asociar; obligatorio con al menos un elemento cuando tipo='producto'.
  @ApiPropertyOptional({
    example: [1, 4],
    description: 'IDs de categorías. Obligatorio (≥1) si tipo=producto.',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  categoria_ids?: number[];

  @ApiPropertyOptional({
    example: 5,
    description: 'Stock mínimo para alertas de reposición. Default 0.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock_minimo?: number;

  // Unidades con las que arranca el ítem en inventario_sedes al crearlo; si se omite se asume 0.
  @ApiPropertyOptional({
    example: 10,
    description: 'Stock inicial al crear el ítem en la sede. Default 0.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad_inicial?: number;
}
