/** Seed 02 — Empleados y roles. Contraseña: Vendedor123! (bcrypt cost=10). Depende de seed-01. */

import { QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export async function seedEmpleados(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 02] Empleados...');

  // Hash generado en runtime para consistencia con AuthService
  console.log('  Generando hash bcrypt (cost=10) para "Vendedor123!"...');
  const hash = await bcrypt.hash('Vendedor123!', 10);
  console.log('  Hash generado: ' + hash.substring(0, 29) + '...');

  // Un empleado por rol por sede + propietario global.
  console.log('  Insertando Empleados...');
  await qr.query(
    `INSERT INTO Empleados
      (id_empleado, id_sede, tipo_documento, nro_documento, nombre_completo,
       telefono, sueldo_soles, frecuencia_pago, estado, password_hash, id_rol) VALUES
     (1,  NULL, 'DNI', '10001001', 'Roberto Sánchez Torres',       '987-001-001', 5000.00, 'mensual',   'activo',    $1, 1),
     (2,  1,    'DNI', '10002001', 'Admin Lima Centro',             '987-002-001', 1800.00, 'quincenal', 'activo',    $1, 2),
     (3,  2,    'DNI', '10002002', 'Admin Miraflores',              '987-002-002', 1800.00, 'quincenal', 'activo',    $1, 2),
     (4,  1,    'DNI', '10003001', 'Luis Mamani Quispe',            '987-003-001',  900.00, 'semanal',   'activo',    $1, 3),
     (5,  2,    'DNI', '10003002', 'Carla Flores Medina',           '987-003-002',  900.00, 'semanal',   'activo',    $1, 3),
     (6,  1,    'DNI', '10003099', 'Jorge Palma Soto',              '987-003-099',  900.00, 'semanal',   'suspendido',$1, 3),
     (7,  1,    'DNI', '10004001', 'Miguel Ángel Castro',           '987-004-001', 1000.00, 'semanal',   'activo',    $1, 4),
     (8,  2,    'DNI', '10004002', 'Ana Torres Vega',               '987-004-002', 1000.00, 'semanal',   'activo',    $1, 4),
     (9,  1,    'DNI', '10005001', 'Carlos Mendoza Díaz',           '987-005-001', 1100.00, 'quincenal', 'activo',    $1, 5),
     (10, 2,    'DNI', '10005002', 'Patricia Rojas Lima',           '987-005-002', 1100.00, 'quincenal', 'activo',    $1, 5)`,
    [hash],
  );
  console.log('  OK - 10 empleados (ids 1-10)');
  console.log('    id=1   propietario    DNI 10001001  sin sede');
  console.log('    id=2   admin          DNI 10002001  sede 1');
  console.log('    id=3   admin          DNI 10002002  sede 2');
  console.log('    id=4   vendedor       DNI 10003001  sede 1');
  console.log('    id=5   vendedor       DNI 10003002  sede 2');
  console.log('    id=6   suspendido     DNI 10003099  sede 1 → 401');
  console.log('    id=7   técnico        DNI 10004001  sede 1');
  console.log('    id=8   técnico        DNI 10004002  sede 2');
  console.log('    id=9   abastecedor    DNI 10005001  sede 1');
  console.log('    id=10  abastecedor    DNI 10005002  sede 2');

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Empleados', 'id_empleado'), 10)`,
  );

  console.log('[Seed 02] Completado.');
  console.log('  Login para probar (password: "Vendedor123!" para todos):');
  console.log('    DNI 10002001 → admin    sede 1');
  console.log('    DNI 10002002 → admin    sede 2');
  console.log('    DNI 10003001 → vendedor sede 1');
  console.log('    DNI 10003002 → vendedor sede 2');
  console.log('    DNI 10004001 → técnico  sede 1');
  console.log('    DNI 10005001 → abastecedor sede 1');
  console.log('    DNI 10005002 → abastecedor sede 2');
  console.log('    DNI 10003099 → suspendido → 401\n');
}
