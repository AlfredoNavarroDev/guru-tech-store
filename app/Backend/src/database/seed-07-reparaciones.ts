/**
 * Seed 07 — Estados de reparación y reparaciones de prueba.
 * Cubre los 4 estados del flujo (pendiente → reparacion → listo → entregado).
 * Depende de: seed-02 (empleados), seed-03 (clientes).
 */

import { QueryRunner } from 'typeorm';

export async function seedReparaciones(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 07] Estados de reparación y reparaciones...');

  console.log('  Insertando estados_reparacion...');
  await qr.query(`
    INSERT INTO estados_reparacion (id_estado, nombre, descripcion, orden, es_final) VALUES
    (1, 'pendiente',   'Equipo recibido, pendiente de reparación', 1, false),
    (2, 'reparacion',  'En proceso de reparación',                 2, false),
    (3, 'listo',       'Reparación terminada, lista para entrega', 3, true),
    (4, 'entregado',   'Equipo entregado al cliente',              4, true)
  `);
  console.log('  OK - 4 estados');

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('estados_reparacion', 'id_estado'), 4)`,
  );

  console.log('  Insertando reparaciones de prueba...');

  // Rep 1 — pendiente: Samsung Galaxy A54, técnico sede 1 (DNI 10004001), cliente id=1
  await qr.query(`
    INSERT INTO reparaciones
      (id_cliente, id_tecnico, id_sede, marca, modelo, imei, esta_encendido,
       diagnostico_tecnico, id_estado, monto_cotizado, monto_descuento,
       fecha_ingreso)
    VALUES (
      1,
      (SELECT id_empleado FROM empleados WHERE nro_documento = '10004001'),
      1,
      'Samsung', 'Galaxy A54', '123456789012345', true,
      'Pantalla rota, táctil no responde',
      1, 120.00, 0,
      '2026-06-15 09:00:00-05:00'
    )
  `);

  // Rep 2 — en reparacion: Apple iPhone 12, técnico sede 1 (DNI 10004001), cliente id=2
  await qr.query(`
    INSERT INTO reparaciones
      (id_cliente, id_tecnico, id_sede, marca, modelo, esta_encendido,
       diagnostico_tecnico, id_estado, monto_cotizado, monto_descuento,
       fecha_ingreso)
    VALUES (
      2,
      (SELECT id_empleado FROM empleados WHERE nro_documento = '10004001'),
      1,
      'Apple', 'iPhone 12', false,
      'No carga, puerto USB-C dañado',
      2, 80.00, 0,
      '2026-06-16 10:30:00-05:00'
    )
  `);

  // Rep 3 — listo: Xiaomi Redmi Note 12, técnico sede 2 (DNI 10004002), cliente id=3
  await qr.query(`
    INSERT INTO reparaciones
      (id_cliente, id_tecnico, id_sede, marca, modelo, esta_encendido,
       diagnostico_tecnico, id_estado, monto_cotizado, monto_descuento,
       fecha_ingreso, fecha_terminado)
    VALUES (
      3,
      (SELECT id_empleado FROM empleados WHERE nro_documento = '10004002'),
      2,
      'Xiaomi', 'Redmi Note 12', true,
      'Batería agotada, carga lenta incluso con cargador original',
      3, 90.00, 0,
      '2026-06-14 11:00:00-05:00',
      '2026-06-17 16:00:00-05:00'
    )
  `);

  // Rep 4 — entregado: Samsung Galaxy A52, técnico sede 1 (DNI 10004001), cliente id=4
  await qr.query(`
    INSERT INTO reparaciones
      (id_cliente, id_tecnico, id_sede, marca, modelo, esta_encendido,
       diagnostico_tecnico, id_estado, monto_cotizado, monto_descuento,
       fecha_ingreso, fecha_terminado, fecha_entrega_cliente)
    VALUES (
      4,
      (SELECT id_empleado FROM empleados WHERE nro_documento = '10004001'),
      1,
      'Samsung', 'Galaxy A52', true,
      'Micrófono no funciona en llamadas, altavoz con distorsión',
      4, 65.00, 0,
      '2026-06-10 08:30:00-05:00',
      '2026-06-12 17:00:00-05:00',
      '2026-06-13 14:00:00-05:00'
    )
  `);

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('reparaciones', 'id_reparacion'), (SELECT MAX(id_reparacion) FROM reparaciones))`,
  );

  console.log('  OK - 4 reparaciones (una por estado del flujo)');
  console.log(
    '    id=1  pendiente   Samsung Galaxy A54   sede 1  técnico DNI 10004001',
  );
  console.log(
    '    id=2  reparacion  Apple iPhone 12      sede 1  técnico DNI 10004001',
  );
  console.log(
    '    id=3  listo       Xiaomi Redmi Note 12 sede 2  técnico DNI 10004002',
  );
  console.log(
    '    id=4  entregado   Samsung Galaxy A52   sede 1  técnico DNI 10004001',
  );
  console.log('[Seed 07] Completado.\n');
}
