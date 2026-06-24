export interface GarantiaResponseDto {
  id_garantia: number;
  tipo: 'venta' | 'reparacion';
  id_venta: number | null;
  id_reparacion: number | null;
  referencia_label: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'vencida' | 'invalidada';
  motivo_invalidacion: string | null;
  created_at: string;
}
