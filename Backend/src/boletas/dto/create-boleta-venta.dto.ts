import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

/**
 * @purpose DTO para emitir boleta. Total se calcula en servidor;
 * este campo es confirmatorio. Min(0) rechaza montos negativos.
 */
export class CreateBoletaVentaDto {
  /** @Type → convierte string de form-data a número. */
  @ApiProperty({ example: 300.0, description: 'Monto final de la venta' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total: number;
}
