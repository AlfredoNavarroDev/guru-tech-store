SET timezone = 'America/Lima';

-- ============================================================
-- DB-Inserts.sql — Datos de prueba
-- Orden de inserción respeta triggers:
--   1. Tablas maestras
--   2. Compras → dispara creación de Inventario_Sedes
--   3. Ventas  → dispara descuento de stock
--   4. Reparaciones → dispara descuento de stock
--   5. Documentos (Garantias, Pagos, Boletas)
-- ============================================================


-- ============================================================
-- SECCIÓN 1: TABLAS MAESTRAS
-- ============================================================

INSERT INTO Sedes (id_sede, nombre, direccion, telefono, hora_apertura, hora_cierre) VALUES
(1, 'TechStore Lima Centro', 'Jr. de la Unión 620, Lima',            '01-4271890', '09:00', '20:00'),
(2, 'TechStore Miraflores',  'Av. Larco 345, Miraflores',            '01-4459320', '09:30', '21:00'),
(3, 'TechStore San Isidro',  'Calle Las Flores 210, San Isidro',     '01-2214750', '10:00', '20:00');

INSERT INTO Roles (id_rol, nombre_rol) VALUES
(1, 'dueño'),
(2, 'gerente'),
(3, 'vendedor'),
(4, 'tecnico'),
(5, 'abastecedor');

INSERT INTO Marcas (id_marca, nombre) VALUES
(1, 'Samsung'),
(2, 'Apple'),
(3, 'Xiaomi'),
(4, 'Huawei'),
(5, 'Motorola'),
(6, 'Anker');

INSERT INTO Categorias (id_categoria, nombre_categoria) VALUES
(1, 'Cables y Cargadores'),
(2, 'Fundas y Protectores'),
(3, 'Auriculares'),
(4, 'Accesorios'),
(5, 'Pantallas');

INSERT INTO Estados_Reparacion (id_estado, nombre, descripcion, orden, es_final) VALUES
(1, 'Recibido',           'Dispositivo recibido en tienda',            1, false),
(2, 'En Diagnóstico',     'Técnico evaluando el dispositivo',          2, false),
(3, 'Esperando Repuesto', 'En espera de llegada del repuesto',         3, false),
(4, 'En Reparación',      'Reparación en proceso',                     4, false),
(5, 'Listo para Entrega', 'Reparación completada, aguarda al cliente', 5, false),
(6, 'Entregado',          'Dispositivo entregado al cliente',          6, true),
(7, 'Cancelado',          'Reparación cancelada por el cliente',       7, true);

INSERT INTO Proveedores (id_proveedor, ruc, razon_social, contacto_nombre, telefono) VALUES
(1, '20100055508', 'Distribuidora TechParts SAC',   'Carlos Mendieta', '999-123-456'),
(2, '20501234567', 'ImportTech Peru EIRL',           'Lucía Vargas',    '998-765-432'),
(3, '20456789012', 'Repuestos Móviles del Perú SA',  'Jorge Quispe',    '997-444-555');


-- ============================================================
-- SECCIÓN 2: PERSONAS
-- ============================================================

INSERT INTO Empleados (id_empleado, id_sede, tipo_documento, nro_documento, nombre_completo,
                       telefono, sueldo_semanal_soles, estado, direccion_completa, password_hash) VALUES
