SET timezone = 'America/Lima';

-- ============================================================
-- DB-Views.sql — 26 vistas organizadas por rol:
--   1-6   : Propietario        (visión global de todas las sedes)
--   7-12  : Gerente            (filtra por id_sede; propietario sin filtro)
--   13-16 : Vendedor
--   17-18 : Vendedor + Técnico (historial del cliente, sin costos de compra)
--   19-22 : Técnico
--   23-26 : Abastecedor
--
-- Visibilidad de costos:
--   Propietario, Gerente, Abastecedor → ven precio_compra y costo_unitario
--     (solo en vistas de detalle; las KPI muestran totales agregados sin costo por línea)
--   Vendedor, Técnico → solo ven precios de venta
-- ============================================================


-- ============================================================
-- SECCIÓN 1: PROPIETARIO
-- ============================================================

-- 1. Resumen KPI por sede
CREATE OR REPLACE VIEW v_propietario_resumen_sedes AS
WITH venta_totales AS (
    SELECT v.id_venta,
           v.id_sede,
           COALESCE(SUM(dv.importe), 0) - v.monto_descuento AS total_venta
    FROM Ventas v
    LEFT JOIN Detalle_Venta dv ON dv.id_venta = v.id_venta
    GROUP BY v.id_venta, v.id_sede, v.monto_descuento
),
ventas_por_sede AS (
    SELECT id_sede,
           COUNT(*)          AS total_ventas,
           SUM(total_venta)  AS ingresos_ventas
    FROM venta_totales
    GROUP BY id_sede
),
rep_totales AS (
    SELECT r.id_reparacion,
           r.id_sede,
           COALESCE(SUM(rru.precio_cobrado * rru.cantidad), 0) - r.monto_descuento AS total_rep
    FROM Reparaciones r
    LEFT JOIN Reparacion_Repuestos_Usados rru ON rru.id_reparacion = r.id_reparacion
    GROUP BY r.id_reparacion, r.id_sede, r.monto_descuento
),
reparaciones_por_sede AS (
    SELECT id_sede,
           COUNT(*)          AS total_reparaciones,
           SUM(total_rep)    AS ingresos_reparaciones
    FROM rep_totales
    GROUP BY id_sede
)
SELECT
    s.id_sede,
    s.nombre                                                                   AS sede,
    s.direccion,
    s.telefono,
    s.esta_habilitada,
    COUNT(DISTINCT e.id_empleado) FILTER (WHERE e.estado = 'activo')           AS empleados_activos,
    COALESCE(vps.total_ventas, 0)                                              AS total_ventas,
    COALESCE(vps.ingresos_ventas, 0)                                           AS ingresos_ventas,
    COALESCE(rps.total_reparaciones, 0)                                        AS total_reparaciones,
    COALESCE(rps.ingresos_reparaciones, 0)                                     AS ingresos_reparaciones,
    COALESCE(vps.ingresos_ventas, 0) + COALESCE(rps.ingresos_reparaciones, 0) AS ingresos_totales
FROM Sedes s
LEFT JOIN Empleados e               ON e.id_sede = s.id_sede
LEFT JOIN ventas_por_sede vps       ON vps.id_sede = s.id_sede
LEFT JOIN reparaciones_por_sede rps ON rps.id_sede = s.id_sede
GROUP BY s.id_sede, s.nombre, s.direccion, s.telefono, s.esta_habilitada,
         vps.total_ventas, vps.ingresos_ventas,
         rps.total_reparaciones, rps.ingresos_reparaciones;


-- 2. Detalle de ventas global (todas las sedes)
CREATE OR REPLACE VIEW v_propietario_ventas_global AS
SELECT
    v.id_venta,
    s.id_sede,
    s.nombre                     AS sede,
    v.fecha_emision,
    c.id_cliente,
    c.nombre_completo            AS cliente,
    c.tipo_documento,
    c.nro_documento,
    e.id_empleado,
    e.nombre_completo            AS vendedor,
    i.id_item,
    i.sku,
    i.nombre                     AS producto,
    i.tipo                       AS tipo_item,
    m.nombre                     AS marca,
    cat.nombre_categoria         AS categoria,
    dv.cantidad,
    dv.precio_unitario_momento,
    dv.costo_unitario_momento,
    dv.importe,
    v.monto_descuento,
    v.tipo_descuento,
    b.numero                     AS nro_boleta,
    b.total                      AS boleta_total
FROM Ventas v
JOIN  Sedes s             ON s.id_sede      = v.id_sede
JOIN  Empleados e         ON e.id_empleado  = v.id_empleado
LEFT JOIN Clientes c      ON c.id_cliente   = v.id_cliente
JOIN  Detalle_Venta dv    ON dv.id_venta    = v.id_venta
JOIN  Items i             ON i.id_item      = dv.id_item
LEFT JOIN Marcas m        ON m.id_marca     = i.id_marca
LEFT JOIN Categorias cat  ON cat.id_categoria = i.id_categoria
LEFT JOIN Boletas b       ON b.id_venta     = v.id_venta;


