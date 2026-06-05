/** Seed 04 — Items, Inventario, Promociones. 8 tipos de promo (ids 1-5 activas, 6-8 no). Depende de seed-01. */

import { QueryRunner } from 'typeorm';

export async function seedCatalogo(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 04] Catálogo...');

  // Solo productos (tipo='producto' requiere id_categoria NOT NULL)
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
      -- ids 7-9 sin promo activa → promo_nombre=NULL en vista
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

  // Insert directo (sin trigger compras). 50 uds x item/sede, stock_minimo=5.
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

  // 8 tipos para cubrir todas las ramas de filtrado de v_vendedor_catalogo
  console.log('  Insertando Promociones (todos los tipos)...');

  // [1] Categoria + porcentaje + siempre activa
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

  // [2] Categoria + monto_fijo + rango fechas activo
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

  // [3] Categoria + porcentaje + dia_semana=5 (viernes)
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

  // [4] Item + porcentaje + siempre activa (Power Bank)
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

  // [5] Item + monto_fijo + rango fechas activo (Cargador 20W)
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

  // [6] Item + porcentaje + vencida → NO aparece
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

  // [7] Categoria + monto_fijo + pausada → NO aparece
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

  // [8] Item + porcentaje + cancelada → NO aparece
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

  // Ajustar secuencias para no colisionar con ids fijos del seed
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Items',       'id_item'),       9)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Promociones', 'id_promocion'),  8)`,
  );

  console.log('[Seed 04] Completado.\n');
}