-- Dueño (sin sede asignada: tiene acceso a todas)
(1,  NULL, 'DNI', '10001001', 'Roberto Sánchez Torres',  '987-001-001', 5000.00, 'activo',     'Av. Brasil 100, Lima',                '$2b$10$test.placeholder.hash.dev.only.xx'),
-- Gerentes
(2,  1, 'DNI', '10002001', 'Andrea López Ríos',       '987-002-001', 1800.00, 'activo',     'Jr. Lampa 210, Lima',                  '$2b$10$test.placeholder.hash.dev.only.xx'),
(3,  2, 'DNI', '10002002', 'Miguel Vargas Huanca',    '987-002-002', 1800.00, 'activo',     'Calle Berlín 45, Miraflores',           '$2b$10$test.placeholder.hash.dev.only.xx'),
(4,  3, 'DNI', '10002003', 'Patricia Chávez Núñez',   '987-002-003', 1800.00, 'activo',     'Los Ficus 30, San Isidro',              '$2b$10$test.placeholder.hash.dev.only.xx'),
-- Vendedores
(5,  1, 'DNI', '10003001', 'Luis Mamani Quispe',      '987-003-001',  900.00, 'activo',     'Jr. Ayacucho 55, Lima',                '$2b$10$test.placeholder.hash.dev.only.xx'),
(6,  2, 'DNI', '10003002', 'Carla Flores Medina',     '987-003-002',  900.00, 'activo',     'Av. Arequipa 720, Miraflores',          '$2b$10$test.placeholder.hash.dev.only.xx'),
(7,  3, 'DNI', '10003003', 'Diego Ramos Torres',      '987-003-003',  900.00, 'activo',     'Av. Javier Prado 430, San Isidro',      '$2b$10$test.placeholder.hash.dev.only.xx'),
-- Técnicos
(8,  1, 'DNI', '10004001', 'Fernando Ccallo Apaza',   '987-004-001', 1200.00, 'activo',     'Av. Colonial 800, Lima',               '$2b$10$test.placeholder.hash.dev.only.xx'),
(9,  2, 'DNI', '10004002', 'Karina Solís Paredes',    '987-004-002', 1200.00, 'activo',     'Jr. Schell 120, Miraflores',            '$2b$10$test.placeholder.hash.dev.only.xx'),
(10, 3, 'DNI', '10004003', 'Julio Condori Mamani',    '987-004-003', 1200.00, 'activo',     'Las Palmeras 18, San Isidro',           '$2b$10$test.placeholder.hash.dev.only.xx'),
-- Abastecedores
(11, 1, 'DNI', '10005001', 'Sandra Huanca Puma',      '987-005-001',  950.00, 'activo',     'Av. Venezuela 340, Lima',              '$2b$10$test.placeholder.hash.dev.only.xx'),
(12, 2, 'DNI', '10005002', 'Óscar Tineo Ríos',        '987-005-002',  950.00, 'activo',     'Jr. Recavarren 89, Miraflores',         '$2b$10$test.placeholder.hash.dev.only.xx'),
-- Caso especial: vendedor suspendido
(13, 3, 'DNI', '10003099', 'Jorge Palma Soto',        '987-003-099',  900.00, 'suspendido', 'Av. Conquistadores 72, San Isidro',     '$2b$10$test.placeholder.hash.dev.only.xx');

INSERT INTO Empleado_Roles (id_empleado, id_rol) VALUES
(1,  1), (2,  2), (3,  2), (4,  2),
(5,  3), (6,  3), (7,  3), (13, 3),
(8,  4), (9,  4), (10, 4),
(11, 5), (12, 5);

INSERT INTO Clientes (id_cliente, tipo_documento, nro_documento, nombre_completo,
                      telefono, direccion_completa) VALUES
(1, 'DNI', '45001001', 'Ana García Pérez',       '976-100-001', 'Av. Salaverry 120, Lima'),
(2, 'DNI', '45002002', 'Pedro Huamán Quispe',    '976-100-002', 'Jr. Callao 55, Lima'),
(3, 'DNI', '45003003', 'Sofía Méndez Castillo',  '976-100-003', 'Calle Los Ángeles 8, Miraflores'),
(4, 'DNI', '45004004', 'Carlos Quispe Tapia',    '976-100-004', 'Jr. Ucayali 340, Lima'),
(5, 'DNI', '45005005', 'Valeria Rojas Aguirre',  '976-100-005', 'Av. Del Ejército 220, Miraflores'),
(6, 'DNI', '45006006', 'Marco Llanos Herrera',   '976-100-006', 'Las Orquídeas 15, San Isidro'),
(7, 'DNI', '45007007', 'Lucía Torres Vega',      '976-100-007', 'Av. Angamos 450, Surquillo'),
(8, 'DNI', '45008008', 'Andrés Palomino Reyes',  '976-100-008', 'Jr. Moquegua 67, Lima');


-- ============================================================
-- SECCIÓN 3: CATÁLOGO
-- ============================================================

-- Productos (requieren id_categoria, sin calidad)
INSERT INTO Items (id_item, tipo, sku, nombre, id_marca, id_categoria, modelo,
                  precio_compra_actual, precio_venta_actual) VALUES
