import { ApiProperty } from '@nestjs/swagger';

export class VentaRecienteDto {
  @ApiProperty()
  id_venta: number;

  @ApiProperty({ nullable: true })
  cliente: string | null;

  @ApiProperty()
  total_venta_cabecera: number;

  @ApiProperty()
  fecha_emision: Date;
}

export class ResumenHoyDto {
  @ApiProperty()
  ventas_hoy: number;

  @ApiProperty()
  ingresos_hoy: number;

  @ApiProperty()
  clientes_hoy: number;

  @ApiProperty()
  ventas_ayer: number;

  @ApiProperty()
  ingresos_ayer: number;

  @ApiProperty()
  clientes_ayer: number;

  @ApiProperty({ type: () => [VentaRecienteDto] })
  recientes: VentaRecienteDto[];
}

/**
 * @purpose Línea de detalle en respuesta. Omite costo_unitario_momento
 * (dato interno de margen, no debe exponerse al vendedor/cliente).
 */
export class DetalleVentaResponseDto {
  @ApiProperty()
  id_detalle_v: number;

  @ApiProperty()
  id_venta: number;

  @ApiProperty()
  id_item: number;

  @ApiProperty()
  cantidad: number;

  @ApiProperty()
  precio_unitario_momento: number;

  @ApiProperty({ nullable: true })
  precio_normal_momento: number | null;

  @ApiProperty()
  importe: number;

  @ApiProperty()
  created_at: Date;
}

/**
 * @purpose Respuesta de POST /ventas. Cabecera + detalles.
 * No expone entidad TypeORM directamente → evita acoplamiento y campos internos.
 */
export class VentaResponseDto {
  @ApiProperty()
  id_venta: number;

  @ApiProperty()
  fecha_emision: Date;

  /** null = venta anónima (sin cliente registrado). */
  @ApiProperty({ nullable: true })
  id_cliente: number | null;

  @ApiProperty()
  id_empleado: number;

  @ApiProperty()
  id_sede: number;

  @ApiProperty()
  monto_descuento: number;

  /** null si la venta no tuvo descuento. */
  @ApiProperty({ nullable: true })
  tipo_descuento: string | null;

  /** null si la venta no tuvo descuento. */
  @ApiProperty({ nullable: true })
  justificacion_descuento: string | null;

  @ApiProperty()
  created_at: Date;

  /** null hasta el primer UPDATE. */
  @ApiProperty({ nullable: true })
  updated_at: Date | null;

  @ApiProperty({ type: () => [DetalleVentaResponseDto] })
  detalles: DetalleVentaResponseDto[];
}
