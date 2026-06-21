import {
  buildEmpleadosQuery,
  type CreateEmpleadoInput,
  type Empleado,
  type QueryEmpleados,
  type UpdateEmpleadoInput,
} from './empleados';

const empleado: Empleado = {
  id_empleado: 5,
  id_sede: 1,
  id_rol: 2,
  tipo_documento: 'DNI',
  nro_documento: '10002001',
  nombre_completo: 'Admin Sprint 1',
  telefono: '987002001',
  estado: 'activo',
  sueldo_soles: 1200,
  frecuencia_pago: 'mensual',
  es_extranjero: false,
  direccion_completa: null,
  created_at: '2026-06-11T00:00:00.000Z',
};

const createPayload: CreateEmpleadoInput = {
  tipo_documento: 'DNI',
  nro_documento: '12345678',
  nombre_completo: 'Nuevo Vendedor',
  id_rol: 3,
  password: 'Vendedor123!',
  sueldo_soles: 900,
  frecuencia_pago: 'semanal',
};

const updatePayload: UpdateEmpleadoInput = {
  nombre_completo: 'Vendedor Editado',
  id_rol: 3,
  sueldo_soles: 1800,
  frecuencia_pago: 'quincenal',
};

const query: QueryEmpleados = { page: 2, limit: 10, activo: true, id_rol: 3 };

empleado satisfies Empleado;
createPayload satisfies CreateEmpleadoInput;
updatePayload satisfies UpdateEmpleadoInput;
query satisfies QueryEmpleados;
buildEmpleadosQuery(query) satisfies string;