-- 3. Detalle de reparaciones global (todas las sedes)
CREATE OR REPLACE VIEW v_propietario_reparaciones_global AS
SELECT
    r.id_reparacion,
    s.id_sede,
    s.nombre                     AS sede,
    r.fecha_ingreso,
    r.fecha_terminado,
    r.fecha_entrega_cliente,
    c.id_cliente,
    c.nombre_completo            AS cliente,
    c.telefono                   AS telefono_cliente,
    e.id_empleado                AS id_tecnico,
    e.nombre_completo            AS tecnico,
    r.marca                      AS marca_dispositivo,
    r.modelo                     AS modelo_dispositivo,
    r.imei,
    er.nombre                    AS estado_actual,
    er.es_final,
    r.diagnostico_tecnico,
    r.monto_cotizado,
    r.monto_descuento,
    i.id_item,
    i.nombre                     AS repuesto,
    i.sku                        AS sku_repuesto,
    rru.cantidad                 AS cant_repuesto,
    rru.precio_cobrado,
    rru.costo_unitario_momento,
    b.numero                     AS nro_boleta,
    b.total                      AS boleta_total,
    b.estado                     AS estado_boleta,
    g.fecha_inicio               AS garantia_inicio,
    g.fecha_fin                  AS garantia_fin,
    g.estado                     AS estado_garantia
FROM Reparaciones r
JOIN  Sedes s                          ON s.id_sede    = r.id_sede
JOIN  Clientes c                       ON c.id_cliente = r.id_cliente
JOIN  Empleados e                      ON e.id_empleado = r.id_tecnico
JOIN  Estados_Reparacion er            ON er.id_estado  = r.id_estado
LEFT JOIN Reparacion_Repuestos_Usados rru ON rru.id_reparacion = r.id_reparacion
LEFT JOIN Items i                      ON i.id_item     = rru.id_item
LEFT JOIN Boletas b                    ON b.id_reparacion = r.id_reparacion
LEFT JOIN Garantias g                  ON g.id_reparacion = r.id_reparacion;


-- 4. Inventario global con margen y alerta de stock crítico
CREATE OR REPLACE VIEW v_propietario_inventario_global AS
SELECT
    s.id_sede,
    s.nombre                                              AS sede,
    i.id_item,
    i.sku,
    i.nombre                                              AS item,
    i.tipo,
    m.nombre                                              AS marca,
    cat.nombre_categoria                                  AS categoria,
    i.modelo,
    i.calidad,
    inv.cantidad_actual,
    inv.stock_minimo,
    (inv.cantidad_actual <= inv.stock_minimo)             AS stock_critico,
    i.precio_compra_actual,
    i.precio_venta_actual,
    (i.precio_venta_actual - i.precio_compra_actual)      AS margen_unitario
FROM Inventario_Sedes inv
JOIN  Sedes s           ON s.id_sede      = inv.id_sede
JOIN  Items i           ON i.id_item      = inv.id_item
LEFT JOIN Marcas m      ON m.id_marca     = i.id_marca
LEFT JOIN Categorias cat ON cat.id_categoria = i.id_categoria;


-- 5. Todos los empleados con sus roles (todas las sedes)
CREATE OR REPLACE VIEW v_propietario_empleados_global AS
SELECT
    e.id_empleado,
    s.id_sede,
    s.nombre                  AS sede,
    e.nombre_completo,
    e.tipo_documento,
    e.nro_documento,
    e.telefono,
    e.estado,
    e.sueldo_semanal_soles,
    e.es_extranjero,
    r.nombre_rol              AS rol,
    e.created_by,
    ec.nombre_completo        AS creado_por,
    e.created_at
FROM Empleados e
LEFT JOIN Sedes s      ON s.id_sede      = e.id_sede
LEFT JOIN Roles r      ON r.id_rol       = e.id_rol
LEFT JOIN Empleados ec ON ec.id_empleado = e.created_by;


-- 6-bis. Listado plano de Sedes para CRUD global del Propietario.
-- v_propietario_resumen_sedes es KPI agregada; esta vista es para gestión (crear, editar, eliminar).
CREATE OR REPLACE VIEW v_propietario_sedes AS
SELECT
    s.id_sede,
    s.nombre,
    s.direccion,
    s.telefono,
    s.hora_apertura,
    s.hora_cierre,
    s.esta_habilitada,
    s.created_by,
    e.nombre_completo  AS creado_por,
    s.created_at,
    s.updated_at
FROM Sedes s
LEFT JOIN Empleados e ON e.id_empleado = s.created_by;


-- ============================================================
-- SECCIÓN 2: PROPIETARIO + GERENTE
-- Propietario las consume sin filtro de sede.
-- Gerente las consume con: WHERE id_sede = <su_sede>
-- ============================================================

