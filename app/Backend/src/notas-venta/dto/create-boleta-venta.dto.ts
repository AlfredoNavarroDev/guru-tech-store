import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

// DTO para emitir nota de venta. El total se calcula en servidor; este campo es confirmatorio.
export class CreateBoletaVentaDto {
  // @Type convierte string de form-data a número.
  @ApiProperty({ example: 300.0, description: 'Monto final de la venta' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total: number;
}
