import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CreateBoletaVentaDto {
  @ApiProperty({ example: 300.0, description: 'Monto final de la venta' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total: number;
}
