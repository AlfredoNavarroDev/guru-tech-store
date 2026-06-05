/**
 * Seed 04 — Catálogo: Items, Inventario, Promociones
 *
 * Pobla: Items, Inventario_Sedes, Promociones
 * Omitido: repuestos (tipo='repuesto' es para técnicos, no vendedores)
 *          Compras_Refill / Proveedores (se inserta directamente en Inventario_Sedes
 *          para evitar dependencias innecesarias con el flujo de abastecedor)
 *
 * Dependencias: seed-01 (Sedes, Marcas, Categorias)
 *
 * Items sin promoción (ids 7-9): categoría 4 (Accesorios) solo tiene promo 7
 *   que está en estado 'pausada', por lo tanto estos items aparecen en
 *   v_vendedor_catalogo con promo_nombre=NULL y precio_con_descuento=precio_venta_actual.
 *   Útiles para probar el caso "catálogo sin descuento aplicado".
 *
 * Inventario_Sedes: insert directo (sin pasar por el trigger de Compras_Refill).
 *   Esto evita necesitar Proveedores/abastecedor y mantiene el seed enfocado
 *   en el flujo vendedor.
 *
 * NOTA TRIGGER: al insertar en Detalle_Venta (seed-05) el trigger
 *   trg_det_venta_insert descuenta automáticamente el stock aquí cargado.
 *   El stock inicial de 50 unidades garantiza que las ventas del seed-05
 *   nunca fallen por "Stock insuficiente".
 *
 * Promociones — cubre todos los tipos soportados por la DB:
 *   ┌──────────────────────┬──────────────────┬─────────────────────────┐
 *   │ Target               │ tipo_descuento   │ Timing / Estado         │
 *   ├──────────────────────┼──────────────────┼─────────────────────────┤
 *   │ Categoria            │ porcentaje       │ siempre activa          │ ← id 1
 *   │ Categoria            │ monto_fijo       │ rango fechas activo     │ ← id 2
 *   │ Categoria            │ porcentaje       │ día de semana           │ ← id 3
 *   │ Item                 │ porcentaje       │ siempre activa          │ ← id 4
 *   │ Item                 │ monto_fijo       │ rango fechas activo     │ ← id 5
 *   │ Item                 │ porcentaje       │ estado vencida          │ ← id 6
 *   │ Categoria            │ monto_fijo       │ estado pausada          │ ← id 7
 *   │ Item                 │ porcentaje       │ estado cancelada        │ ← id 8
 *   └──────────────────────┴──────────────────┴─────────────────────────┘
 *   Ids 1-5 aparecen en v_vendedor_catalogo.
 *   Ids 6-8 NO aparecen (estado != 'activa' o fecha vencida).
 */

import { QueryRunner } from 'typeorm';