(1, 'producto', 'PRD-001', 'Cable USB-C 2m',               6,    1, NULL,          8.50,  25.00),
(2, 'producto', 'PRD-002', 'Cargador 20W USB-C',           6,    1, NULL,         22.00,  55.00),
(3, 'producto', 'PRD-003', 'Funda silicona iPhone 15',     2,    2, 'iPhone 15',  12.00,  35.00),
(4, 'producto', 'PRD-004', 'Funda Samsung Galaxy S24',     1,    2, 'Galaxy S24', 10.00,  30.00),
(5, 'producto', 'PRD-005', 'Vidrio templado universal 6"', NULL, 2, NULL,          4.00,  15.00),
(6, 'producto', 'PRD-006', 'Auriculares Bluetooth',        6,    3, NULL,         35.00,  85.00),
(7, 'producto', 'PRD-007', 'Soporte magnético vehicular',  NULL, 4, NULL,          9.00,  28.00),
(8, 'producto', 'PRD-008', 'Power bank 10000mAh',          6,    4, NULL,         45.00, 110.00);

-- Repuestos (sin id_categoria, con calidad)
INSERT INTO Items (id_item, tipo, sku, nombre, id_marca, modelo, calidad,
                  precio_compra_actual, precio_venta_actual) VALUES
(9,  'repuesto', 'REP-001', 'Pantalla Samsung Galaxy S21',   1, 'Galaxy S21',    'Original',  120.00, 250.00),
(10, 'repuesto', 'REP-002', 'Pantalla iPhone 13',            2, 'iPhone 13',     'Original',  150.00, 320.00),
(11, 'repuesto', 'REP-003', 'Batería Samsung Galaxy S20',    1, 'Galaxy S20',    'Original',   30.00,  70.00),
(12, 'repuesto', 'REP-004', 'Batería iPhone 12',             2, 'iPhone 12',     'Original',   35.00,  80.00),
(13, 'repuesto', 'REP-005', 'Conector carga Xiaomi Note 11', 3, 'Redmi Note 11', 'Genérico',    8.00,  30.00),
(14, 'repuesto', 'REP-006', 'Cámara trasera Huawei P30',     4, 'P30',           'Original',   55.00, 130.00);


-- ============================================================
-- SECCIÓN 4: PROMOCIONES
-- ============================================================

-- Promo 1: siempre activa, por categoría
INSERT INTO Promociones (id_promocion, nombre, id_categoria_afectada,
                         valor_descuento, tipo_descuento, estado) VALUES
(1, 'Descuento 10% en Cables y Cargadores', 1, 10.00, 'porcentaje', 'activa');

-- Promo 2: activa por rango de fechas, por ítem
INSERT INTO Promociones (id_promocion, nombre, id_item_afectado,
                         valor_descuento, tipo_descuento, estado, fecha_inicio, fecha_fin) VALUES
(2, 'S/5 off Funda Samsung Galaxy S24', 4, 5.00, 'monto_fijo', 'activa', '2026-01-01', '2026-12-31');

-- Promo 3: vencida (para probar que no aparece en v_vendedor_promociones_activas)
INSERT INTO Promociones (id_promocion, nombre, id_categoria_afectada,
                         valor_descuento, tipo_descuento, estado, fecha_inicio, fecha_fin) VALUES
(3, 'Promo Auriculares Diciembre 2025', 3, 15.00, 'porcentaje', 'vencida', '2025-12-01', '2025-12-31');


-- ============================================================
-- SECCIÓN 5: COMPRAS — disparan creación de Inventario_Sedes
-- ============================================================

INSERT INTO Compras_Refill (id_compra, id_empleado_refiller, id_sede_destino, id_proveedor, fecha_compra) VALUES
(1, 11, 1, 1, '2026-01-15 10:00:00'),  -- Sede 1: productos (Sandra, TechParts)
(2, 11, 1, 3, '2026-01-16 11:00:00'),  -- Sede 1: repuestos (Sandra, RepMóviles)
(3, 12, 2, 1, '2026-01-20 09:00:00'),  -- Sede 2: productos (Óscar, TechParts)
(4, 12, 2, 2, '2026-01-21 10:30:00'),  -- Sede 2: repuestos (Óscar, ImportTech)
(5, 11, 3, 1, '2026-02-01 09:00:00'),  -- Sede 3: productos (Sandra, TechParts)
(6, 11, 3, 3, '2026-02-02 10:00:00');  -- Sede 3: repuestos (Sandra, RepMóviles)