-- 6. Ventas por sede (resumen por venta con totales)
CREATE OR REPLACE VIEW v_gerente_ventas AS
SELECT
    v.id_venta,
    v.id_sede,
    s.nombre                                      AS sede,
    v.fecha_emision,
    c.nombre_completo                             AS cliente,
    c.telefono                                    AS telefono_cliente,
    e.id_empleado,
    e.nombre_completo                             AS vendedor,
    COUNT(dv.id_detalle_v)                        AS cant_items_distintos,
    SUM(dv.cantidad)                              AS cant_unidades,
    SUM(dv.importe) - v.monto_descuento           AS total_venta,
    v.monto_descuento,
    v.tipo_descuento,
    b.numero                                      AS nro_boleta,
    b.total                                       AS boleta_total,
    b.estado                                      AS estado_boleta
FROM Ventas v
JOIN  Sedes s             ON s.id_sede      = v.id_sede
JOIN  Empleados e         ON e.id_empleado  = v.id_empleado
LEFT JOIN Clientes c      ON c.id_cliente   = v.id_cliente
LEFT JOIN Detalle_Venta dv ON dv.id_venta   = v.id_venta
LEFT JOIN Boletas b       ON b.id_venta     = v.id_venta
GROUP BY v.id_venta, v.id_sede, s.nombre, v.fecha_emision,
         c.nombre_completo, c.telefono, e.id_empleado, e.nombre_completo,
         v.monto_descuento, v.tipo_descuento, b.numero, b.total, b.estado;


-- 7. Reparaciones por sede con costo real calculado
CREATE OR REPLACE VIEW v_gerente_reparaciones AS
SELECT
    r.id_reparacion,
    r.id_sede,
    s.nombre                                                               AS sede,
    r.fecha_ingreso,
    r.fecha_terminado,
    r.fecha_entrega_cliente,
    c.nombre_completo                                                      AS cliente,
    c.telefono                                                             AS telefono_cliente,
    e.id_empleado                                                          AS id_tecnico,
    e.nombre_completo                                                      AS tecnico,
    r.marca                                                                AS marca_dispositivo,
    r.modelo                                                               AS modelo_dispositivo,
    r.imei,
    er.nombre                                                              AS estado_actual,
    er.es_final,
    r.monto_cotizado,
    r.monto_descuento,
    COALESCE(SUM(rru.precio_cobrado * rru.cantidad), 0) - r.monto_descuento AS costo_real,
    COUNT(rru.id_repuesto_u)                                               AS cant_repuestos_usados,
    b.numero                                                               AS nro_boleta,
    b.total                                                                AS boleta_total
FROM Reparaciones r
JOIN  Sedes s                          ON s.id_sede      = r.id_sede
JOIN  Clientes c                       ON c.id_cliente   = r.id_cliente
JOIN  Empleados e                      ON e.id_empleado  = r.id_tecnico
JOIN  Estados_Reparacion er            ON er.id_estado   = r.id_estado
LEFT JOIN Reparacion_Repuestos_Usados rru ON rru.id_reparacion = r.id_reparacion
LEFT JOIN Boletas b                    ON b.id_reparacion = r.id_reparacion
GROUP BY r.id_reparacion, r.id_sede, s.nombre, r.fecha_ingreso,
         r.fecha_terminado, r.fecha_entrega_cliente,
         c.nombre_completo, c.telefono, e.id_empleado, e.nombre_completo,
         r.marca, r.modelo, r.imei, er.nombre, er.es_final,
         r.monto_cotizado, r.monto_descuento, b.numero, b.total;


-- 8. Inventario por sede con alertas y costos
CREATE OR REPLACE VIEW v_gerente_inventario AS
SELECT
    inv.id_inventario,
    inv.id_sede,
    s.nombre                                           AS sede,
    i.id_item,
    i.sku,
    i.nombre                                           AS item,
    i.tipo,
    m.nombre                                           AS marca,
    cat.nombre_categoria                               AS categoria,
    i.modelo,
    i.calidad,
    inv.cantidad_actual,
    inv.stock_minimo,
    (inv.cantidad_actual <= inv.stock_minimo)          AS stock_critico,
    i.precio_compra_actual,
    i.precio_venta_actual
FROM Inventario_Sedes inv
JOIN  Sedes s           ON s.id_sede      = inv.id_sede
JOIN  Items i           ON i.id_item      = inv.id_item
LEFT JOIN Marcas m      ON m.id_marca     = i.id_marca
LEFT JOIN Categorias cat ON cat.id_categoria = i.id_categoria;


-- 9. Empleados por sede con roles
CREATE OR REPLACE VIEW v_gerente_empleados AS
SELECT
    e.id_empleado,
    e.id_sede,
    s.nombre                  AS sede,
    e.nombre_completo,
    e.tipo_documento,
    e.nro_documento,
    e.telefono,
    e.estado,
    e.sueldo_semanal_soles,
    r.nombre_rol              AS rol,
    e.created_by,
    ec.nombre_completo        AS creado_por,
    e.created_at
