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
  //
  // Crítico : cantidad_actual <= stock_minimo
  // Bajo    : stock_minimo < cantidad_actual <= stock_minimo * 1.2
  // OK      : cantidad_actual > stock_minimo * 1.2
  // ─────────────────────────────────────────────────────────────────────────
  console.log('  Ajustando inventario al estado final de testing...');

  await qr.query(`
    UPDATE Inventario_Sedes AS inv
    SET cantidad_actual = v.qty, stock_minimo = v.min
    FROM (VALUES
      -- Sede 1: Crítico (qty <= min)
      (1,  1,  3, 10), (1,  2,  3, 10), (1, 16,  3,  8),
      (1, 10,  2,  5), (1, 11,  5,  5),
      -- Sede 1: Bajo (min < qty <= min * 1.2)
      (1,  3, 11, 10), (1,  4, 11, 10), (1, 17,  9,  8), (1, 12,  6,  5),
      -- Sede 1: OK (máx 18)
      (1,  5, 18,  5), (1,  6, 14,  5), (1,  7, 16,  5), (1,  8, 17,  5),
      (1,  9, 15,  5), (1, 18, 13,  5), (1, 19, 18,  5), (1, 20, 15,  5),
      (1, 13, 16,  3), (1, 14, 14,  3), (1, 15, 18,  3),
      -- Sede 2: Crítico
      (2,  5,  3, 10), (2, 10,  2,  5),
      -- Sede 2: Bajo
      (2,  1, 12, 10),
      -- Sede 2: OK (máx 18)
      (2,  2, 17,  5), (2,  3, 13,  5), (2,  4, 15,  5), (2,  6, 18,  5),
      (2,  7, 14,  5), (2,  8, 16,  5), (2,  9, 12,  5), (2, 16, 17,  5),
      (2, 17, 15,  5), (2, 18, 13,  5), (2, 19, 18,  5), (2, 20, 16,  5),
      (2, 11, 15,  3), (2, 12, 13,  3), (2, 13, 17,  3),
      (2, 14, 14,  3), (2, 15, 16,  3)
    ) AS v(sede, item, qty, min)
    WHERE inv.id_sede = v.sede
      AND inv.id_item = v.item
  `);

  console.log('  OK - inventario final ajustado (1 query batch, 40 filas)');
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