-- Compra 1 — Sede 1, productos
-- Trigger: crea Inventario_Sedes(sede=1, item=1..8) y suma stock
INSERT INTO Detalle_Compra_Refill (id_compra, id_item, cantidad_comprada, costo_unidad, precio_venta_sugerido) VALUES
(1, 1, 20,  8.50,  25.00),
(1, 2, 15, 22.00,  55.00),
(1, 3, 10, 12.00,  35.00),
(1, 4, 10, 10.00,  30.00),
(1, 5, 20,  4.00,  15.00),
(1, 6,  8, 35.00,  85.00),
(1, 7, 12,  9.00,  28.00),
(1, 8,  5, 45.00, 110.00);

-- Compra 2 — Sede 1, repuestos
INSERT INTO Detalle_Compra_Refill (id_compra, id_item, cantidad_comprada, costo_unidad, precio_venta_sugerido) VALUES
(2,  9, 3, 120.00, 250.00),
(2, 10, 3, 150.00, 320.00),
(2, 11, 5,  30.00,  70.00),
(2, 12, 5,  35.00,  80.00),
(2, 13, 8,   8.00,  30.00),
(2, 14, 3,  55.00, 130.00);

-- Compra 3 — Sede 2, productos
INSERT INTO Detalle_Compra_Refill (id_compra, id_item, cantidad_comprada, costo_unidad, precio_venta_sugerido) VALUES
(3, 1, 15,  8.50,  25.00),
(3, 2, 10, 22.00,  55.00),
(3, 3,  8, 12.00,  35.00),
(3, 4,  8, 10.00,  30.00),
(3, 5, 15,  4.00,  15.00),
(3, 6,  6, 35.00,  85.00),
(3, 7, 10,  9.00,  28.00),
(3, 8,  4, 45.00, 110.00);

-- Compra 4 — Sede 2, repuestos
INSERT INTO Detalle_Compra_Refill (id_compra, id_item, cantidad_comprada, costo_unidad, precio_venta_sugerido) VALUES
(4,  9, 2, 120.00, 250.00),
(4, 10, 2, 150.00, 320.00),
(4, 11, 4,  30.00,  70.00),
(4, 12, 4,  35.00,  80.00),
(4, 13, 6,   8.00,  30.00),
(4, 14, 2,  55.00, 130.00);

-- Compra 5 — Sede 3, productos
INSERT INTO Detalle_Compra_Refill (id_compra, id_item, cantidad_comprada, costo_unidad, precio_venta_sugerido) VALUES
(5, 1, 10,  8.50,  25.00),
(5, 2,  8, 22.00,  55.00),
(5, 3,  5, 12.00,  35.00),
(5, 4,  6, 10.00,  30.00),
(5, 5, 10,  4.00,  15.00),
(5, 6,  5, 35.00,  85.00),
(5, 7,  7,  9.00,  28.00),
(5, 8,  3, 45.00, 110.00);

-- Compra 6 — Sede 3, repuestos (sin item 14 → caso de repuesto no disponible)
INSERT INTO Detalle_Compra_Refill (id_compra, id_item, cantidad_comprada, costo_unidad, precio_venta_sugerido) VALUES
(6,  9, 2, 120.00, 250.00),
(6, 10, 1, 150.00, 320.00),
(6, 11, 3,  30.00,  70.00),
(6, 12, 3,  35.00,  80.00),
(6, 13, 4,   8.00,  30.00);

-- Ajustar stock_minimo (Inventario_Sedes fue creado por los triggers anteriores)
UPDATE Inventario_Sedes SET stock_minimo = 5 WHERE id_item IN (1, 5);
UPDATE Inventario_Sedes SET stock_minimo = 3 WHERE id_item IN (2, 3, 4, 6, 7, 8);
UPDATE Inventario_Sedes SET stock_minimo = 2 WHERE id_item IN (9, 10, 14);
UPDATE Inventario_Sedes SET stock_minimo = 3 WHERE id_item IN (11, 12, 13);


