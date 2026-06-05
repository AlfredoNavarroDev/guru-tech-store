/**
 * Seed 05 — Ventas, Pagos, Boletas
 *
 * Pobla: Ventas, Detalle_Venta, Pagos, Boletas
 * Dependencias: seed-01..04 (Sedes, Empleados, Clientes, Items, Inventario_Sedes)
 *
 * Este seed debe ejecutarse ÚLTIMO porque referencia todas las tablas anteriores
 * mediante FK. Cambiar el orden provocaría errores de clave foránea.
 *
 * TRIGGER ACTIVO: al insertar en Detalle_Venta el trigger trg_det_venta_insert
 *   descuenta automáticamente Inventario_Sedes. Si el stock es insuficiente,
 *   PostgreSQL lanza excepción y el seed falla. El seed-04 carga 50 unidades
 *   por item/sede para evitar esto.
 *
 * BOLETAS: se insertan directamente en la tabla sin pasar por BoletasService,
 *   que requiere S3/R2 configurado. El url_pdf queda NULL (aceptable en dev).
 *   El formato de número sigue la misma lógica de generarNumero():
 *     B{id_sede_3digits}-{seq_7digits}  →  B001-0000001
 *
 * Casos de prueba cubiertos:
 *   Venta 1 — con cliente, 2 items, efectivo,      sin descuento          (sede 1, Luis)
 *   Venta 2 — con cliente, 1 item,  yape,           sin descuento          (sede 1, Luis)
 *   Venta 3 — sin cliente (consumidor final), tarjeta, desc monto_fijo    (sede 2, Carla)
 *   Venta 4 — con cliente, 1 item,  transferencia+referencia, sin desc    (sede 2, Carla)
 *   Venta 5 — con cliente, 1 item,  plin,           desc porcentaje        (sede 1, Luis)
 *   Venta 6 — con cliente, 1 item,  otro+referencia, sin descuento         (sede 2, Carla)
 *
 * Métodos de pago cubiertos: efectivo, yape, tarjeta, transferencia, plin, otro (enum completo)
 * Tipos de descuento cubiertos: monto_fijo (V3), porcentaje (V5), sin descuento (V1,2,4,6)
 */

import { QueryRunner } from 'typeorm';

