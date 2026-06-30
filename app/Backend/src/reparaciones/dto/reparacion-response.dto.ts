import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RepuestoUsadoResponseDto {
  @ApiProperty() id_repuesto_u: number;
  @ApiProperty() id_item: number;
  @ApiPropertyOptional() item_nombre: string | null;
  @ApiPropertyOptional() sku: string | null;
  @ApiProperty() cantidad: number;
  @ApiProperty() precio_cobrado: number;
  @ApiProperty() costo_unitario_momento: number;
}

export class PagoReparacionResponseDto {
  @ApiProperty() id_pago: number;
  @ApiProperty() metodo_pago: string;
  @ApiProperty() monto: number;
  @ApiProperty() es_adelanto: boolean;
  @ApiProperty() fecha_pago: Date;
}

export class ReparacionResponseDto {
  @ApiProperty() id_reparacion: number;
  @ApiProperty() fecha_ingreso: Date;
  @ApiProperty() id_cliente: number;
  @ApiPropertyOptional() cliente: string | null;
  @ApiProperty() id_tecnico: number;
  @ApiPropertyOptional() tecnico: string | null;
  @ApiProperty() id_sede: number;
  @ApiPropertyOptional() marca: string | null;
  @ApiPropertyOptional() modelo: string | null;
  @ApiPropertyOptional() imei: string | null;
  @ApiPropertyOptional() esta_encendido: boolean | null;
  @ApiPropertyOptional() checklist_estado: Record<string, unknown> | null;
  @ApiPropertyOptional() diagnostico_tecnico: string | null;
  @ApiProperty() id_estado: number;
  @ApiPropertyOptional() estado: string | null;
  @ApiPropertyOptional() fecha_estimada: string | null;
  @ApiPropertyOptional() fecha_terminado: Date | null;
  @ApiPropertyOptional() fecha_entrega_cliente: Date | null;
  @ApiPropertyOptional() monto_cotizado: number | null;
  @ApiProperty() monto_descuento: number;
  @ApiPropertyOptional() tipo_descuento: string | null;
  @ApiPropertyOptional() justificacion_descuento: string | null;
  @ApiPropertyOptional() tipo_servicio: 'software' | 'hardware' | 'mixto' | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date | null;
  @ApiPropertyOptional({ type: [RepuestoUsadoResponseDto] })
  repuestos?: RepuestoUsadoResponseDto[];
  @ApiPropertyOptional({ type: [PagoReparacionResponseDto] })
  pagos?: PagoReparacionResponseDto[];
  @ApiPropertyOptional() total_pagado?: number;
  @ApiPropertyOptional() saldo_pendiente?: number;
  @ApiPropertyOptional()
  fotos: { url: string; etapa: string; created_at: string }[] | null;
  @ApiPropertyOptional() id_garantia_reclamada: number | null;
}