export async function seedCatalogo(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 04] Catálogo...');

  // ── Items (solo productos) ────────────────────────────────────────────────
  // Constraint DB: tipo='producto' requiere id_categoria NOT NULL
  // precio_venta_actual >= precio_compra_actual (constraint chk_precio_item)
  console.log('  Insertando Items (productos)...');
  await qr.query(`
    INSERT INTO Items
      (id_item, tipo, sku, nombre, id_marca, id_categoria, modelo,
       precio_compra_actual, precio_venta_actual)
    VALUES
      (1, 'producto', 'PRD-001', 'Cable USB-C 2m',
          3, 1, NULL,          8.50,  25.00),
      (2, 'producto', 'PRD-002', 'Cargador 20W USB-C',
          3, 1, NULL,         22.00,  55.00),
      (3, 'producto', 'PRD-003', 'Funda silicona iPhone 15',
          2, 2, 'iPhone 15',  12.00,  35.00),
      (4, 'producto', 'PRD-004', 'Funda Samsung Galaxy S24',
          1, 2, 'Galaxy S24', 10.00,  30.00),
      (5, 'producto', 'PRD-005', 'Auriculares Bluetooth',
          3, 3, NULL,         35.00,  85.00),
      (6, 'producto', 'PRD-006', 'Power Bank 10000mAh',
          3, 4, NULL,         45.00, 110.00),
      -- Sin promoción: categoría 4 (Accesorios) solo tiene promo pausada
      -- → aparecen en v_vendedor_catalogo con promo_nombre=NULL
      (7, 'producto', 'PRD-007', 'Soporte celular para auto',
          5, 4, NULL,         10.00,  28.00),
      (8, 'producto', 'PRD-008', 'Limpiador de pantalla 100ml',
          5, 4, NULL,          5.00,  15.00),
      (9, 'producto', 'PRD-009', 'Memoria USB 32GB',
          4, 4, NULL,          8.00,  22.00)
  `);
  console.log(
    '  OK - 9 productos (ids 1-6 con promo, ids 7-9 sin promo activa)',
  );

  // ── Inventario_Sedes ──────────────────────────────────────────────────────
  // Insert directo para no depender del trigger de Compras_Refill.
  // 50 unidades por item/sede: margen amplio para que las ventas del seed-05
  // nunca fallen con "Stock insuficiente".
  // stock_minimo=5 para probar alerta en futuros endpoints de inventario.
  console.log(
    '  Insertando Inventario_Sedes (insert directo, sin trigger compras)...',
  );
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const sedes = [1, 2];
  for (const idSede of sedes) {
    for (const idItem of items) {
      await qr.query(
        `INSERT INTO Inventario_Sedes (id_sede, id_item, cantidad_actual, stock_minimo)
         VALUES ($1, $2, 50, 5)`,
        [idSede, idItem],
      );
    }
  }
  console.log(
    `  OK - ${items.length * sedes.length} registros de inventario (${items.length} items × ${sedes.length} sedes, 50 uds c/u)`,
  );

  // ── Promociones ───────────────────────────────────────────────────────────
  // Se insertan los 8 tipos para que los tests de CatalogoService cubran todas
  // las ramas de la lógica de filtrado de la vista v_vendedor_catalogo.
  console.log('  Insertando Promociones (todos los tipos)...');

  // ── Tipo 1: Categoria + porcentaje + siempre activa (sin fechas) ──────────
  // La más común. Aplica a toda la categoría indefinidamente.
  // Aparece en v_vendedor_catalogo para items de categoría 1 (Cables y Cargadores).
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_categoria_afectada,
       valor_descuento, tipo_descuento, estado)
    VALUES
      (1, '10% desc. Cables y Cargadores — permanente',
          1, 10.00, 'porcentaje', 'activa')
  `);
  console.log(
    '  OK [1] categoria + porcentaje + sin fechas → activa en catálogo',
  );

  // ── Tipo 2: Categoria + monto_fijo + rango de fechas activo ──────────────
  // Descuento fijo temporal. fecha_fin=2026-12-31 garantiza que hoy esté activa.
  // Aparece para items de categoría 2 (Fundas y Protectores).
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_categoria_afectada,
       valor_descuento, tipo_descuento, estado,
       fecha_inicio, fecha_fin)
    VALUES
      (2, 'S/5 off Fundas — Promo 2026',
          2, 5.00, 'monto_fijo', 'activa',
          '2026-01-01', '2026-12-31')
  `);
  console.log(
    '  OK [2] categoria + monto_fijo + fechas activas → activa en catálogo',
  );

  // ── Tipo 3: Categoria + porcentaje + día de semana ────────────────────────
  // dia_semana=5 = viernes. La vista v_vendedor_catalogo NO filtra por dia_semana
  // actualmente, pero el campo existe en la DB para uso futuro o endpoints propios.
  // Aparece en catálogo (estado=activa, sin fechas restricción).
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_categoria_afectada,
       valor_descuento, tipo_descuento, estado,
       dia_semana)
    VALUES
      (3, '15% desc. Auriculares los viernes',
          3, 15.00, 'porcentaje', 'activa',
          5)
  `);
  console.log(
    '  OK [3] categoria + porcentaje + dia_semana=5 (viernes) → activa en catálogo',
  );

  // ── Tipo 4: Item + porcentaje + siempre activa ────────────────────────────
  // Descuento sobre un producto específico, sin límite de tiempo.
  // Aparece para id_item=6 (Power Bank).
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_item_afectado,
       valor_descuento, tipo_descuento, estado)
    VALUES
      (4, '20% desc. Power Bank — permanente',
          6, 20.00, 'porcentaje', 'activa')
  `);
  console.log(
    '  OK [4] item + porcentaje + sin fechas → activa en catálogo (item 6)',
  );

  // ── Tipo 5: Item + monto_fijo + rango de fechas activo ───────────────────
  // Descuento fijo sobre un producto específico con fecha límite.
  // Aparece para id_item=2 (Cargador 20W).
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_item_afectado,
       valor_descuento, tipo_descuento, estado,
       fecha_inicio, fecha_fin)
    VALUES
      (5, 'S/8 off Cargador 20W — Promo Mayo-Jul 2026',
          2, 8.00, 'monto_fijo', 'activa',
          '2026-05-01', '2026-07-31')
  `);
  console.log(
    '  OK [5] item + monto_fijo + fechas activas → activa en catálogo (item 2)',
  );

  // ── Tipo 6: Item + porcentaje + vencida ──────────────────────────────────
  // Estado='vencida' y fecha_fin pasada. No aparece en v_vendedor_catalogo.
  // Sirve para probar que promos inactivas no contaminan el catálogo.
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_item_afectado,
       valor_descuento, tipo_descuento, estado,
       fecha_inicio, fecha_fin)
    VALUES
      (6, '30% Cable USB-C — Black Friday 2025 (VENCIDA)',
          1, 30.00, 'porcentaje', 'vencida',
          '2025-11-29', '2025-11-30')
  `);
  console.log(
    '  OK [6] item + porcentaje + estado=vencida → NO aparece en catálogo',
  );

  // ── Tipo 7: Categoria + monto_fijo + pausada ──────────────────────────────
  // Estado='pausada'. No aparece en v_vendedor_catalogo aunque la fecha sea válida.
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_categoria_afectada,
       valor_descuento, tipo_descuento, estado)
    VALUES
      (7, 'S/3 off Accesorios — Pausada temporalmente',
          4, 3.00, 'monto_fijo', 'pausada')
  `);
  console.log(
    '  OK [7] categoria + monto_fijo + estado=pausada → NO aparece en catálogo',
  );

  // ── Tipo 8: Item + porcentaje + cancelada ─────────────────────────────────
  // Estado='cancelada'. No aparece en v_vendedor_catalogo.
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_item_afectado,
       valor_descuento, tipo_descuento, estado)
    VALUES
      (8, '25% Funda iPhone 15 — Campaña cancelada',
          3, 25.00, 'porcentaje', 'cancelada')
  `);
  console.log(
    '  OK [8] item + porcentaje + estado=cancelada → NO aparece en catálogo',
  );

  console.log('  Resumen promociones:');
  console.log('    Activas en catálogo: ids 1,2,3,4,5');
  console.log(
    '    Inactivas (testing): ids 6 (vencida), 7 (pausada), 8 (cancelada)',
  );

  // ── Reset sequences ───────────────────────────────────────────────────────
  // Necesario para que los endpoints de creación de Items/Promociones en
  // tiempo de ejecución no intenten reusar los ids ya insertados.
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Items',       'id_item'),       9)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Promociones', 'id_promocion'),  8)`,
  );

  console.log('[Seed 04] Completado.\n');
}
