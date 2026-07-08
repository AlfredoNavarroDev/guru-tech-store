/**
 * Seed 09 — Ventas adicionales (ids 5-10) con detalles y pagos.
 * También añade pagos a las ventas 1-4 creadas en seed-08 (cambios).
 * Incluye un adelanto de pago para reparacion 1 (seed-07).
 * Depende de: seed-02 (empleados), seed-03 (clientes), seed-04 (items), seed-07 (reparaciones), seed-08 (ventas 1-4).
 */

import { QueryRunner } from 'typeorm';

export async function seedVentas(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 09] Ventas adicionales y pagos...');

  // Ventas 5-10 (las 1-4 viven en seed-08 para el flujo de cambios)
  console.log('  Insertando ventas 5-10...');
  await qr.query(`
    INSERT INTO ventas (id_venta, fecha_emision, id_cliente, id_empleado, id_sede, monto_descuento) VALUES
    (5,  '2026-06-10 10:00:00-05:00', 1,    4, 1, 0),
    (6,  '2026-06-11 11:30:00-05:00', 2,    4, 1, 0),
    (7,  '2026-06-12 14:00:00-05:00', 5,    5, 2, 0),
    (8,  '2026-06-13 09:45:00-05:00', NULL, 4, 1, 0),
    (9,  '2026-06-14 16:20:00-05:00', 4,    5, 2, 0),
    (10, '2026-06-15 12:00:00-05:00', 3,    4, 1, 0)
  `);
  console.log('  OK - 6 ventas (ids 5-10)');

  // Detalles de ventas 5-10
  // precio_unitario_momento refleja precio real cobrado (con promo si aplica)
  // precio_normal_momento es el precio de lista sin promo
  console.log('  Insertando detalles de ventas 5-10...');
  await qr.query(`
    INSERT INTO detalle_venta
      (id_venta, id_item, cantidad, precio_unitario_momento,
       precio_normal_momento, costo_unitario_momento, importe)
    VALUES
      (5,  1, 2,  25.00,  25.00,  8.50,  50.00),  -- Cable USB-C x2
      (5,  2, 1,  55.00,  55.00, 22.00,  55.00),  -- Cargador 20W
      (6,  5, 1,  85.00,  85.00, 35.00,  85.00),  -- Auriculares Bluetooth
      (7,  3, 1,  35.00,  35.00, 12.00,  35.00),  -- Funda iPhone 15
      (7,  4, 1,  30.00,  30.00, 10.00,  30.00),  -- Funda Samsung Galaxy S24
      (8,  7, 2,  28.00,  28.00, 10.00,  56.00),  -- Soporte auto x2
      (8,  8, 1,  15.00,  15.00,  5.00,  15.00),  -- Limpiador de pantalla
      (9, 18, 1, 130.00, 130.00, 55.00, 130.00),  -- SSD externo 256GB
      (10, 6, 1,  88.00, 110.00, 45.00,  88.00)   -- Power Bank (promo 20%: 110*0.8=88)
  `);
  console.log('  OK - detalles insertados');

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('ventas', 'id_venta'), 10)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('detalle_venta', 'id_detalle_v'), (SELECT MAX(id_detalle_v) FROM detalle_venta))`,
  );

  // Pagos para todas las ventas (1-10) y adelanto para reparacion 1
  console.log('  Insertando pagos...');
  await qr.query(`
    INSERT INTO pagos
      (id_venta, id_reparacion, metodo_pago, monto, es_adelanto,
       fecha_pago, referencia_transaccion)
    VALUES
      -- Pagos ventas 1-4 (creadas en seed-08 para flujo de cambios)
      (1, NULL, 'efectivo',  85.00, false, '2026-06-01 10:05:00-05:00', NULL),
      (2, NULL, 'efectivo',  28.00, false, '2026-06-02 11:35:00-05:00', NULL),
      (3, NULL, 'yape',      22.00, false, '2026-06-03 15:20:00-05:00', 'YAPE-VT-003'),
      (4, NULL, 'tarjeta',   35.00, false, '2026-06-04 09:50:00-05:00', 'POS-VT-004'),
      -- Pagos ventas 5-10
      (5,  NULL, 'efectivo', 105.00, false, '2026-06-10 10:10:00-05:00', NULL),
      (6,  NULL, 'yape',      85.00, false, '2026-06-11 11:35:00-05:00', 'YAPE-VT-006'),
      (7,  NULL, 'tarjeta',   65.00, false, '2026-06-12 14:05:00-05:00', 'POS-VT-007'),
      (8,  NULL, 'efectivo',  71.00, false, '2026-06-13 09:50:00-05:00', NULL),
      (9,  NULL, 'tarjeta',  130.00, false, '2026-06-14 16:25:00-05:00', 'POS-VT-009'),
      (10, NULL, 'yape',      88.00, false, '2026-06-15 12:05:00-05:00', 'YAPE-VT-010'),
      -- Adelanto reparacion 1 (Samsung Galaxy A54, cotizado S/120 → saldo pendiente S/60)
      (NULL, 1, 'efectivo',   60.00, true,  '2026-06-16 10:00:00-05:00', NULL)
  `);

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('pagos', 'id_pago'), (SELECT MAX(id_pago) FROM pagos))`,
  );

  console.log('  OK - 11 pagos (ventas 1-10 + adelanto reparacion 1)');
  console.log('    Venta 5:  efectivo  S/105.00 (cable x2 + cargador)');
  console.log('    Venta 6:  yape      S/85.00  (auriculares)');
  console.log('    Venta 7:  tarjeta   S/65.00  (fundas iPhone + Samsung, sede 2)');
  console.log('    Venta 8:  efectivo  S/71.00  (soporte x2 + limpiador, anónimo)');
  console.log('    Venta 9:  tarjeta   S/130.00 (SSD externo, sede 2)');
  console.log('    Venta 10: yape      S/88.00  (power bank con promo 20%)');
  console.log('    Rep 1:    efectivo  S/60.00  adelanto → saldo pendiente S/60.00');
  console.log('[Seed 09] Completado.\n');
}
