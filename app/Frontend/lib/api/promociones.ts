import { authRequest } from './client';

export interface Promocion {
  id_promocion: number;
  nombre: string;
  id_sede: number | null;
  sede_nombre: string | null;
  id_item_afectado: number | null;
  item_nombre: string | null;
  id_categoria_afectada: number | null;
  nombre_categoria: string | null;
  valor_descuento: number;
  tipo_descuento: 'porcentaje' | 'monto_fijo';
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dia_semana: number | null;
  estado: 'activa' | 'pausada' | 'vencida' | 'cancelada';
  created_at: string;
  created_by: number | null;
  creado_por_nombre: string | null;
  created_by_rol: string | null;
}

export interface CreatePromocionInput {
  nombre: string;
  id_sede?: number | null;
  id_item_afectado?: number;
  id_categoria_afectada?: number;
  valor_descuento: number;
  tipo_descuento: 'porcentaje' | 'monto_fijo';
  fecha_inicio?: string;
  fecha_fin?: string;
  dia_semana?: number;
}

export async function getPromociones(): Promise<Promocion[]> {
  return authRequest('promociones');
}

export async function createPromocion(data: CreatePromocionInput): Promise<{ id_promocion: number }> {
  return authRequest('promociones', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePromocion(
  id: number,
  data: { estado?: string; valor_descuento?: number; fecha_inicio?: string | null; fecha_fin?: string | null },
): Promise<void> {
  return authRequest(`promociones/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deletePromocion(id: number): Promise<void> {
  return authRequest(`promociones/${id}`, { method: 'DELETE' });
}
