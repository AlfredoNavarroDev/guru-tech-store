import { QueryRunner } from 'typeorm';

export async function seedCambios(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 08] Ventas base y cambios de producto...');

  console.log('  Insertando ventas base para cambios...');
  await qr.query(`
    INSERT INTO ventas
      (id_venta, fecha_emision, id_cliente, id_empleado, id_sede, monto_descuento)
    VALUES
      (1, '2026-06-01 10:00:00-05:00', 1, 4, 1, 0),
      (2, '2026-06-02 11:30:00-05:00', 2, 4, 1, 0),
      (3, '2026-06-03 15:15:00-05:00', 3, 4, 1, 0),
      (4, '2026-06-04 09:45:00-05:00', 4, 5, 2, 0)
  `);

  await qr.query(`
    INSERT INTO detalle_venta
      (id_venta, id_item, cantidad, precio_unitario_momento,
       precio_normal_momento, costo_unitario_momento, importe)
    VALUES
      (1, 5, 1, 85.00, 85.00, 35.00, 85.00),
      (2, 7, 1, 28.00, 28.00, 10.00, 28.00),
      (3, 9, 1, 22.00, 22.00,  8.00, 22.00),
      (4, 3, 1, 35.00, 35.00, 12.00, 35.00)
  `);

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('ventas', 'id_venta'), 4)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('detalle_venta', 'id_detalle_v'), (SELECT MAX(id_detalle_v) FROM detalle_venta))`,
  );
  console.log('  OK - 4 ventas base con detalle');

  console.log('  Insertando cambios de producto...');
  await qr.query(`
    INSERT INTO cambios_producto
      (id_cambio, id_venta_origen, id_garantia, id_empleado, id_sede,
       id_item_devuelto, cantidad, precio_devuelto,
       id_item_entregado, precio_entregado, diferencia_cobrada,
       metodo_pago_dif, referencia_transaccion, motivo, detalle, fecha_cambio)
    VALUES
      (1, 1, NULL, 4, 1, 5, 1, 85.00, 6, 110.00, 25.00,
       'yape', 'YAPE-SEED-001', 'defecto', 'Auriculares con falla de batería; cliente cambia por power bank.', '2026-06-05 10:20:00-05:00'),
      (2, 2, NULL, 4, 1, 7, 1, 28.00, 8, 15.00, 0.00,
       NULL, NULL, 'garantia', 'Soporte dañado; se entrega limpiador como compensación sin diferencia.', '2026-06-06 12:10:00-05:00'),
      (3, 3, NULL, 4, 1, 9, 1, 22.00, 20, 55.00, 33.00,
       'tarjeta', 'POS-SEED-003', 'otro', 'Cliente solicita upgrade de memoria USB a hub USB-C.', '2026-06-07 16:35:00-05:00'),
      (4, 4, NULL, 5, 2, 3, 1, 35.00, 4, 30.00, 0.00,
       NULL, NULL, 'defecto', 'Funda iPhone defectuosa; cambio por funda Samsung en sede 2.', '2026-06-08 09:25:00-05:00')
  `);

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('cambios_producto', 'id_cambio'), 4)`,
  );
  console.log('  OK - 4 cambios (3 sede 1, 1 sede 2)');

  console.log('  Insertando boleta ya emitida para cambio 3...');
  await qr.query(`
    INSERT INTO boletas
      (numero, fecha_emision, id_venta, id_reparacion, id_cambio, total, estado, url_pdf)
    VALUES
      ('C001-0000001', '2026-06-07 16:40:00-05:00', NULL, NULL, 3, 33.00, 'emitida', 'https://cdn.test.com/boletas/cambios/C001-0000001.pdf')
  `);
  console.log('  OK - cambio 3 queda con boleta existente');

  console.log('[Seed 08] Completado.\n');
}