FROM Empleados e
JOIN  Sedes s      ON s.id_sede      = e.id_sede
LEFT JOIN Roles r  ON r.id_rol       = e.id_rol
LEFT JOIN Empleados ec ON ec.id_empleado = e.created_by;


-- 10. Compras/refill por sede con detalle de ítems y costos
CREATE OR REPLACE VIEW v_gerente_compras AS
SELECT
    cr.id_compra,
    cr.id_sede_destino                              AS id_sede,
    s.nombre                                        AS sede,
    cr.fecha_compra,
    e.nombre_completo                               AS abastecedor,
    p.razon_social                                  AS proveedor,
    p.telefono                                      AS telefono_proveedor,
    i.id_item,
    i.sku,
    i.nombre                                        AS item,
    i.tipo                                          AS tipo_item,
    dc.cantidad_comprada,
    dc.costo_unidad,
    dc.precio_venta_sugerido,
    (dc.cantidad_comprada * dc.costo_unidad)        AS costo_total_linea
FROM Compras_Refill cr
JOIN Sedes s                  ON s.id_sede      = cr.id_sede_destino
JOIN Empleados e              ON e.id_empleado  = cr.id_empleado_refiller
JOIN Proveedores p            ON p.id_proveedor = cr.id_proveedor
JOIN Detalle_Compra_Refill dc ON dc.id_compra   = cr.id_compra
JOIN Items i                  ON i.id_item      = dc.id_item;


-- ============================================================
-- SECCIÓN 3: VENDEDOR
-- ============================================================

-- 11. Catálogo de productos con stock y promoción vigente (sin precio de compra)
CREATE OR REPLACE VIEW v_vendedor_catalogo AS
WITH promo_vigente AS (
    SELECT
        COALESCE(pr.id_item_afectado, ic.id_item) AS id_item,
        pr.nombre          AS promo_nombre,
        pr.tipo_descuento  AS promo_tipo,
        pr.valor_descuento AS promo_valor
    FROM Promociones pr
    LEFT JOIN Item_Categorias ic ON ic.id_categoria = pr.id_categoria_afectada
    WHERE pr.estado = 'activa'
      AND (pr.fecha_inicio IS NULL OR pr.fecha_inicio <= CURRENT_DATE)
      AND (pr.fecha_fin    IS NULL OR pr.fecha_fin    >= CURRENT_DATE)
),
categorias_por_item AS (
    SELECT ic.id_item,
           STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria) AS categorias
    FROM Item_Categorias ic
    JOIN Categorias cat ON cat.id_categoria = ic.id_categoria
    GROUP BY ic.id_item
)
SELECT
    i.id_item,
    i.sku,
    i.nombre                  AS producto,
    m.nombre                  AS marca,
    ci.categorias             AS categoria,
    i.modelo,
    i.precio_venta_actual,
    inv.id_sede,
    s.nombre                  AS sede,
    inv.cantidad_actual        AS stock_disponible,
    pv.promo_nombre,
    pv.promo_tipo,
    pv.promo_valor,
    CASE
        WHEN pv.promo_tipo = 'porcentaje'
            THEN ROUND(i.precio_venta_actual * (1 - pv.promo_valor / 100), 2)
        WHEN pv.promo_tipo = 'monto_fijo'
            THEN GREATEST(i.precio_venta_actual - pv.promo_valor, 0)
        ELSE i.precio_venta_actual
    END                       AS precio_con_descuento
FROM Items i
JOIN  Inventario_Sedes inv   ON inv.id_item = i.id_item
JOIN  Sedes s                ON s.id_sede   = inv.id_sede
LEFT JOIN Marcas m           ON m.id_marca  = i.id_marca
LEFT JOIN categorias_por_item ci ON ci.id_item = i.id_item
LEFT JOIN promo_vigente pv   ON pv.id_item  = i.id_item
WHERE i.tipo = 'producto';


-- 12. Promociones vigentes hoy
CREATE OR REPLACE VIEW v_vendedor_promociones_activas AS
SELECT
    pr.id_promocion,
    pr.nombre,
    pr.tipo_descuento,
    pr.valor_descuento,
    pr.dia_semana,
    pr.fecha_inicio,
    pr.fecha_fin,
    cat.nombre_categoria  AS categoria_afectada,
    i.nombre              AS item_afectado,
    i.sku                 AS sku_item_afectado
FROM Promociones pr
LEFT JOIN Categorias cat ON cat.id_categoria = pr.id_categoria_afectada
LEFT JOIN Items i        ON i.id_item        = pr.id_item_afectado
WHERE pr.estado = 'activa'
  AND (pr.fecha_inicio IS NULL OR pr.fecha_inicio <= CURRENT_DATE)
  AND (pr.fecha_fin    IS NULL OR pr.fecha_fin    >= CURRENT_DATE);


