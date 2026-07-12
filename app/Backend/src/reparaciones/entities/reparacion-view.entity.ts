import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_reparacion_lista' })
export class ReparacionView {
  @ViewColumn() id_reparacion: number;
  @ViewColumn() fecha_ingreso: Date;
  @ViewColumn() id_cliente: number | null;
  @ViewColumn() cliente: string | null;
  @ViewColumn() id_tecnico: number;
  @ViewColumn() tecnico: string | null;
  @ViewColumn() id_sede: number;
  @ViewColumn() marca: string | null;
  @ViewColumn() modelo: string | null;
  @ViewColumn() imei: string | null;
  @ViewColumn() esta_encendido: boolean | null;
  @ViewColumn() checklist_estado: Record<string, unknown> | null;
  @ViewColumn() diagnostico_tecnico: string | null;
  @ViewColumn() id_estado: number;
  @ViewColumn() estado: string | null;
  @ViewColumn() es_final: boolean;
  @ViewColumn() fecha_estimada: string | null;
  @ViewColumn() fecha_terminado: Date | null;
  @ViewColumn() fecha_entrega_cliente: Date | null;
  @ViewColumn() monto_cotizado: string | null;
  @ViewColumn() monto_descuento: string;
  @ViewColumn() tipo_descuento: string | null;
  @ViewColumn() justificacion_descuento: string | null;
  @ViewColumn() tipo_servicio: string | null;
  @ViewColumn() tipo_accion: string;
  @ViewColumn() repuestos_cost: string;
  @ViewColumn() created_at: Date;
  @ViewColumn() updated_at: Date | null;
  @ViewColumn() fotos: { url: string; etapa: string; created_at: string }[] | null;
  @ViewColumn() id_garantia_reclamada: number | null;
}
