/** Seed 04 — Items, Inventario, Promociones. 8 tipos de promo (ids 1-5 activas, 6-8 no). Depende de seed-01. */

import { QueryRunner } from 'typeorm';

export async function seedCatalogo(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 04] Catálogo...');

  // ─── PRODUCTOS IDs 1-9 ───────────────────────────────────────────────────
  console.log('  Insertando Items (productos 1-9)...');
  await qr.query(`
    INSERT INTO Items
      (id_item, tipo, sku, nombre, id_marca, modelo,
       precio_compra_actual, precio_venta_actual)
    VALUES
      (1,  'producto', 'PRD-001', 'Cable USB-C 2m',              3, NULL,          8.50,  25.00),
      (2,  'producto', 'PRD-002', 'Cargador 20W USB-C',          3, NULL,         22.00,  55.00),
      (3,  'producto', 'PRD-003', 'Funda silicona iPhone 15',    2, 'iPhone 15',  12.00,  35.00),
      (4,  'producto', 'PRD-004', 'Funda Samsung Galaxy S24',    1, 'Galaxy S24', 10.00,  30.00),
      (5,  'producto', 'PRD-005', 'Auriculares Bluetooth',        3, NULL,         35.00,  85.00),
      (6,  'producto', 'PRD-006', 'Power Bank 10000mAh',          3, NULL,         45.00, 110.00),
      (7,  'producto', 'PRD-007', 'Soporte celular para auto',    5, NULL,         10.00,  28.00),
      (8,  'producto', 'PRD-008', 'Limpiador de pantalla 100ml', 5, NULL,          5.00,  15.00),
      (9,  'producto', 'PRD-009', 'Memoria USB 32GB',             4, NULL,          8.00,  22.00)
  `);
  console.log('  OK - 9 productos (ids 1-9)');

  // ─── REPUESTOS IDs 10-15 ────────────────────────────────────────────────
  console.log('  Insertando Items (repuestos 10-15)...');
  await qr.query(`
    INSERT INTO Items
      (id_item, tipo, sku, nombre, id_marca, modelo, calidad,
       precio_compra_actual, precio_venta_actual)
    VALUES
      (10, 'repuesto', 'REP-001', 'Pantalla Samsung Galaxy S24',   1, 'Galaxy S24',    'original',   120.00, 220.00),
      (11, 'repuesto', 'REP-002', 'Pantalla Apple iPhone 15',      2, 'iPhone 15',     'original',   180.00, 320.00),
      (12, 'repuesto', 'REP-003', 'Pantalla Xiaomi Redmi Note 12', 4, 'Redmi Note 12', 'alternativa', 55.00, 110.00),
      (13, 'repuesto', 'REP-004', 'Batería Samsung Galaxy S24',    1, 'Galaxy S24',    'original',    35.00,  75.00),
      (14, 'repuesto', 'REP-005', 'Batería Apple iPhone 15',       2, 'iPhone 15',     'original',    45.00,  95.00),
      (15, 'repuesto', 'REP-006', 'Batería Huawei P30 Pro',        6, 'P30 Pro',       'alternativa', 25.00,  55.00)
  `);
  console.log('  OK - 6 repuestos (ids 10-15)');

  // ─── PRODUCTOS IDs 16-20 ────────────────────────────────────────────────
  console.log('  Insertando Items (productos 16-20)...');
  await qr.query(`
    INSERT INTO Items
      (id_item, tipo, sku, nombre, id_marca, modelo,
       precio_compra_actual, precio_venta_actual)
    VALUES
      (16, 'producto', 'PRD-010', 'Mouse inalámbrico',          7, NULL, 15.00,  45.00),
      (17, 'producto', 'PRD-011', 'Teclado compacto Bluetooth', 7, NULL, 30.00,  89.00),
      (18, 'producto', 'PRD-012', 'SSD externo 256GB',          8, NULL, 55.00, 130.00),
      (19, 'producto', 'PRD-013', 'Funda notebook 15"',         5, NULL, 12.00,  35.00),
      (20, 'producto', 'PRD-014', 'Hub USB-C 7 puertos',        7, NULL, 18.00,  55.00)
  `);
  console.log('  OK - 5 productos (ids 16-20)');

  // ─── PRODUCTOS IDs 21-55 ────────────────────────────────────────────────
  console.log('  Insertando Items (productos 21-55)...');
  await qr.query(`
    INSERT INTO Items
      (id_item, tipo, sku, nombre, id_marca, modelo,
       precio_compra_actual, precio_venta_actual)
    VALUES
      (21, 'producto', 'PRD-015', 'Cable USB-A a USB-C 1m',           3, NULL,              4.50,  14.00),
      (22, 'producto', 'PRD-016', 'Cable Lightning 1m',                2, NULL,              9.00,  25.00),
      (23, 'producto', 'PRD-017', 'Cable Micro-USB 1m',                5, NULL,              2.50,   8.00),
      (24, 'producto', 'PRD-018', 'Cargador inalámbrico 15W',          3, NULL,             18.00,  49.00),
      (25, 'producto', 'PRD-019', 'Cargador GaN 65W',                  3, NULL,             32.00,  85.00),
      (26, 'producto', 'PRD-020', 'Cargador para auto dual USB',       5, NULL,              6.00,  18.00),
      (27, 'producto', 'PRD-021', 'Funda iPhone 15 Pro transparente',  5, 'iPhone 15 Pro',   8.00,  22.00),
      (28, 'producto', 'PRD-022', 'Funda Samsung Galaxy S23',          1, 'Galaxy S23',      9.00,  25.00),
      (29, 'producto', 'PRD-023', 'Funda Xiaomi Redmi Note 13',        4, 'Redmi Note 13',   7.00,  18.00),
      (30, 'producto', 'PRD-024', 'Vidrio templado iPhone 15',         5, 'iPhone 15',       5.00,  15.00),
      (31, 'producto', 'PRD-025', 'Vidrio templado Samsung S24',       5, 'Galaxy S24',      5.00,  15.00),
      (32, 'producto', 'PRD-026', 'Auriculares in-ear Bluetooth',      3, NULL,             22.00,  59.00),
      (33, 'producto', 'PRD-027', 'Auriculares con cable 3.5mm',       5, NULL,              5.00,  16.00),
      (34, 'producto', 'PRD-028', 'Power Bank 20000mAh',               3, NULL,             55.00, 130.00),
      (35, 'producto', 'PRD-029', 'Soporte celular de escritorio',     5, NULL,              8.00,  22.00),
      (36, 'producto', 'PRD-030', 'Tarjeta microSD 128GB',             4, NULL,             12.00,  32.00),
      (37, 'producto', 'PRD-031', 'Memoria USB 64GB',                  8, NULL,             10.00,  28.00),
      (38, 'producto', 'PRD-032', 'Almohadilla de mouse XL',           5, NULL,              6.00,  18.00),
      (39, 'producto', 'PRD-033', 'Webcam HD 1080p',                   7, NULL,             28.00,  75.00),
      (40, 'producto', 'PRD-034', 'Cable HDMI 2m 4K',                  5, NULL,              7.00,  20.00),
      (41, 'producto', 'PRD-035', 'Adaptador USB-C a HDMI',            5, NULL,              9.00,  25.00),
      (42, 'producto', 'PRD-036', 'Adaptador USB-C a Jack 3.5mm',      5, NULL,              5.00,  14.00),
      (43, 'producto', 'PRD-037', 'Funda laptop 13"',                  5, NULL,             10.00,  28.00),
      (44, 'producto', 'PRD-038', 'Soporte laptop aluminio',            5, NULL,             18.00,  48.00),
      (45, 'producto', 'PRD-039', 'Kit limpieza pantallas 5 en 1',     5, NULL,              7.00,  20.00),
      (46, 'producto', 'PRD-040', 'Cable USB-C a USB-C 1m 240W',       3, NULL,             12.00,  35.00),
      (47, 'producto', 'PRD-041', 'Correa smartwatch 22mm',            5, NULL,              4.00,  12.00),
      (48, 'producto', 'PRD-042', 'Ring light 26cm con trípode',       5, NULL,             25.00,  65.00),
      (49, 'producto', 'PRD-043', 'Trípode flexible para celular',     5, NULL,              8.00,  22.00),
      (50, 'producto', 'PRD-044', 'Funda iPad Air 10.9" con teclado',  5, 'iPad Air 10.9',  28.00,  75.00),
      (51, 'producto', 'PRD-045', 'Teclado mecánico TKL',              7, NULL,             55.00, 145.00),
      (52, 'producto', 'PRD-046', 'Mouse gaming 25600 DPI',            7, NULL,             32.00,  89.00),
      (53, 'producto', 'PRD-047', 'SSD externo 512GB',                 8, NULL,             75.00, 175.00),
      (54, 'producto', 'PRD-048', 'Auriculares gaming con micrófono',  7, NULL,             38.00,  99.00),
      (55, 'producto', 'PRD-049', 'Vidrio templado privacidad iPhone', 5, 'iPhone 15',       8.00,  22.00)
  `);
  console.log('  OK - 35 productos (ids 21-55)');

  // ─── REPUESTOS IDs 56-80 ────────────────────────────────────────────────
  console.log('  Insertando Items (repuestos 56-80)...');
  await qr.query(`
    INSERT INTO Items
      (id_item, tipo, sku, nombre, id_marca, modelo, calidad,
       precio_compra_actual, precio_venta_actual)
    VALUES
      (56, 'repuesto', 'REP-007', 'Pantalla iPhone 15 Pro',            2, 'iPhone 15 Pro',  'original',    220.00, 400.00),
      (57, 'repuesto', 'REP-008', 'Pantalla iPhone 14',                2, 'iPhone 14',      'original',    160.00, 290.00),
      (58, 'repuesto', 'REP-009', 'Pantalla iPhone 13',                2, 'iPhone 13',      'alternativa',  85.00, 160.00),
      (59, 'repuesto', 'REP-010', 'Pantalla Samsung Galaxy S23',       1, 'Galaxy S23',     'original',    110.00, 200.00),
      (60, 'repuesto', 'REP-011', 'Pantalla Samsung Galaxy A54',       1, 'Galaxy A54',     'alternativa',  50.00,  95.00),
      (61, 'repuesto', 'REP-012', 'Pantalla Xiaomi Redmi Note 13',     4, 'Redmi Note 13',  'alternativa',  45.00,  90.00),
      (62, 'repuesto', 'REP-013', 'Pantalla Huawei P40',               6, 'P40',            'alternativa',  60.00, 115.00),
      (63, 'repuesto', 'REP-014', 'Batería iPhone 15 Pro',             2, 'iPhone 15 Pro',  'original',     55.00, 110.00),
      (64, 'repuesto', 'REP-015', 'Batería iPhone 14',                 2, 'iPhone 14',      'original',     48.00, 100.00),
      (65, 'repuesto', 'REP-016', 'Batería iPhone 13',                 2, 'iPhone 13',      'original',     40.00,  85.00),
      (66, 'repuesto', 'REP-017', 'Batería Samsung Galaxy S23',        1, 'Galaxy S23',     'original',     30.00,  65.00),
      (67, 'repuesto', 'REP-018', 'Batería Samsung Galaxy A54',        1, 'Galaxy A54',     'alternativa',  20.00,  45.00),
      (68, 'repuesto', 'REP-019', 'Batería Xiaomi Redmi Note 13',      4, 'Redmi Note 13',  'alternativa',  18.00,  40.00),
      (69, 'repuesto', 'REP-020', 'Conector de carga iPhone 15',       2, 'iPhone 15',      'original',     35.00,  70.00),
      (70, 'repuesto', 'REP-021', 'Conector de carga Samsung S24',     1, 'Galaxy S24',     'original',     28.00,  58.00),
      (71, 'repuesto', 'REP-022', 'Conector de carga Redmi Note 12',   4, 'Redmi Note 12',  'alternativa',  12.00,  28.00),
      (72, 'repuesto', 'REP-023', 'Módulo cámara trasera iPhone 15',   2, 'iPhone 15',      'original',    130.00, 250.00),
      (73, 'repuesto', 'REP-024', 'Módulo cámara trasera Galaxy S24',  1, 'Galaxy S24',     'original',    100.00, 195.00),
      (74, 'repuesto', 'REP-025', 'Altavoz Samsung Galaxy S24',        1, 'Galaxy S24',     'alternativa',  15.00,  35.00),
      (75, 'repuesto', 'REP-026', 'Altavoz iPhone 15',                 2, 'iPhone 15',      'alternativa',  18.00,  40.00),
      (76, 'repuesto', 'REP-027', 'Tapa trasera iPhone 15 negro',      2, 'iPhone 15',      'original',     40.00,  80.00),
      (77, 'repuesto', 'REP-028', 'Tapa trasera Samsung S24 blanco',   1, 'Galaxy S24',     'alternativa',  30.00,  60.00),
      (78, 'repuesto', 'REP-029', 'Botones laterales iPhone 15',       2, 'iPhone 15',      'original',     22.00,  48.00),
      (79, 'repuesto', 'REP-030', 'Micrófono iPhone 15',               2, 'iPhone 15',      'alternativa',  14.00,  32.00),
      (80, 'repuesto', 'REP-031', 'Cámara frontal Samsung Galaxy S24', 1, 'Galaxy S24',     'original',     45.00,  90.00)
  `);
  console.log('  OK - 25 repuestos (ids 56-80)');

  // ─── ITEM_CATEGORIAS ────────────────────────────────────────────────────
  console.log('  Insertando item_categorias...');
  await qr.query(`
    INSERT INTO item_categorias (id_item, id_categoria) VALUES
    -- ids 1-9
    (1, 1), (1, 4),
    (2, 1), (2, 4),
    (3, 2),
    (4, 2),
    (5, 3), (5, 4),
    (6, 1), (6, 4),
    (7, 4),
    (8, 4),
    (9, 6),
    -- ids 16-20
    (16, 4),
    (17, 5),
    (18, 6),
    (19, 2),
    (20, 1), (20, 4),
    -- ids 21-55
    (21, 1),
    (22, 1),
    (23, 1),
    (24, 1), (24, 4),
    (25, 1),
    (26, 1), (26, 4),
    (27, 2),
    (28, 2),
    (29, 2),
    (30, 2),
    (31, 2),
    (32, 3),
    (33, 3),
    (34, 1), (34, 4),
    (35, 4),
    (36, 6),
    (37, 6),
    (38, 4),
    (39, 4),
    (40, 1), (40, 4),
    (41, 1), (41, 4),
    (42, 1), (42, 4),
    (43, 2),
    (44, 4),
    (45, 4),
    (46, 1),
    (47, 4),
    (48, 4),
    (49, 4),
    (50, 2),
    (51, 5),
    (52, 5),
    (53, 6),
    (54, 3), (54, 4),
    (55, 2)
  `);
  console.log('  OK - item_categorias para todos los productos (1-55)');

  // ─── INVENTARIO_SEDES ────────────────────────────────────────────────────
  console.log('  Insertando Inventario_Sedes...');
  const productos = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
    28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
    47, 48, 49, 50, 51, 52, 53, 54, 55,
  ];
  const repuestos = [
    10, 11, 12, 13, 14, 15, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
    69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  ];
  const sedes = [1, 2];

  for (const idSede of sedes) {
    for (const idItem of productos) {
      const qty = (idItem * 7 + (idSede - 1) * 11) % 19; // 0-18, deterministic
      await qr.query(
        `INSERT INTO Inventario_Sedes (id_sede, id_item, cantidad_actual, stock_minimo)
         VALUES ($1, $2, $3, 5)`,
        [idSede, idItem, qty],
      );
    }
    for (const idItem of repuestos) {
      const qty = (idItem * 5 + (idSede - 1) * 9) % 19; // 0-18, deterministic
      await qr.query(
        `INSERT INTO Inventario_Sedes (id_sede, id_item, cantidad_actual, stock_minimo)
         VALUES ($1, $2, $3, 3)`,
        [idSede, idItem, qty],
      );
    }
  }
  console.log(
    `  OK - ${(productos.length + repuestos.length) * sedes.length} registros de inventario`,
  );

  // ─── PROMOCIONES ─────────────────────────────────────────────────────────
  console.log('  Insertando Promociones...');

  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_categoria_afectada, valor_descuento, tipo_descuento, estado)
    VALUES
      (1, '10% desc. Cables y Cargadores — permanente', 1, 10.00, 'porcentaje', 'activa')
  `);
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_categoria_afectada, valor_descuento, tipo_descuento, estado, fecha_inicio, fecha_fin)
    VALUES
      (2, 'S/5 off Fundas — Promo 2026', 2, 5.00, 'monto_fijo', 'activa', '2026-01-01', '2026-12-31')
  `);
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_categoria_afectada, valor_descuento, tipo_descuento, estado, dia_semana)
    VALUES
      (3, '15% desc. Auriculares los viernes', 3, 15.00, 'porcentaje', 'activa', 5)
  `);
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_item_afectado, valor_descuento, tipo_descuento, estado)
    VALUES
      (4, '20% desc. Power Bank — permanente', 6, 20.00, 'porcentaje', 'activa')
  `);
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_item_afectado, valor_descuento, tipo_descuento, estado, fecha_inicio, fecha_fin)
    VALUES
      (5, 'S/8 off Cargador 20W — Promo Mayo-Jul 2026', 2, 8.00, 'monto_fijo', 'activa', '2026-05-01', '2026-07-31')
  `);
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_item_afectado, valor_descuento, tipo_descuento, estado, fecha_inicio, fecha_fin)
    VALUES
      (6, '30% Cable USB-C — Black Friday 2025 (VENCIDA)', 1, 30.00, 'porcentaje', 'vencida', '2025-11-29', '2025-11-30')
  `);
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_categoria_afectada, valor_descuento, tipo_descuento, estado)
    VALUES
      (7, 'S/3 off Accesorios — Pausada temporalmente', 4, 3.00, 'monto_fijo', 'pausada')
  `);
  await qr.query(`
    INSERT INTO Promociones
      (id_promocion, nombre, id_item_afectado, valor_descuento, tipo_descuento, estado)
    VALUES
      (8, '25% Funda iPhone 15 — Campaña cancelada', 3, 25.00, 'porcentaje', 'cancelada')
  `);
  console.log('  OK - 8 promociones (activas: 1-5 | inactivas: 6-8)');

  // ─── AJUSTAR SECUENCIAS ──────────────────────────────────────────────────
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Items',       'id_item'),       80)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Promociones', 'id_promocion'),  8)`,
  );

  console.log(
    '[Seed 04] Completado. Items: 49 productos + 31 repuestos = 80 total.\n',
  );
}
