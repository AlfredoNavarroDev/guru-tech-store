/** Seed 07 — Estados de reparación y reparaciones de prueba. */

import { QueryRunner } from 'typeorm';

export async function seedReparaciones(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 07] Estados de reparación y reparaciones...');

  console.log('  Insertando estados_reparacion...');
  await qr.query(`
    INSERT INTO estados_reparacion (id_estado, nombre, descripcion, orden, es_final) VALUES
    (1, 'pendiente',           'Equipo recibido, sin diagnóstico',           1, false),
    (2, 'diagnostico',         'En proceso de diagnóstico',                  2, false),
    (3, 'reparacion',          'En proceso de reparación',                   3, false),
    (4, 'esperando repuestos', 'Esperando llegada de repuestos',             4, false),
    (5, 'listo',               'Reparación terminada, lista para entrega',   5, true),
    (6, 'entregado',           'Equipo entregado al cliente',                6, true)
  `);
  console.log('  OK - 6 estados');

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('estados_reparacion', 'id_estado'), 6)`,
  );

  console.log('  Insertando reparaciones de prueba...');
  // Técnico sede 1 = DNI 10004001 → id_empleado dinámico, buscamos por nro_documento.
  await qr.query(`
    INSERT INTO reparaciones
      (id_cliente, id_tecnico, id_sede, marca, modelo, imei, esta_encendido,
       diagnostico_tecnico, id_estado, monto_cotizado, monto_descuento)
    SELECT
      c.id_cliente,
      e.id_empleado,
      1,
      'Samsung', 'Galaxy A54', '123456789012345', true,
      'Pantalla rota, táctil no responde',
      1, 120.00, 0
    FROM clientes c, empleados e
    WHERE c.id_cliente = (SELECT id_cliente FROM clientes LIMIT 1)
      AND e.nro_documento = '10004001'
    LIMIT 1
  `);

  await qr.query(`
    INSERT INTO reparaciones
      (id_cliente, id_tecnico, id_sede, marca, modelo, esta_encendido,
       diagnostico_tecnico, id_estado, monto_cotizado, monto_descuento)
    SELECT
      c.id_cliente,
      e.id_empleado,
      1,
      'Apple', 'iPhone 12', false,
      'No carga, puerto USB-C dañado',
      3, 80.00, 0
    FROM clientes c, empleados e
    WHERE c.id_cliente = (SELECT id_cliente FROM clientes OFFSET 1 LIMIT 1)
      AND e.nro_documento = '10004001'
    LIMIT 1
  `);

  console.log('  OK - 2 reparaciones de prueba en sede 1');
  console.log('[Seed 07] Completado.\n');
}
