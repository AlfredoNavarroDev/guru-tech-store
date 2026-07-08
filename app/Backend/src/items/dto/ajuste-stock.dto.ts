import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, NotEquals } from 'class-validator';

// Motivos permitidos para un ajuste de stock; sirve como enum de negocio.
const MOTIVOS = ['ajuste_inventario', 'merma', 'devolucion', 'otro'] as const;

// DTO para ajustes manuales de inventario; cantidad positiva es entrada, negativa es salida.
export class AjusteStockDto {
  // Delta a aplicar sobre cantidad_actual; cero se rechaza explícitamente para evitar operaciones nulas.
  @ApiProperty({
    description: 'Positivo = entrada, negativo = salida. No puede ser 0.',
  })
  @IsInt()
  @NotEquals(0, { message: 'La cantidad no puede ser 0' })
  cantidad: number;

  @ApiProperty({ enum: MOTIVOS })
  @IsIn(MOTIVOS)
  motivo: string;

  // Texto libre opcional para detallar el motivo del ajuste (p.ej. descripción de la merma).
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string;
}
