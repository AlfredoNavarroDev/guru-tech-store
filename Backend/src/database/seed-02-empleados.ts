/** Seed 02 — Empleados y roles. Contraseña: Vendedor123! (bcrypt cost=10). Depende de seed-01. */

import { QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export async function seedEmpleados(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 02] Empleados...');

  // Hash generado en runtime para consistencia con AuthService
  console.log('  Generando hash bcrypt (cost=10) para "Vendedor123!"...');
  const hash = await bcrypt.hash('Vendedor123!', 10);
  console.log('  Hash generado: ' + hash.substring(0, 29) + '...');

  // Propietario sin sede, admin de sede y vendedores uno por sede.
  console.log('  Insertando Empleados...');
  await qr.query(
    `INSERT INTO Empleados
      (id_empleado, id_sede, tipo_documento, nro_documento, nombre_completo,
       telefono, sueldo_soles, frecuencia_pago, estado, password_hash, id_rol) VALUES
     (1,  NULL, 'DNI', '10001001', 'Roberto Sánchez Torres',  '987-001-001', 5000.00, 'mensual', 'activo', $1, 1),
     (2,  1,    'DNI', '10003001', 'Luis Mamani Quispe',       '987-003-001',  900.00, 'semanal', 'activo', $1, 3),
     (3,  2,    'DNI', '10003002', 'Carla Flores Medina',      '987-003-002',  900.00, 'semanal', 'activo', $1, 3),
     (4,  1,    'DNI', '10003099', 'Jorge Palma Soto (inactivo)', '987-003-099', 900.00, 'semanal', 'suspendido', $1, 3),
     (5,  1,    'DNI', '10002001', 'Admin Sprint 1',            '987-002-001', 1200.00, 'quincenal', 'activo', $1, 2)`,
    [hash],
  );
  console.log('  OK - 5 empleados (ids 1-5)');
  console.log('    id=1  propietario       DNI 10001001  sin sede');
  console.log('    id=2  vendedor    DNI 10003001  sede 1');
  console.log('    id=3  vendedor    DNI 10003002  sede 2');
  console.log(
    '    id=4  suspendido  DNI 10003099  sede 1 → login debe retornar 401',
  );
  console.log('    id=5  administrador DNI 10002001  sede 1');

  console.log('  OK - roles asignados directamente en empleados');

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Empleados', 'id_empleado'), 5)`,
  );

  console.log('[Seed 02] Completado.');
  console.log('  Login para probar:');
  console.log(
    '    POST /auth/login { "nro_documento": "10003001", "password": "Vendedor123!" }',
  );
  console.log(
    '    POST /auth/login { "nro_documento": "10003002", "password": "Vendedor123!" }\n',
  );
  console.log(
    '    POST /auth/login { "nro_documento": "10002001", "password": "Vendedor123!" }\n',
  );
}
