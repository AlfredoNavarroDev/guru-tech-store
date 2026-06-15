/**
 * Seed 06 — Compras_Refill + ajuste final de inventario.
 *
 * Las compras activan trg_det_compra_insert, que incrementa cantidad_actual.
 * Al final se hace UPDATE explícito para dejar el inventario en el estado
 * deseado para testing (crítico / bajo / OK) independientemente de cuánto
 * sumó el trigger.
 *
 * Estados visuales (StockBadge):
 *   Crítico : cantidad_actual <= stock_minimo
 *   Bajo    : cantidad_actual <= stock_minimo * 1.2
 *   OK      : cantidad_actual >  stock_minimo * 1.2
 *
 * Depende de: seed-02 (empleados), seed-04 (items+inventario), seed-05 (proveedores).
 */

import { QueryRunner } from 'typeorm';

export async function seedCompras(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 06] Órdenes de compra...');

  // 3 cabeceras: 2 del abastecedor de sede 1 (id=9), 1 del de sede 2 (id=10)
  await qr.query(`
    INSERT INTO Compras_Refill
      (id_compra, id_empleado_refiller, id_sede_destino, id_proveedor, fecha_compra)
    VALUES
      (1,  9, 1, 1, '2026-04-10 10:00:00-05:00'),
      (2,  9, 1, 2, '2026-05-15 14:30:00-05:00'),
      (3, 10, 2, 1, '2026-05-28 09:00:00-05:00')
  `);
  console.log('  OK - 3 cabeceras de compra');

  // Detalles — el trigger trg_det_compra_insert incrementa Inventario_Sedes
  await qr.query(`
    INSERT INTO Detalle_Compra_Refill
      (id_compra, id_item, cantidad_comprada, costo_unidad, precio_venta_sugerido)
    VALUES
      (1,  1,  100,   8.50,  25.00),
      (1,  2,   50,  22.00,  55.00),
      (1, 16,   30,  15.00,  45.00),
      (1, 20,   25,  18.00,  55.00),
      (2, 10,   15, 120.00, 220.00),
      (2, 11,   10, 180.00, 320.00),
      (2, 13,   20,  35.00,  75.00),
      (3,  3,   40,  12.00,  35.00),
      (3, 17,   20,  30.00,  89.00),
      (3, 18,   15,  55.00, 130.00)
  `);
  console.log('  OK - 10 líneas de detalle (trigger actualiza inventario)');

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Compras_Refill', 'id_compra'), 3)`,
  );

  // ─────────────────────────────────────────────────────────────────────────
  // AJUSTE FINAL DE INVENTARIO
  // El trigger sumó las cantidades compradas encima del stock base de seed-04
  // (50 uds para productos, 30 para repuestos). Se pisa con valores que
  // representan el estado post-ventas y producen los 3 badges en el frontend.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('  Ajustando inventario al estado final de testing...');

  // ── SEDE 1: CRÍTICO (cantidad_actual <= stock_minimo) ───────────────────
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 3, stock_minimo = 10
    WHERE id_sede = 1 AND id_item IN (1, 2)
  `);
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 3, stock_minimo = 8
    WHERE id_sede = 1 AND id_item = 16
  `);
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 2, stock_minimo = 5
    WHERE id_sede = 1 AND id_item = 10
  `);
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 5, stock_minimo = 5
    WHERE id_sede = 1 AND id_item = 11
  `);

  // ── SEDE 1: BAJO (stock_minimo < qty <= stock_minimo * 1.2) ─────────────
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 11, stock_minimo = 10
    WHERE id_sede = 1 AND id_item IN (3, 4)
  `);
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 9, stock_minimo = 8
    WHERE id_sede = 1 AND id_item = 17
  `);
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 6, stock_minimo = 5
    WHERE id_sede = 1 AND id_item = 12
  `);

  // ── SEDE 1: OK (stock normal) ────────────────────────────────────────────
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 50, stock_minimo = 5
    WHERE id_sede = 1 AND id_item IN (5, 6, 7, 8, 9, 18, 19, 20)
  `);
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 20, stock_minimo = 3
    WHERE id_sede = 1 AND id_item IN (13, 14, 15)
  `);

  // ── SEDE 2: CRÍTICO ──────────────────────────────────────────────────────
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 3, stock_minimo = 10
    WHERE id_sede = 2 AND id_item = 5
  `);
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 2, stock_minimo = 5
    WHERE id_sede = 2 AND id_item = 10
  `);

  // ── SEDE 2: BAJO ─────────────────────────────────────────────────────────
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 12, stock_minimo = 10
    WHERE id_sede = 2 AND id_item = 1
  `);

  // ── SEDE 2: OK ───────────────────────────────────────────────────────────
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 40, stock_minimo = 5
    WHERE id_sede = 2 AND id_item IN (2, 3, 4, 6, 7, 8, 9, 16, 17, 18, 19, 20)
  `);
  await qr.query(`
    UPDATE Inventario_Sedes SET cantidad_actual = 15, stock_minimo = 3
    WHERE id_sede = 2 AND id_item IN (11, 12, 13, 14, 15)
  `);

  console.log('  OK - inventario final ajustado');
  console.log(
    '  Sede 1 — Crítico : items 1,2 (cable/cargador), 16 (mouse), 10,11 (pantallas)',
  );
  console.log(
    '  Sede 1 — Bajo    : items 3,4 (fundas), 17 (teclado), 12 (pantalla Xiaomi)',
  );
  console.log('  Sede 1 — OK      : resto');
  console.log(
    '  Sede 2 — Crítico : item 5 (auriculares), item 10 (pantalla Samsung)',
  );
  console.log('  Sede 2 — Bajo    : item 1 (cable USB-C)');
  console.log('  Sede 2 — OK      : resto');

  console.log('[Seed 06] Completado.\n');
}