-- 13. Historial de ventas del vendedor (filtrar por id_empleado, sin costos)
CREATE OR REPLACE VIEW v_vendedor_ventas AS
SELECT
    v.id_venta,
    v.id_sede,
    s.nombre                                                          AS sede,
    v.id_empleado,
    e.nombre_completo                                                 AS vendedor,
    v.fecha_emision,
    c.nombre_completo                                                 AS cliente,
    i.nombre                                                          AS producto,
    i.sku,
    dv.cantidad,
    dv.precio_unitario_momento,
    dv.precio_normal_momento,
    dv.importe,
    v.monto_descuento,
    -- Total de cabecera repetido por fila; NO agregar esta columna entre filas de la misma venta.
    SUM(dv.importe) OVER (PARTITION BY v.id_venta) - v.monto_descuento AS total_venta_cabecera,
    b.numero                                                          AS nro_boleta
FROM Ventas v
JOIN  Sedes s             ON s.id_sede      = v.id_sede
JOIN  Empleados e         ON e.id_empleado  = v.id_empleado
LEFT JOIN Clientes c      ON c.id_cliente   = v.id_cliente
JOIN  Detalle_Venta dv    ON dv.id_venta    = v.id_venta
JOIN  Items i             ON i.id_item      = dv.id_item
LEFT JOIN Boletas b       ON b.id_venta     = v.id_venta;


-- 13b. Resumen diario del vendedor (KPIs de dashboard: ventas, ingresos, clientes atendidos)
CREATE OR REPLACE VIEW v_vendedor_resumen_diario AS
WITH ventas_dedup AS (
    SELECT DISTINCT ON (id_venta)
        id_venta,
        id_empleado,
        cliente,
        total_venta_cabecera,
        DATE(fecha_emision AT TIME ZONE 'America/Lima') AS fecha
    FROM v_vendedor_ventas
    ORDER BY id_venta
)
SELECT
    id_empleado,
    fecha,
    COUNT(*)                                         AS ventas,
    COALESCE(SUM(total_venta_cabecera), 0)           AS ingresos,
    COUNT(*)                                         AS clientes_atendidos
FROM ventas_dedup
GROUP BY id_empleado, fecha;


-- 14. Directorio de clientes con conteo de compras
CREATE OR REPLACE VIEW v_vendedor_clientes AS
SELECT
    c.id_cliente,
    c.nombre_completo,
    c.tipo_documento,
    c.nro_documento,
    c.telefono,
    c.direccion_completa,
    c.es_extranjero,
    COUNT(DISTINCT v.id_venta) AS total_compras,
    MAX(v.fecha_emision)       AS ultima_compra
FROM Clientes c
LEFT JOIN Ventas v ON v.id_cliente = c.id_cliente
GROUP BY c.id_cliente, c.nombre_completo, c.tipo_documento,
         c.nro_documento, c.telefono, c.direccion_completa, c.es_extranjero;


-- ============================================================
-- SECCIÓN 4: VENDEDOR + TÉCNICO (historial del cliente)
-- Filtrar por id_cliente. Sin costos de compra.
-- ============================================================

-- 15. Compras pasadas de un cliente (qué compró, cuándo, precio, garantía)
CREATE OR REPLACE VIEW v_historial_cliente_ventas AS
SELECT
    v.id_venta,
    v.id_sede,
    s.nombre                                                          AS sede,
    v.id_cliente,
    c.nombre_completo                                                 AS cliente,
    c.telefono                                                        AS telefono_cliente,
    v.fecha_emision,
    e.nombre_completo                                                 AS vendedor,
    i.id_item,
    i.sku,
    i.nombre                                                          AS producto,
    m.nombre                                                          AS marca,
    cat.nombre_categoria                                              AS categoria,
    dv.cantidad,
    dv.precio_unitario_momento,
    dv.importe,
    v.monto_descuento,
    -- Total de cabecera repetido por fila; NO agregar entre filas de la misma venta.
    SUM(dv.importe) OVER (PARTITION BY v.id_venta) - v.monto_descuento AS total_venta_cabecera,
    b.numero                                                          AS nro_boleta,
    b.total                                                           AS boleta_total,
    g.fecha_inicio                                                    AS garantia_inicio,
    g.fecha_fin                                                       AS garantia_fin,
    g.estado                                                          AS estado_garantia
FROM Ventas v
JOIN  Sedes s             ON s.id_sede      = v.id_sede
JOIN  Clientes c          ON c.id_cliente   = v.id_cliente
JOIN  Empleados e         ON e.id_empleado  = v.id_empleado
JOIN  Detalle_Venta dv    ON dv.id_venta    = v.id_venta
JOIN  Items i             ON i.id_item      = dv.id_item
LEFT JOIN Marcas m        ON m.id_marca     = i.id_marca
LEFT JOIN Categorias cat  ON cat.id_categoria = i.id_categoria
LEFT JOIN Boletas b       ON b.id_venta     = v.id_venta
LEFT JOIN Garantias g     ON g.id_venta     = v.id_venta;