export async function seedVentas(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 05] Ventas, Pagos, Boletas...');

  // ═══════════════════════════════════════════════════════════════════════
  // VENTA 1 — sede 1, Luis (id=2), cliente Ana (id=1)
  //   2 items: cable + cargador, efectivo, sin descuento
  //   importe total: (2×25.00) + (1×55.00) = 105.00
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n  [Venta 1] 2 items, efectivo, con cliente...');

  await qr.query(`
    INSERT INTO Ventas (id_venta, fecha_emision, id_cliente, id_empleado, id_sede,
                        monto_descuento)
    VALUES (1, '2026-05-10 10:30:00', 1, 2, 1, 0.00)
  `);

  // trg_det_venta_insert descuenta stock automáticamente.
  // importe = cantidad × precio_unitario_momento (validado también en VentasService)
  await qr.query(`
    INSERT INTO Detalle_Venta
      (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe)
    VALUES
      (1, 1, 2, 25.00,  8.50,  50.00),  -- Cable USB-C 2m x2
      (1, 2, 1, 55.00, 22.00,  55.00)   -- Cargador 20W x1
  `);
  console.log('  OK detalle venta 1 (stock decrementado por trigger)');

  await qr.query(`
    INSERT INTO Pagos (id_venta, metodo_pago, monto, es_adelanto)
    VALUES (1, 'efectivo', 105.00, false)
  `);
  console.log('  OK pago venta 1: efectivo S/105.00');

  // B001-XXXXXXX: sede 1, secuencia 1
  await qr.query(`
    INSERT INTO Boletas (numero, fecha_emision, id_venta, total, estado, url_pdf)
    VALUES ('B001-0000001', '2026-05-10 10:31:00', 1, 105.00, 'emitida', NULL)
  `);
  console.log('  OK boleta B001-0000001 (url_pdf NULL — dev sin S3)');

  // ═══════════════════════════════════════════════════════════════════════
  // VENTA 2 — sede 1, Luis (id=2), cliente Pedro (id=2)
  //   1 item: funda iPhone, yape, sin descuento
  //   importe total: 1×35.00 = 35.00
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n  [Venta 2] 1 item, yape, con cliente...');

  await qr.query(`
    INSERT INTO Ventas (id_venta, fecha_emision, id_cliente, id_empleado, id_sede,
                        monto_descuento)
    VALUES (2, '2026-05-10 11:00:00', 2, 2, 1, 0.00)
  `);

  await qr.query(`
    INSERT INTO Detalle_Venta
      (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe)
    VALUES
      (2, 3, 1, 35.00, 12.00, 35.00)   -- Funda iPhone 15 x1
  `);
  console.log('  OK detalle venta 2');

  await qr.query(`
    INSERT INTO Pagos (id_venta, metodo_pago, monto, es_adelanto)
    VALUES (2, 'yape', 35.00, false)
  `);
  console.log('  OK pago venta 2: yape S/35.00');

  await qr.query(`
    INSERT INTO Boletas (numero, fecha_emision, id_venta, total, estado, url_pdf)
    VALUES ('B001-0000002', '2026-05-10 11:01:00', 2, 35.00, 'emitida', NULL)
  `);
  console.log('  OK boleta B001-0000002');

  // ═══════════════════════════════════════════════════════════════════════
  // VENTA 3 — sede 2, Carla (id=3), SIN cliente (consumidor final)
  //   2 items: auriculares + power bank, tarjeta, CON descuento S/10
  //   subtotal: 85.00 + 110.00 = 195.00 → total: 195.00 - 10.00 = 185.00
  //   justificacion_descuento requerida por VentasService cuando monto_descuento > 0
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n  [Venta 3] 2 items, tarjeta, sin cliente, con descuento...');

  await qr.query(`
    INSERT INTO Ventas (id_venta, fecha_emision, id_cliente, id_empleado, id_sede,
                        monto_descuento, tipo_descuento, justificacion_descuento)
    VALUES (3, '2026-05-11 14:00:00', NULL, 3, 2,
            10.00, 'monto_fijo', 'Descuento especial fin de semana aprobado por gerente')
  `);

  await qr.query(`
    INSERT INTO Detalle_Venta
      (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe)
    VALUES
      (3, 5, 1, 85.00, 35.00,  85.00),   -- Auriculares Bluetooth x1
      (3, 6, 1, 110.00, 45.00, 110.00)   -- Power Bank 10000mAh x1
  `);
  console.log('  OK detalle venta 3');

  await qr.query(`
    INSERT INTO Pagos (id_venta, metodo_pago, monto, es_adelanto)
    VALUES (3, 'tarjeta', 185.00, false)
  `);
  console.log('  OK pago venta 3: tarjeta S/185.00 (195 - descuento S/10)');

  await qr.query(`
    INSERT INTO Boletas (numero, fecha_emision, id_venta, total, estado, url_pdf)
    VALUES ('B002-0000001', '2026-05-11 14:01:00', 3, 185.00, 'emitida', NULL)
  `);
  console.log('  OK boleta B002-0000001 (sede 2)');

  // ═══════════════════════════════════════════════════════════════════════
  // VENTA 4 — sede 2, Carla (id=3), cliente Sofía (id=3)
  //   1 item: funda Samsung, transferencia + referencia, sin descuento
  //   importe total: 1×30.00 = 30.00
  // ═══════════════════════════════════════════════════════════════════════
  console.log(
    '\n  [Venta 4] 1 item, transferencia con referencia, con cliente...',
  );

  await qr.query(`
    INSERT INTO Ventas (id_venta, fecha_emision, id_cliente, id_empleado, id_sede,
                        monto_descuento)
    VALUES (4, '2026-05-12 09:30:00', 3, 3, 2, 0.00)
  `);

  await qr.query(`
    INSERT INTO Detalle_Venta
      (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe)
    VALUES
      (4, 4, 1, 30.00, 10.00, 30.00)   -- Funda Samsung Galaxy S24 x1
  `);
  console.log('  OK detalle venta 4');

  // referencia_transaccion: obligatoria para transferencia/otro según regla de negocio
  await qr.query(`
    INSERT INTO Pagos (id_venta, metodo_pago, monto, es_adelanto, referencia_transaccion)
    VALUES (4, 'transferencia', 30.00, false, 'TRX-BCP-2026051200001')
  `);
  console.log(
    '  OK pago venta 4: transferencia S/30.00 ref=TRX-BCP-2026051200001',
  );

  await qr.query(`
    INSERT INTO Boletas (numero, fecha_emision, id_venta, total, estado, url_pdf)
    VALUES ('B002-0000002', '2026-05-12 09:31:00', 4, 30.00, 'emitida', NULL)
  `);
  console.log('  OK boleta B002-0000002');

  // ═══════════════════════════════════════════════════════════════════════
  // VENTA 5 — sede 1, Luis (id=2), cliente Carlos (id=4, sin teléfono)
  //   1 item: Limpiador pantalla x2, descuento 10% porcentaje, pago plin
  //   subtotal: 2×15.00 = 30.00 → total: 30.00 × (1 - 0.10) = 27.00
  //   Cubre: tipo_descuento='porcentaje' (rama distinta en BoletasService)
  //          metodo_pago='plin' (no seedeado en ventas 1-4)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n  [Venta 5] 1 item, plin, descuento porcentaje...');

  await qr.query(`
    INSERT INTO Ventas (id_venta, fecha_emision, id_cliente, id_empleado, id_sede,
                        monto_descuento, tipo_descuento, justificacion_descuento)
    VALUES (5, '2026-05-13 10:00:00', 4, 2, 1,
            10.00, 'porcentaje', 'Descuento 10% por campaña fidelización')
  `);

  await qr.query(`
    INSERT INTO Detalle_Venta
      (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe)
    VALUES
      (5, 8, 2, 15.00, 5.00, 30.00)   -- Limpiador de pantalla 100ml x2
  `);
  console.log('  OK detalle venta 5');

  await qr.query(`
    INSERT INTO Pagos (id_venta, metodo_pago, monto, es_adelanto)
    VALUES (5, 'plin', 27.00, false)
  `);
  console.log('  OK pago venta 5: plin S/27.00 (30 - 10% = 27)');

  await qr.query(`
    INSERT INTO Boletas (numero, fecha_emision, id_venta, total, estado, url_pdf)
    VALUES ('B001-0000003', '2026-05-13 10:01:00', 5, 27.00, 'emitida', NULL)
  `);
  console.log('  OK boleta B001-0000003');

  // ═══════════════════════════════════════════════════════════════════════
  // VENTA 6 — sede 2, Carla (id=3), cliente Valeria (id=5, sin dirección)
  //   1 item: Soporte celular x1, sin descuento, pago 'otro' con referencia
  //   importe total: 1×28.00 = 28.00
  //   Cubre: metodo_pago='otro' (último valor del enum no seedeado)
  // ═══════════════════════════════════════════════════════════════════════
  console.log(
    '\n  [Venta 6] 1 item, pago otro con referencia, sin descuento...',
  );

  await qr.query(`
    INSERT INTO Ventas (id_venta, fecha_emision, id_cliente, id_empleado, id_sede,
                        monto_descuento)
    VALUES (6, '2026-05-13 15:00:00', 5, 3, 2, 0.00)
  `);

  await qr.query(`
    INSERT INTO Detalle_Venta
      (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe)
    VALUES
      (6, 7, 1, 28.00, 10.00, 28.00)   -- Soporte celular para auto x1
  `);
  console.log('  OK detalle venta 6');

  await qr.query(`
    INSERT INTO Pagos (id_venta, metodo_pago, monto, es_adelanto, referencia_transaccion)
    VALUES (6, 'otro', 28.00, false, 'VALE-CORP-2026051300001')
  `);
  console.log('  OK pago venta 6: otro S/28.00 ref=VALE-CORP-2026051300001');

  await qr.query(`
    INSERT INTO Boletas (numero, fecha_emision, id_venta, total, estado, url_pdf)
    VALUES ('B002-0000003', '2026-05-13 15:01:00', 6, 28.00, 'emitida', NULL)
  `);
  console.log('  OK boleta B002-0000003');

  // ── Reset sequences ───────────────────────────────────────────────────────
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Ventas',  'id_venta'),  6)`,
  );
  // Pagos y Boletas no tienen id explícito en los INSERTs anteriores,
  // pero sus secuencias avanzan automáticamente — no hace falta setval.

  console.log('\n  Resumen ventas seedeadas:');
  console.log(
    '    Venta 1 (id=1) - Luis,  sede 1, Ana,    efectivo      S/105  → B001-0000001',
  );
  console.log(
    '    Venta 2 (id=2) - Luis,  sede 1, Pedro,  yape          S/35   → B001-0000002',
  );
  console.log(
    '    Venta 3 (id=3) - Carla, sede 2, -,      tarjeta       S/185  → B002-0000001  (desc monto_fijo)',
  );
  console.log(
    '    Venta 4 (id=4) - Carla, sede 2, Sofía,  transferencia S/30   → B002-0000002',
  );
  console.log(
    '    Venta 5 (id=5) - Luis,  sede 1, Carlos, plin          S/27   → B001-0000003  (desc porcentaje)',
  );
  console.log(
    '    Venta 6 (id=6) - Carla, sede 2, Valeria,otro          S/28   → B002-0000003',
  );

  console.log('[Seed 05] Completado.\n');
}
