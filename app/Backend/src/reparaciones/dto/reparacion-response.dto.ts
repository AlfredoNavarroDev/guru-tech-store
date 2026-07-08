import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// DTO de respuesta para un repuesto consumido; incluye nombre e SKU del ítem para mostrar al técnico.
export class RepuestoUsadoResponseDto {
  @ApiProperty() id_repuesto_u: number;
  @ApiProperty() id_item: number;
  @ApiPropertyOptional() item_nombre: string | null;
  @ApiPropertyOptional() sku: string | null;
  @ApiProperty() cantidad: number;
  @ApiProperty() precio_cobrado: number;
  @ApiProperty() costo_unitario_momento: number;
}

// DTO de respuesta para un pago asociado a una reparación (adelanto o pago final).
export class PagoReparacionResponseDto {
  @ApiProperty() id_pago: number;
  @ApiProperty() metodo_pago: string;
  @ApiProperty() monto: number;
  // Indica si es un adelanto parcial (true) o el pago final (false).
  @ApiProperty() es_adelanto: boolean;
  @ApiProperty() fecha_pago: Date;
}

// DTO de respuesta completa de una reparación. En el detalle incluye repuestos, pagos y totales calculados.
export class ReparacionResponseDto {
  @ApiProperty() id_reparacion: number;
  @ApiProperty() fecha_ingreso: Date;
  @ApiProperty() id_cliente: number;
  // Nombre del cliente resuelto desde la vista v_reparacion_lista.
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
  // Nombre legible del estado resuelto desde `estados_reparacion`.
  @ApiPropertyOptional() estado: string | null;
  @ApiPropertyOptional() fecha_estimada: string | null;
  @ApiPropertyOptional() fecha_terminado: Date | null;
  @ApiPropertyOptional() fecha_entrega_cliente: Date | null;
  // Solo mano de obra; no incluye el coste de repuestos.
  @ApiPropertyOptional() monto_cotizado: number | null;
  @ApiProperty() monto_descuento: number;
  @ApiPropertyOptional() tipo_descuento: string | null;
  @ApiPropertyOptional() justificacion_descuento: string | null;
  @ApiPropertyOptional() tipo_servicio:
    | 'software'
    | 'hardware'
    | 'mixto'
    | null;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date | null;
  // Solo presente en la respuesta de detalle (findOne); ausente en el listado paginado.
  @ApiPropertyOptional({ type: [RepuestoUsadoResponseDto] })
  repuestos?: RepuestoUsadoResponseDto[];
  @ApiPropertyOptional({ type: [PagoReparacionResponseDto] })
  pagos?: PagoReparacionResponseDto[];
  // Suma de todos los pagos registrados (adelantos + pago final).
  @ApiPropertyOptional() total_pagado?: number;
  // monto_total - total_pagado; nunca negativo.
  @ApiPropertyOptional() saldo_pendiente?: number;
  // monto_cotizado + coste repuestos aplicando el descuento configurado.
  @ApiPropertyOptional() monto_total?: number;
  // Array de fotos subidas a R2 ordenadas por etapa del servicio técnico.
  @ApiPropertyOptional()
  fotos: { url: string; etapa: string; created_at: string }[] | null;
  // No nulo si esta reparación fue creada como reclamo de garantía de otra anterior.
  @ApiPropertyOptional() id_garantia_reclamada: number | null;
}