-- 16. Reparaciones pasadas de un cliente (dispositivo, técnico, repuestos, garantía)
CREATE OR REPLACE VIEW v_historial_cliente_reparaciones AS
SELECT
    r.id_reparacion,
    r.id_sede,
    s.nombre                  AS sede,
    r.id_cliente,
    c.nombre_completo         AS cliente,
    c.telefono                AS telefono_cliente,
    r.fecha_ingreso,
    r.fecha_terminado,
    r.fecha_entrega_cliente,
    e.nombre_completo         AS tecnico,
    r.marca                   AS marca_dispositivo,
    r.modelo                  AS modelo_dispositivo,
    r.imei,
    er.nombre                 AS estado_actual,
    er.es_final,
    r.diagnostico_tecnico,
    r.monto_cotizado,
    r.monto_descuento,
    i.nombre                  AS repuesto,
    i.sku                     AS sku_repuesto,
    rru.cantidad              AS cant_repuesto,
    rru.precio_cobrado,
    b.numero                  AS nro_boleta,
    b.total                   AS boleta_total,
    g.fecha_inicio            AS garantia_inicio,
    g.fecha_fin               AS garantia_fin,
    g.estado                  AS estado_garantia
FROM Reparaciones r
JOIN  Sedes s                          ON s.id_sede    = r.id_sede
JOIN  Clientes c                       ON c.id_cliente = r.id_cliente
JOIN  Empleados e                      ON e.id_empleado = r.id_tecnico
JOIN  Estados_Reparacion er            ON er.id_estado  = r.id_estado
LEFT JOIN Reparacion_Repuestos_Usados rru ON rru.id_reparacion = r.id_reparacion
LEFT JOIN Items i                      ON i.id_item     = rru.id_item
LEFT JOIN Boletas b                    ON b.id_reparacion = r.id_reparacion
LEFT JOIN Garantias g                  ON g.id_reparacion = r.id_reparacion;


-- ============================================================
-- SECCIÓN 5: TÉCNICO
-- ============================================================

-- 17. Cola de reparaciones activas (estados no finales)
CREATE OR REPLACE VIEW v_tecnico_reparaciones_activas AS
SELECT
    r.id_reparacion,
    r.id_sede,
    s.nombre              AS sede,
    r.id_tecnico,
    e.nombre_completo     AS tecnico,
    r.fecha_ingreso,
    c.nombre_completo     AS cliente,
    c.telefono            AS telefono_cliente,
    r.marca               AS marca_dispositivo,
    r.modelo              AS modelo_dispositivo,
    r.imei,
    r.esta_encendido,
    r.diagnostico_tecnico,
    r.checklist_estado,
    er.nombre             AS estado_actual,
    er.orden              AS orden_estado,
    r.monto_cotizado,
    r.fotos
FROM Reparaciones r
JOIN Sedes s               ON s.id_sede     = r.id_sede
JOIN Clientes c            ON c.id_cliente  = r.id_cliente
JOIN Empleados e           ON e.id_empleado = r.id_tecnico
JOIN Estados_Reparacion er ON er.id_estado  = r.id_estado
WHERE er.es_final = false;


-- 18. Historial de reparaciones del técnico con repuestos (sin costo de compra)
CREATE OR REPLACE VIEW v_tecnico_historial_reparaciones AS
SELECT
    r.id_reparacion,
    r.id_sede,
    s.nombre              AS sede,
    r.id_tecnico,
    e.nombre_completo     AS tecnico,
    r.fecha_ingreso,
    r.fecha_terminado,
    r.fecha_entrega_cliente,
    c.nombre_completo     AS cliente,
    r.marca               AS marca_dispositivo,
    r.modelo              AS modelo_dispositivo,
    r.imei,
    er.nombre             AS estado_final,
    er.es_final,
    r.diagnostico_tecnico,
    r.monto_cotizado,
    r.monto_descuento,
    i.nombre              AS repuesto,
    i.sku                 AS sku_repuesto,
    rru.cantidad          AS cant_repuesto,
    rru.precio_cobrado,
    g.fecha_inicio        AS garantia_inicio,
    g.fecha_fin           AS garantia_fin,
    g.estado              AS estado_garantia
FROM Reparaciones r
JOIN  Sedes s                          ON s.id_sede    = r.id_sede
JOIN  Clientes c                       ON c.id_cliente = r.id_cliente
JOIN  Empleados e                      ON e.id_empleado = r.id_tecnico
JOIN  Estados_Reparacion er            ON er.id_estado  = r.id_estado
LEFT JOIN Reparacion_Repuestos_Usados rru ON rru.id_reparacion = r.id_reparacion
LEFT JOIN Items i                      ON i.id_item     = rru.id_item
LEFT JOIN Garantias g                  ON g.id_reparacion = r.id_reparacion;


