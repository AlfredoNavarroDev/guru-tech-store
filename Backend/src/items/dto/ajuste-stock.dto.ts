import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, NotEquals } from 'class-validator';

const MOTIVOS = [
  'ajuste_inventario',
  'merma',
  'devolucion',
  'otro',
] as const;

export class AjusteStockDto {
  @ApiProperty({ description: 'Positivo = entrada, negativo = salida. No puede ser 0.' })
  @IsInt()
  @NotEquals(0, { message: 'La cantidad no puede ser 0' })
  cantidad: number;

  @ApiProperty({ enum: MOTIVOS })
  @IsIn(MOTIVOS)
  motivo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string;
}
