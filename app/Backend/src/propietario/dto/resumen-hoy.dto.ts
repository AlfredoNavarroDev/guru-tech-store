import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ResumenHoyDto {
  @Expose()
  @ApiProperty({ example: 18 })
  ventas_hoy: number;

  @Expose()
  @ApiProperty({ example: 3450.0 })
  ingresos_ventas_hoy: number;

  @Expose()
  @ApiProperty({ example: 780.0 })
  ingresos_reparaciones_hoy: number;

  @Expose()
  @ApiProperty({ example: 4230.0 })
  ingresos_total_hoy: number;

  @Expose()
  @ApiProperty({ example: 48600.0 })
  ingresos_mes: number;

  @Expose()
  @ApiProperty({ example: 43200.0 })
  ingresos_mes_ant: number;

  @Expose()
  @ApiProperty({ example: 191.67 })
  ticket_promedio: number;

  @Expose()
  @ApiProperty({ example: 23 })
  transacciones_hoy: number;

  @Expose()
  @ApiProperty({ example: 3580.0 })
  ingresos_total_ayer: number;

  @Expose()
  @ApiProperty({ example: 15 })
  ventas_ayer: number;
}