-- 19. Repuestos disponibles por sede (sin precio de compra)
CREATE OR REPLACE VIEW v_tecnico_repuestos_disponibles AS
SELECT
    i.id_item,
    i.sku,
    i.nombre              AS repuesto,
    m.nombre              AS marca,
    i.modelo,
    i.calidad,
    i.especificaciones,
    inv.id_sede,
    s.nombre              AS sede,
    inv.cantidad_actual   AS stock_disponible,
    i.precio_venta_actual
FROM Items i
JOIN  Inventario_Sedes inv ON inv.id_item  = i.id_item
JOIN  Sedes s              ON s.id_sede    = inv.id_sede
LEFT JOIN Marcas m         ON m.id_marca   = i.id_marca
WHERE i.tipo = 'repuesto'
  AND inv.cantidad_actual > 0;


-- 20. Estados de reparación ordenados (referencia para cambio de estado)
CREATE OR REPLACE VIEW v_tecnico_estados_reparacion AS
SELECT
    id_estado,
    nombre,
    descripcion,
    orden,
    es_final
FROM Estados_Reparacion
ORDER BY orden;


-- ============================================================
-- SECCIÓN 6: ABASTECEDOR
-- ============================================================

-- 21. Stock actual por sede con indicador de reposición
CREATE OR REPLACE VIEW v_abastecedor_stock_actual AS
WITH categorias_por_item AS (
    SELECT ic.id_item,
           STRING_AGG(cat.nombre_categoria, ', ' ORDER BY cat.nombre_categoria) AS categorias
    FROM Item_Categorias ic
    JOIN Categorias cat ON cat.id_categoria = ic.id_categoria
    GROUP BY ic.id_item
)
SELECT
    inv.id_inventario,
    inv.id_sede,
    s.nombre                                        AS sede,
    i.id_item,
    i.sku,
    i.nombre                                        AS item,
    i.tipo,
    m.nombre                                        AS marca,
    ci.categorias                                   AS categoria,
    i.modelo,
    i.calidad,
    inv.cantidad_actual,
    inv.stock_minimo,
    (inv.cantidad_actual - inv.stock_minimo)        AS diferencia_stock,
    (inv.cantidad_actual <= inv.stock_minimo)       AS requiere_reposicion,
    i.precio_compra_actual
FROM Inventario_Sedes inv
JOIN  Sedes s                ON s.id_sede  = inv.id_sede
JOIN  Items i                ON i.id_item  = inv.id_item
LEFT JOIN Marcas m           ON m.id_marca = i.id_marca
LEFT JOIN categorias_por_item ci ON ci.id_item = i.id_item;


-- 22. Solo ítems bajo stock mínimo, ordenados por urgencia
CREATE OR REPLACE VIEW v_abastecedor_stock_critico AS
SELECT
    inv.id_sede,
    s.nombre                                        AS sede,
    i.id_item,
    i.sku,
    i.nombre                                        AS item,
    i.tipo,
    m.nombre                                        AS marca,
    i.modelo,
    inv.cantidad_actual,
    inv.stock_minimo,
    (inv.stock_minimo - inv.cantidad_actual)        AS unidades_faltantes,
    i.precio_compra_actual
FROM Inventario_Sedes inv
JOIN  Sedes s       ON s.id_sede  = inv.id_sede
JOIN  Items i       ON i.id_item  = inv.id_item
LEFT JOIN Marcas m  ON m.id_marca = i.id_marca
WHERE inv.cantidad_actual <= inv.stock_minimo
ORDER BY (inv.stock_minimo - inv.cantidad_actual) DESC;


-- 23. Historial completo de órdenes de compra por sede
CREATE OR REPLACE VIEW v_abastecedor_historial_compras AS
SELECT
    cr.id_compra,
    cr.id_sede_destino                           AS id_sede,
    s.nombre                                     AS sede,
    cr.fecha_compra,
    e.id_empleado                                AS id_abastecedor,
    e.nombre_completo                            AS abastecedor,
    p.id_proveedor,
    p.razon_social                               AS proveedor,
    p.telefono                                   AS telefono_proveedor,
    i.id_item,
    i.sku,
    i.nombre                                     AS item,
    i.tipo                                       AS tipo_item,
    m.nombre                                     AS marca,
    dc.cantidad_comprada,
    dc.costo_unidad,
    dc.precio_venta_sugerido,
    (dc.cantidad_comprada * dc.costo_unidad)     AS costo_total_linea