-- ============================================================
-- SECCIÓN 6: VENTAS — disparan descuento de stock
-- Stock disponible por sede calculado antes de estos INSERTs:
--   Sede 1: item1=20 item2=15 item3=10 item4=10 item5=20 item6=8  item7=12 item8=5
--   Sede 2: item1=15 item2=10 item3=8  item4=8  item5=15 item6=6  item7=10 item8=4
--   Sede 3: item1=10 item2=8  item3=5  item4=6  item5=10 item6=5  item7=7  item8=3
-- ============================================================

INSERT INTO Ventas (id_venta, fecha_emision, id_cliente, id_empleado, id_sede,
                   monto_descuento, tipo_descuento, justificacion_descuento) VALUES
(1,  '2026-02-10 11:30:00', 1, 5, 1,  5.00, 'monto_fijo', 'Descuento cliente frecuente'),
(2,  '2026-02-12 15:00:00', 2, 5, 1,  0.00, NULL, NULL),
(3,  '2026-02-15 10:45:00', 3, 6, 2,  0.00, NULL, NULL),
(4,  '2026-02-18 16:20:00', 4, 6, 2,  0.00, NULL, NULL),
(5,  '2026-02-20 12:00:00', 5, 7, 3,  0.00, NULL, NULL),
(6,  '2026-03-01 09:30:00', 6, 5, 1,  0.00, NULL, NULL),
(7,  '2026-03-05 14:00:00', 7, 6, 2,  0.00, NULL, NULL),
(8,  '2026-03-10 11:00:00', 8, 7, 3,  0.00, NULL, NULL),
(9,  '2026-03-12 17:30:00', NULL, 5, 1, 0.00, NULL, NULL),
(10, '2026-03-15 13:15:00', 1, 6, 2, 10.00, 'monto_fijo', 'Promoción fin de semana');

-- Detalle Venta 1 — Sede 1 (item1 -2, item2 -1)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(1, 1, 2, 25.00,  8.50,  50.00),
(1, 2, 1, 55.00, 22.00,  55.00);

-- Detalle Venta 2 — Sede 1 (item3 -1, item5 -1)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(2, 3, 1, 35.00, 12.00, 35.00),
(2, 5, 1, 15.00,  4.00, 15.00);

-- Detalle Venta 3 — Sede 2 (item6 -1, item1 -2)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(3, 6, 1, 85.00, 35.00,  85.00),
(3, 1, 2, 25.00,  8.50,  50.00);

-- Detalle Venta 4 — Sede 2 (item8 -1, item7 -1)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(4, 8, 1, 110.00, 45.00, 110.00),
(4, 7, 1,  28.00,  9.00,  28.00);

-- Detalle Venta 5 — Sede 3 (item4 -1, item5 -2)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(5, 4, 1, 30.00, 10.00, 30.00),
(5, 5, 2, 15.00,  4.00, 30.00);

-- Detalle Venta 6 — Sede 1 (item4 -1, item6 -1)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(6, 4, 1, 30.00, 10.00,  30.00),
(6, 6, 1, 85.00, 35.00,  85.00);

-- Detalle Venta 7 — Sede 2 (item2 -1, item3 -1)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(7, 2, 1, 55.00, 22.00, 55.00),
(7, 3, 1, 35.00, 12.00, 35.00);

-- Detalle Venta 8 — Sede 3 (item1 -2, item3 -1)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(8, 1, 2, 25.00,  8.50, 50.00),
(8, 3, 1, 35.00, 12.00, 35.00);

-- Detalle Venta 9 — Sede 1 (item5 -3)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(9, 5, 3, 15.00, 4.00, 45.00);

-- Detalle Venta 10 — Sede 2 (item8 -1)
INSERT INTO Detalle_Venta (id_venta, id_item, cantidad, precio_unitario_momento, costo_unitario_momento, importe) VALUES
(10, 8, 1, 110.00, 45.00, 110.00);


-- ============================================================
-- SECCIÓN 7: REPARACIONES — disparan descuento de repuestos
-- Stock repuestos por sede antes de estos INSERTs:
--   Sede 1: item9=3  item10=3  item11=5  item12=5  item13=8  item14=3
--   Sede 2: item9=2  item10=2  item11=4  item12=4  item13=6  item14=2
--   Sede 3: item9=2  item10=1  item11=3  item12=3  item13=4  (sin item14)
-- ============================================================

