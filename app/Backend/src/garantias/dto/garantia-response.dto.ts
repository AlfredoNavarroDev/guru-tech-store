// Contrato de respuesta de la API para una garantía; usado en el servicio y el controlador.
export interface GarantiaResponseDto {
  id_garantia: number;
  // Discrimina si la garantía cubre una venta o una reparación.
  tipo: 'venta' | 'reparacion';
  // Exactamente uno de los dos será no-null según el tipo.
  id_venta: number | null;
  id_reparacion: number | null;
  // Etiqueta legible para el front: "Venta #3" o "Reparación #7".
  referencia_label: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'vencida' | 'invalidada';
  // Solo presente cuando estado = 'invalidada'.
  motivo_invalidacion: string | null;
  created_at: string;
}
