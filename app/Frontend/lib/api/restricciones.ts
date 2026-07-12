import { authRequest } from './client';

export interface ItemRestriccion {
  id_item: number;
  nombre: string;
  es_no_cambiable: boolean;
  max_dias_garantia: number | null;
}

export interface CategoriaRestriccion {
  id_categoria: number;
  nombre_categoria: string;
  es_no_cambiable: boolean;
  max_dias_garantia: number | null;
}

export interface RestriccionesData {
  items: ItemRestriccion[];
  categorias: CategoriaRestriccion[];
}

export async function getRestricciones(): Promise<RestriccionesData> {
  return authRequest('restricciones');
}

export async function upsertItemRestriccion(
  id_item: number,
  data: { es_no_cambiable: boolean; max_dias_garantia: number | null },
): Promise<void> {
  return authRequest(`restricciones/items/${id_item}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function upsertCategoriaRestriccion(
  id_categoria: number,
  data: { es_no_cambiable: boolean; max_dias_garantia: number | null },
): Promise<void> {
  return authRequest(`restricciones/categorias/${id_categoria}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