INSERT INTO Reparaciones (id_reparacion, fecha_ingreso, id_cliente, id_tecnico, id_sede,
                          marca, modelo, imei, esta_encendido,
                          diagnostico_tecnico, id_estado,
                          fecha_terminado, fecha_entrega_cliente,
                          monto_cotizado, monto_descuento) VALUES
-- Rep 1: Entregada — iPhone 13, Sede 1
(1, '2026-01-20 10:00:00', 1, 8, 1,
 'Apple', 'iPhone 13', '123456789012345', false,
 'Pantalla rota por caída, se reemplaza por original',
 6, '2026-01-25 17:00:00', '2026-01-26 12:00:00',
 350.00, 30.00),

-- Rep 2: En Reparación — Samsung S20, Sede 1
(2, '2026-02-05 09:30:00', 2, 8, 1,
 'Samsung', 'Galaxy S20', '234567890123456', true,
 'Batería agotada, requiere cambio inmediato',
 4, NULL, NULL,
 80.00, 0.00),

-- Rep 3: Listo para Entrega — Xiaomi Note 11, Sede 2
(3, '2026-02-10 11:00:00', 3, 9, 2,
 'Xiaomi', 'Redmi Note 11', '345678901234567', true,
 'Conector de carga oxidado y dañado',
 5, '2026-02-14 16:00:00', NULL,
 40.00, 0.00),

-- Rep 4: Recibido — Samsung S20, Sede 2 (sin diagnóstico aún)
(4, '2026-03-01 10:15:00', 4, 9, 2,
 'Samsung', 'Galaxy S20', '456789012345678', false,
 NULL,
 1, NULL, NULL,
 NULL, 0.00),

-- Rep 5: Esperando Repuesto — iPhone 12, Sede 1
(5, '2026-03-08 14:00:00', 5, 8, 1,
 'Apple', 'iPhone 12', '567890123456789', true,
 'Pantalla dañada por presión, esperando repuesto original',
 3, NULL, NULL,
 90.00, 0.00),

-- Rep 6: Entregada — Samsung S21, Sede 3
(6, '2026-02-15 09:00:00', 6, 10, 3,
 'Samsung', 'Galaxy S21', '678901234567890', false,
 'Pantalla rota, reemplazada con pantalla original',
 6, '2026-02-18 15:00:00', '2026-02-20 11:00:00',
 280.00, 0.00),

-- Rep 7: En Diagnóstico — iPhone 12, Sede 2
(7, '2026-03-12 10:00:00', 7, 9, 2,
 'Apple', 'iPhone 12', '789012345678901', true,
 NULL,
 2, NULL, NULL,
 NULL, 0.00),

-- Rep 8: En Reparación — iPhone 13, Sede 3
(8, '2026-03-18 13:30:00', 8, 10, 3,
 'Apple', 'iPhone 13', '890123456789012', true,
 'Batería defectuosa, hinchada',
 4, NULL, NULL,
 90.00, 0.00);

-- Repuestos usados en reparaciones
-- Trigger: descuenta del Inventario_Sedes correspondiente a la sede de la reparación
INSERT INTO Reparacion_Repuestos_Usados (id_reparacion, id_item, cantidad, precio_cobrado, costo_unitario_momento) VALUES
(1, 10, 1, 320.00, 150.00),  -- Rep 1 Sede 1: Pantalla iPhone 13 (item10 -1)
(2, 11, 1,  70.00,  30.00),  -- Rep 2 Sede 1: Batería S20       (item11 -1)
(3, 13, 1,  30.00,   8.00),  -- Rep 3 Sede 2: Conector Xiaomi   (item13 -1)
(6,  9, 1, 250.00, 120.00),  -- Rep 6 Sede 3: Pantalla S21      (item9  -1)
(8, 12, 1,  80.00,  35.00);  -- Rep 8 Sede 3: Batería iPhone 12 (item12 -1)


-- ============================================================
-- SECCIÓN 8: GARANTÍAS
-- ============================================================

