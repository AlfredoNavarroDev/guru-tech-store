import { authRequest } from './client';

export type TipoDocumento = 'DNI' | 'CE' | 'pasaporte';
export type EstadoEmpleado = 'activo' | 'inactivo' | 'suspendido';
export type FrecuenciaPago = 'semanal' | 'quincenal' | 'mensual';

export interface Empleado {
  id_empleado: number;
  id_sede: number;
  id_rol: number;
  rol_nombre?: string;
  tipo_documento: TipoDocumento;
  nro_documento: string;
  nombre_completo: string;
  telefono: string | null;
  estado: EstadoEmpleado | string;
  sueldo_soles: number | null;
  frecuencia_pago: FrecuenciaPago;
  es_extranjero: boolean;
  direccion_completa: string | null;
  created_at: string;
}

export interface PaginatedEmpleados {
  items: Empleado[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryEmpleados {
  page?: number;
  limit?: number;
  id_rol?: number;
  activo?: boolean;
}

export interface CreateEmpleadoInput {
  tipo_documento: TipoDocumento;
  nro_documento: string;
  nombre_completo: string;
  id_rol: number;
  password: string;
  telefono?: string;
  sueldo_soles?: number;
  frecuencia_pago?: FrecuenciaPago;
  es_extranjero?: boolean;
  direccion_completa?: string;
}

export type UpdateEmpleadoInput = Partial<
  Omit<CreateEmpleadoInput, 'password' | 'tipo_documento' | 'nro_documento'>
>;

export const ROLES = [
  { id: 2, label: 'Administrador' },
  { id: 3, label: 'Vendedor' },
  { id: 4, label: 'Tecnico' },
  { id: 5, label: 'Abastecedor' },
] as const;

export const FRECUENCIAS_PAGO: { value: FrecuenciaPago; label: string }[] = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
];

export function frecuenciaPagoLabel(value: FrecuenciaPago | string): string {
  return FRECUENCIAS_PAGO.find((item) => item.value === value)?.label ?? value;
}

export function roleName(id: number, fallback?: string): string {
  return ROLES.find((role) => role.id === id)?.label ?? fallback ?? `Rol ${id}`;
}

export function buildEmpleadosQuery(query?: QueryEmpleados): string {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.id_rol) params.set('id_rol', String(query.id_rol));
  if (query?.activo !== undefined) params.set('activo', String(query.activo));
  const qs = params.toString();
  return `empleados${qs ? `?${qs}` : ''}`;
}

export function getEmpleados(query?: QueryEmpleados): Promise<PaginatedEmpleados> {
  return authRequest<PaginatedEmpleados>(buildEmpleadosQuery(query));
}

export function createEmpleado(dto: CreateEmpleadoInput): Promise<Empleado> {
  return authRequest<Empleado>('empleados', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function updateEmpleado(id: number, dto: UpdateEmpleadoInput): Promise<Empleado> {
  return authRequest<Empleado>(`empleados/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export function updateEmpleadoPassword(id: number, nueva_password: string): Promise<void> {
  return authRequest<void>(`empleados/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ nueva_password }),
  });
}

export function updateEmpleadoEstado(id: number, activo: boolean): Promise<void> {
  return authRequest<void>(`empleados/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
}