FROM Compras_Refill cr
JOIN  Sedes s                  ON s.id_sede      = cr.id_sede_destino
JOIN  Empleados e              ON e.id_empleado  = cr.id_empleado_refiller
JOIN  Proveedores p            ON p.id_proveedor = cr.id_proveedor
JOIN  Detalle_Compra_Refill dc ON dc.id_compra   = cr.id_compra
JOIN  Items i                  ON i.id_item      = dc.id_item
LEFT JOIN Marcas m             ON m.id_marca     = i.id_marca;


-- 24. Directorio de proveedores con métricas de compra
CREATE OR REPLACE VIEW v_abastecedor_proveedores AS
SELECT
    p.id_proveedor,
    p.ruc,
    p.razon_social,
    p.contacto_nombre,
    p.telefono,
    COUNT(DISTINCT cr.id_compra)                                        AS total_ordenes,
    MAX(cr.fecha_compra)                                                AS ultima_compra,
    COALESCE(SUM(dc.cantidad_comprada * dc.costo_unidad), 0)            AS total_comprado
FROM Proveedores p
LEFT JOIN Compras_Refill cr         ON cr.id_proveedor = p.id_proveedor
LEFT JOIN Detalle_Compra_Refill dc  ON dc.id_compra    = cr.id_compra
GROUP BY p.id_proveedor, p.ruc, p.razon_social, p.contacto_nombre, p.telefono;


-- ============================================================
-- SECCIÓN 7: PROPIETARIO + GERENTE — CAMBIOS DE PRODUCTO
-- Propietario la consume sin filtro de sede.
-- Gerente la consume con: WHERE id_sede = <su_sede>
-- ============================================================

-- 25. Historial de cambios de producto por sede
CREATE OR REPLACE VIEW v_gerente_cambios AS
SELECT
    cp.id_cambio,
    cp.id_sede,
    s.nombre                    AS sede,
    cp.fecha_cambio,
    cp.id_venta_origen,
    v.fecha_emision             AS fecha_venta_origen,
    v.id_cliente,
    c.nombre_completo           AS cliente,
    c.telefono                  AS telefono_cliente,
    cp.id_empleado,
    e.nombre_completo           AS empleado,
    cp.id_item_devuelto,
    idev.sku                    AS sku_devuelto,
    idev.nombre                 AS item_devuelto,
    cp.precio_devuelto,
    cp.id_item_entregado,
    ient.sku                    AS sku_entregado,
    ient.nombre                 AS item_entregado,
    cp.precio_entregado,
    cp.cantidad,
    cp.diferencia_cobrada,
    cp.metodo_pago_dif,
    cp.referencia_transaccion,
    cp.motivo,
    cp.detalle,
    g.fecha_inicio              AS garantia_inicio,
    g.fecha_fin                 AS garantia_fin,
    g.estado                    AS estado_garantia
FROM Cambios_Producto cp
JOIN  Sedes s           ON s.id_sede      = cp.id_sede
JOIN  Ventas v          ON v.id_venta     = cp.id_venta_origen
JOIN  Empleados e       ON e.id_empleado  = cp.id_empleado
LEFT JOIN Clientes c    ON c.id_cliente   = v.id_cliente
JOIN  Items idev        ON idev.id_item   = cp.id_item_devuelto
JOIN  Items ient        ON ient.id_item   = cp.id_item_entregado
LEFT JOIN Garantias g   ON g.id_garantia  = cp.id_garantia;


-- ============================================================
-- SECCIÓN 8: SERVICIO DE BOLETAS
-- Vista interna usada exclusivamente por BoletasService.
-- No filtrar por rol — el servicio filtra por id_venta.
-- ============================================================

-- 26. Datos completos para renderizado de boleta de venta
CREATE OR REPLACE VIEW v_boleta_venta AS
SELECT
    v.id_venta,
    v.id_sede,
    s.nombre                                                            AS sede_nombre,
    s.direccion                                                         AS sede_direccion,
    s.telefono                                                          AS sede_telefono,
    v.id_empleado,
    e.nombre_completo                                                   AS vendedor,
    v.fecha_emision,
    v.monto_descuento,
    v.tipo_descuento,
    v.id_cliente,
    c.nombre_completo                                                   AS cliente_nombre,
    c.tipo_documento                                                    AS cliente_tipo_doc,
    c.nro_documento                                                     AS cliente_nro_doc,
    i.nombre                                                            AS producto,
    i.sku,
    dv.cantidad,
    dv.precio_unitario_momento,
    dv.importe,
    -- Total de cabecera repetido por fila; NO agregar entre filas de la misma venta.
    SUM(dv.importe) OVER (PARTITION BY v.id_venta) - v.monto_descuento AS total_venta
FROM Ventas v
JOIN  Sedes s           ON s.id_sede     = v.id_sede
JOIN  Empleados e       ON e.id_empleado = v.id_empleado
LEFT JOIN Clientes c    ON c.id_cliente  = v.id_cliente
JOIN  Detalle_Venta dv  ON dv.id_venta   = v.id_venta
JOIN  Items i           ON i.id_item     = dv.id_item;