INSERT INTO Garantias (id_garantia, id_reparacion, fecha_inicio, fecha_fin, estado) VALUES
(1, 1, '2026-01-26', '2026-04-26', 'vencida'),  -- Rep 1 entregada, 90 días (ya venció)
(3, 6, '2026-02-20', '2026-04-21', 'vencida');  -- Rep 6 entregada, 60 días (ya venció)

INSERT INTO Garantias (id_garantia, id_venta, fecha_inicio, fecha_fin, estado) VALUES
(2, 1,  '2026-02-10', '2026-03-12', 'vencida'),   -- Venta 1, 30 días
(4, 8,  '2026-03-10', '2026-06-08', 'activa'),    -- Venta 8, 90 días (vigente)
(5, 6,  '2026-03-01', '2026-06-29', 'activa'),    -- Venta 6, 90 días (vigente)
(6, 10, '2026-03-15', '2026-06-13', 'activa');    -- Venta 10, 90 días (vigente)


-- ============================================================
-- SECCIÓN 9: PAGOS
-- ============================================================

-- Pagos de ventas
INSERT INTO Pagos (id_venta, metodo_pago, monto, es_adelanto, fecha_pago) VALUES
(1,  'efectivo',     100.00, false, '2026-02-10 11:31:00'),
(2,  'yape',          50.00, false, '2026-02-12 15:01:00'),
(3,  'tarjeta',      135.00, false, '2026-02-15 10:46:00'),
(4,  'efectivo',     138.00, false, '2026-02-18 16:21:00'),
(5,  'efectivo',      60.00, false, '2026-02-20 12:01:00'),
(6,  'tarjeta',      115.00, false, '2026-03-01 09:31:00'),
(7,  'yape',          90.00, false, '2026-03-05 14:01:00'),
(8,  'efectivo',      85.00, false, '2026-03-10 11:01:00'),
(9,  'efectivo',      45.00, false, '2026-03-12 17:31:00'),
(10, 'tarjeta',      100.00, false, '2026-03-15 13:16:00');

-- Pagos de reparaciones
INSERT INTO Pagos (id_reparacion, metodo_pago, monto, es_adelanto, fecha_pago) VALUES
(1, 'efectivo', 290.00, false, '2026-01-26 12:01:00'),  -- Rep 1: pago final (320-30)
(2, 'efectivo',  50.00, true,  '2026-02-05 09:31:00'),  -- Rep 2: adelanto
(3, 'yape',      30.00, false, '2026-02-14 16:01:00'),  -- Rep 3: pago completo
(5, 'efectivo',  40.00, true,  '2026-03-08 14:01:00'),  -- Rep 5: adelanto
(6, 'efectivo', 250.00, false, '2026-02-20 11:01:00'),  -- Rep 6: pago final
(8, 'yape',      50.00, true,  '2026-03-18 13:31:00');  -- Rep 8: adelanto


-- ============================================================
-- SECCIÓN 10: BOLETAS
-- total incluye IGV 18% (subtotal e igv no se almacenan en la tabla)
-- ============================================================

-- Boletas de ventas
INSERT INTO Boletas (numero, fecha_emision, id_venta, total, estado) VALUES
('B001-0001', '2026-02-10 11:32:00', 1,  100.00, 'emitida'),
('B001-0002', '2026-02-12 15:02:00', 2,   50.00, 'emitida'),
('B002-0001', '2026-02-15 10:47:00', 3,  135.00, 'emitida'),
('B002-0002', '2026-02-18 16:22:00', 4,  138.00, 'emitida'),
('B003-0001', '2026-02-20 12:02:00', 5,   60.00, 'emitida'),
('B001-0003', '2026-03-01 09:32:00', 6,  115.00, 'emitida'),
('B002-0003', '2026-03-05 14:02:00', 7,   90.00, 'emitida'),
('B003-0002', '2026-03-10 11:02:00', 8,   85.00, 'emitida'),
('B001-0004', '2026-03-12 17:32:00', 9,   45.00, 'emitida'),
('B002-0004', '2026-03-15 13:17:00', 10, 100.00, 'emitida');

-- Boletas de reparaciones (solo las entregadas y la lista-para-entrega)
INSERT INTO Boletas (numero, fecha_emision, id_reparacion, total, estado) VALUES
('B001-0005', '2026-01-26 12:02:00', 1, 290.00, 'emitida'),
('B002-0005', '2026-02-14 16:02:00', 3,  30.00, 'emitida'),
('B003-0003', '2026-02-20 11:02:00', 6, 250.00, 'emitida');


-- ============================================================
-- SECCIÓN 11: RESETEAR SECUENCIAS
-- Evita conflictos en futuros INSERTs sin ID explícito
-- ============================================================

SELECT setval(pg_get_serial_sequence('Sedes',                    'id_sede'),        (SELECT MAX(id_sede)        FROM Sedes));
SELECT setval(pg_get_serial_sequence('Roles',                    'id_rol'),         (SELECT MAX(id_rol)         FROM Roles));
SELECT setval(pg_get_serial_sequence('Marcas',                   'id_marca'),       (SELECT MAX(id_marca)       FROM Marcas));
SELECT setval(pg_get_serial_sequence('Categorias',               'id_categoria'),   (SELECT MAX(id_categoria)   FROM Categorias));
SELECT setval(pg_get_serial_sequence('Estados_Reparacion',       'id_estado'),      (SELECT MAX(id_estado)      FROM Estados_Reparacion));
SELECT setval(pg_get_serial_sequence('Proveedores',              'id_proveedor'),   (SELECT MAX(id_proveedor)   FROM Proveedores));
SELECT setval(pg_get_serial_sequence('Empleados',                'id_empleado'),    (SELECT MAX(id_empleado)    FROM Empleados));
SELECT setval(pg_get_serial_sequence('Clientes',                 'id_cliente'),     (SELECT MAX(id_cliente)     FROM Clientes));
SELECT setval(pg_get_serial_sequence('Items',                    'id_item'),        (SELECT MAX(id_item)        FROM Items));
SELECT setval(pg_get_serial_sequence('Promociones',              'id_promocion'),   (SELECT MAX(id_promocion)   FROM Promociones));
SELECT setval(pg_get_serial_sequence('Compras_Refill',           'id_compra'),      (SELECT MAX(id_compra)      FROM Compras_Refill));
SELECT setval(pg_get_serial_sequence('Ventas',                   'id_venta'),       (SELECT MAX(id_venta)       FROM Ventas));
SELECT setval(pg_get_serial_sequence('Reparaciones',             'id_reparacion'),  (SELECT MAX(id_reparacion)  FROM Reparaciones));
SELECT setval(pg_get_serial_sequence('Garantias',                'id_garantia'),    (SELECT MAX(id_garantia)    FROM Garantias));


-- ============================================================
-- SECCIÓN 12: CAMBIOS DE PRODUCTO
-- Trigger: devuelve item_devuelto al stock; descuenta item_entregado.
-- Stock sede 1 antes: item3=9, item4=9
-- Stock sede 2 antes: item6=5, item8=2
-- ============================================================

INSERT INTO Cambios_Producto (
  id_cambio, id_venta_origen, id_empleado, id_sede,
  id_item_devuelto, cantidad, precio_devuelto,
  id_item_entregado, precio_entregado,
  diferencia_cobrada, metodo_pago_dif,
  motivo, detalle, fecha_cambio
) VALUES
-- Cambio 1: Sede 1 — Cliente 2 (Venta 2) devuelve Funda iPhone 15 (item3, S/35),
--           recibe Funda Samsung Galaxy S24 (item4, S/30). Sin cobro diferencial.
(1, 2, 5, 1,  3, 1, 35.00,  4,  30.00,  0.00, NULL,   'defecto', 'Funda talla incorrecta para el modelo',    '2026-02-20 10:00:00'),
-- Cambio 2: Sede 2 — Cliente 3 (Venta 3) devuelve Auriculares (item6, S/85),
--           recibe Power bank 10000mAh (item8, S/110). Diferencia S/25 cobrada por yape.
(2, 3, 6, 2,  6, 1, 85.00,  8, 110.00, 25.00, 'yape', 'defecto', 'Auriculares con falla en canal derecho',   '2026-03-08 11:00:00');

SELECT setval(pg_get_serial_sequence('Cambios_Producto',         'id_cambio'),      (SELECT MAX(id_cambio)      FROM Cambios_Producto));
