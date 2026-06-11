SET timezone = 'America/Lima';

-- ============================================================================
-- Triggers del sistema: integridad de datos, movimientos de inventario
-- y auditoría en Logs_Sistema. Protege contra race conditions en ventas
-- y reparaciones concurrentes.
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: FUNCIONES HELPER (invocadas por los triggers)
-- ============================================================================

-- Auto-asigna updated_at = now() en cada UPDATE. Se adjunta a todas las tablas con esa columna.
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Registra una operación en Logs_Sistema.
-- Params: tipo_accion, tabla_afectada, tipo_referencia, id_referencia,
--         id_empleado (nullable), id_sede (nullable), detalle_cambio.
CREATE OR REPLACE FUNCTION fn_log_operacion(
  p_tipo_accion     VARCHAR,
  p_tabla_afectada  VARCHAR,
  p_tipo_referencia VARCHAR,
  p_id_referencia   INT,
  p_id_empleado     INT,
  p_id_sede         INT,
  p_detalle_cambio  TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO Logs_Sistema (
    tipo_accion, tabla_afectada, tipo_referencia,
    id_referencia, id_empleado, id_sede, detalle_cambio
  ) VALUES (
    p_tipo_accion, p_tabla_afectada, p_tipo_referencia,
    p_id_referencia, p_id_empleado, p_id_sede, p_detalle_cambio
  );
END;
$$ LANGUAGE plpgsql;

-- Registra cambio de estado en Logs_Sistema. Usa tipo_accion='cambio_estado'
-- y formatea el detalle como "estado: anterior → nuevo".
CREATE OR REPLACE FUNCTION fn_log_cambio_estado(
  p_tabla_afectada  VARCHAR,
  p_tipo_referencia VARCHAR,
  p_id_referencia   INT,
  p_id_empleado     INT,
  p_id_sede         INT,
  p_estado_anterior VARCHAR,
  p_estado_nuevo    VARCHAR
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO Logs_Sistema (
    tipo_accion, tabla_afectada, tipo_referencia,
    id_referencia, id_empleado, id_sede, detalle_cambio
  ) VALUES (
    'cambio_estado', p_tabla_afectada, p_tipo_referencia,
    p_id_referencia, p_id_empleado, p_id_sede,
    'estado: ' || p_estado_anterior || ' → ' || p_estado_nuevo
  );
END;
$$ LANGUAGE plpgsql;

-- Retorna el id del empleado desde la variable de sesión 'app.actor_id'.
-- El backend debe ejecutar: SET LOCAL app.actor_id = '<id_empleado>';
-- Retorna NULL si no está definida (seed, migraciones, etc.).
CREATE OR REPLACE FUNCTION fn_get_actor_id()
RETURNS INT AS $$
DECLARE
  v_setting TEXT;
BEGIN
  v_setting := current_setting('app.actor_id', true);
  IF v_setting IS NULL OR v_setting = '' THEN
    RETURN NULL;
  END IF;
  RETURN v_setting::INT;
END;
$$ LANGUAGE plpgsql;

-- Retorna id_inventario para (sede, item). NULL si no existe.
CREATE OR REPLACE FUNCTION fn_get_id_inventario(
  p_id_sede INT,
  p_id_item INT
)
RETURNS INT AS $$
DECLARE
  v_id INT;
BEGIN
  SELECT id_inventario INTO v_id
  FROM Inventario_Sedes
  WHERE id_sede = p_id_sede
    AND id_item = p_id_item;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECCIÓN 2: TRIGGERS updated_at (actualizan la columna en cada UPDATE)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_sedes_updated_at ON Sedes;
CREATE TRIGGER trg_sedes_updated_at
  BEFORE UPDATE ON Sedes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_empleados_updated_at ON Empleados;
CREATE TRIGGER trg_empleados_updated_at
  BEFORE UPDATE ON Empleados
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON Clientes;
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON Clientes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_items_updated_at ON Items;
CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON Items
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON Proveedores;
CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON Proveedores
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_compras_refill_updated_at ON Compras_Refill;
CREATE TRIGGER trg_compras_refill_updated_at
  BEFORE UPDATE ON Compras_Refill
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_promociones_updated_at ON Promociones;
CREATE TRIGGER trg_promociones_updated_at
  BEFORE UPDATE ON Promociones
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_ventas_updated_at ON Ventas;
CREATE TRIGGER trg_ventas_updated_at
  BEFORE UPDATE ON Ventas
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_reparaciones_updated_at ON Reparaciones;
CREATE TRIGGER trg_reparaciones_updated_at
  BEFORE UPDATE ON Reparaciones
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_garantias_updated_at ON Garantias;
CREATE TRIGGER trg_garantias_updated_at
  BEFORE UPDATE ON Garantias
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- SECCIÓN 3: TRIGGERS DE INVENTARIO — COMPRAS (gestionan stock en detalles de compra)
-- ============================================================================

-- Al insertar detalle de compra: crea registro de inventario si no existe
-- (ON CONFLICT previene race conditions) y suma cantidad al stock.
-- Side effects: INSERT en Movimientos_Inventario y Logs_Sistema.
CREATE OR REPLACE FUNCTION trg_det_compra_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  -- Obtener sede y empleado desde la cabecera de compra.
  SELECT id_sede_destino, id_empleado_refiller
  INTO v_id_sede, v_id_empleado
  FROM Compras_Refill
  WHERE id_compra = NEW.id_compra;

  -- Buscar o crear registro de inventario (sede + item).
  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  -- ON CONFLICT evita error de duplicado en compras simultáneas.
  IF v_id_inventario IS NULL THEN
    INSERT INTO Inventario_Sedes (id_sede, id_item, cantidad_actual, stock_minimo)
    VALUES (v_id_sede, NEW.id_item, 0, 0)
    ON CONFLICT (id_sede, id_item) DO NOTHING
    RETURNING id_inventario INTO v_id_inventario;

    -- Si otra transacción ya lo creó, re-leer el id.
    IF v_id_inventario IS NULL THEN
      v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);
    END IF;
  END IF;

  -- Incrementar stock (operación atómica en PostgreSQL).
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual + NEW.cantidad_comprada
  WHERE id_inventario = v_id_inventario;

  -- Movimiento de inventario: cantidad positiva = ingreso.
  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'compra', NEW.cantidad_comprada,
    NEW.id_compra, v_id_empleado
  );

  -- Auditoría: creación de detalle de compra.
  PERFORM fn_log_operacion(
    'creacion', 'Detalle_Compra_Refill', 'compra',
    NEW.id_compra, v_id_empleado, v_id_sede,
    'Item: ' || NEW.id_item || ', Cantidad: ' || NEW.cantidad_comprada ||
    ', Costo: ' || NEW.costo_unidad
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_det_compra_insert ON Detalle_Compra_Refill;
CREATE TRIGGER trg_det_compra_insert
  AFTER INSERT ON Detalle_Compra_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_det_compra_insert();

-- Al modificar cantidad en detalle de compra: ajusta stock por delta.
-- Si se reduce, valida que no deje stock negativo.
CREATE OR REPLACE FUNCTION trg_det_compra_update()
RETURNS TRIGGER AS $$
DECLARE
  v_delta        INT;
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  v_delta := NEW.cantidad_comprada - OLD.cantidad_comprada;

  -- Sin cambios en cantidad, salir.
  IF v_delta = 0 THEN
    RETURN NEW;
  END IF;

  SELECT id_sede_destino, id_empleado_refiller
  INTO v_id_sede, v_id_empleado
  FROM Compras_Refill
  WHERE id_compra = NEW.id_compra;

  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  -- Si se reduce, validar que el stock no quede negativo.
  IF v_delta < 0 THEN
    UPDATE Inventario_Sedes
    SET cantidad_actual = cantidad_actual + v_delta
    WHERE id_inventario = v_id_inventario
      AND cantidad_actual + v_delta >= 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se puede reducir la cantidad comprada: el stock actual (%) es insuficiente para restar %',
        (SELECT cantidad_actual FROM Inventario_Sedes WHERE id_inventario = v_id_inventario), -v_delta;
    END IF;
  ELSE
    UPDATE Inventario_Sedes
    SET cantidad_actual = cantidad_actual + v_delta
    WHERE id_inventario = v_id_inventario;
  END IF;

  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'compra', v_delta,
    NEW.id_compra, v_id_empleado
  );

  PERFORM fn_log_operacion(
    'actualizacion', 'Detalle_Compra_Refill', 'compra',
    NEW.id_compra, v_id_empleado, v_id_sede,
    'Cantidad ajustada: ' || OLD.cantidad_comprada || ' → ' || NEW.cantidad_comprada
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_det_compra_update ON Detalle_Compra_Refill;
CREATE TRIGGER trg_det_compra_update
  AFTER UPDATE OF cantidad_comprada ON Detalle_Compra_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_det_compra_update();

-- Al eliminar detalle de compra: resta cantidad del stock y registra movimiento inverso.
CREATE OR REPLACE FUNCTION trg_det_compra_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  SELECT id_sede_destino, id_empleado_refiller
  INTO v_id_sede, v_id_empleado
  FROM Compras_Refill
  WHERE id_compra = OLD.id_compra;

  v_id_inventario := fn_get_id_inventario(v_id_sede, OLD.id_item);

  -- Restar del stock (atómico).
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual - OLD.cantidad_comprada
  WHERE id_inventario = v_id_inventario;

  -- Movimiento inverso: cantidad negativa = egreso.
  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'compra', -OLD.cantidad_comprada,
    OLD.id_compra, v_id_empleado
  );

  PERFORM fn_log_operacion(
    'eliminacion', 'Detalle_Compra_Refill', 'compra',
    OLD.id_compra, v_id_empleado, v_id_sede,
    'Item: ' || OLD.id_item || ', Cantidad eliminada: ' || OLD.cantidad_comprada
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_det_compra_delete ON Detalle_Compra_Refill;
CREATE TRIGGER trg_det_compra_delete
  AFTER DELETE ON Detalle_Compra_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_det_compra_delete();

-- ============================================================================
-- SECCIÓN 4: TRIGGERS DE INVENTARIO — VENTAS (validan y descuentan stock atómicamente)
-- ============================================================================

-- Al insertar detalle de venta: valida stock y descuenta atómicamente.
-- El WHERE cantidad_actual >= NEW.cantidad previene que dos vendedores
-- vendan el mismo stock simultáneamente. Sin stock → RAISE EXCEPTION.
CREATE OR REPLACE FUNCTION trg_det_venta_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  -- Obtener sede y vendedor desde la cabecera de venta.
  SELECT id_sede, id_empleado
  INTO v_id_sede, v_id_empleado
  FROM Ventas
  WHERE id_venta = NEW.id_venta;

  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  -- Sin registro de inventario para este item en esta sede → no se puede vender.
  IF v_id_inventario IS NULL THEN
    RAISE EXCEPTION 'No existe inventario para el item % en la sede %', NEW.id_item, v_id_sede;
  END IF;

  -- Validación + descuento atómico: el WHERE bloquea la fila.
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual - NEW.cantidad
  WHERE id_inventario = v_id_inventario
    AND cantidad_actual >= NEW.cantidad;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente para el item % en la sede % (disponible: %, solicitado: %)',
      NEW.id_item, v_id_sede,
      (SELECT cantidad_actual FROM Inventario_Sedes WHERE id_inventario = v_id_inventario),
      NEW.cantidad;
  END IF;

  -- Movimiento de egreso: cantidad negativa.
  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'venta', -NEW.cantidad,
    NEW.id_venta, v_id_empleado
  );

  PERFORM fn_log_operacion(
    'creacion', 'Detalle_Venta', 'venta',
    NEW.id_venta, v_id_empleado, v_id_sede,
    'Item: ' || NEW.id_item || ', Cantidad: ' || NEW.cantidad ||
    ', Precio: ' || NEW.precio_unitario_momento
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_det_venta_insert ON Detalle_Venta;
CREATE TRIGGER trg_det_venta_insert
  BEFORE INSERT ON Detalle_Venta
  FOR EACH ROW EXECUTE FUNCTION trg_det_venta_insert();

-- Al modificar cantidad en detalle de venta: ajusta stock por delta.
-- Si aumenta, valida stock atómicamente.
CREATE OR REPLACE FUNCTION trg_det_venta_update()
RETURNS TRIGGER AS $$
DECLARE
  v_delta        INT;
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  v_delta := NEW.cantidad - OLD.cantidad;

  IF v_delta = 0 THEN
    RETURN NEW;
  END IF;

  SELECT id_sede, id_empleado
  INTO v_id_sede, v_id_empleado
  FROM Ventas
  WHERE id_venta = NEW.id_venta;

  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  -- Si aumenta la cantidad, validar stock.
  IF v_delta > 0 THEN
    UPDATE Inventario_Sedes
    SET cantidad_actual = cantidad_actual - v_delta
    WHERE id_inventario = v_id_inventario
      AND cantidad_actual >= v_delta;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para ajustar la venta (item %, sede %)', NEW.id_item, v_id_sede;
    END IF;
  ELSE
    -- Si disminuye, devolver stock (v_delta negativo → sumar).
    UPDATE Inventario_Sedes
    SET cantidad_actual = cantidad_actual - v_delta
    WHERE id_inventario = v_id_inventario;
  END IF;

  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'venta', -v_delta,
    NEW.id_venta, v_id_empleado
  );

  PERFORM fn_log_operacion(
    'actualizacion', 'Detalle_Venta', 'venta',
    NEW.id_venta, v_id_empleado, v_id_sede,
    'Cantidad ajustada: ' || OLD.cantidad || ' → ' || NEW.cantidad
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_det_venta_update ON Detalle_Venta;
CREATE TRIGGER trg_det_venta_update
  BEFORE UPDATE OF cantidad ON Detalle_Venta
  FOR EACH ROW EXECUTE FUNCTION trg_det_venta_update();

-- Al eliminar detalle de venta: devuelve stock y registra movimiento inverso.
CREATE OR REPLACE FUNCTION trg_det_venta_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  SELECT id_sede, id_empleado
  INTO v_id_sede, v_id_empleado
  FROM Ventas
  WHERE id_venta = OLD.id_venta;

  v_id_inventario := fn_get_id_inventario(v_id_sede, OLD.id_item);

  -- Devolver stock al inventario.
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual + OLD.cantidad
  WHERE id_inventario = v_id_inventario;

  -- Movimiento inverso: cantidad positiva = devolución.
  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'venta', OLD.cantidad,
    OLD.id_venta, v_id_empleado
  );

  PERFORM fn_log_operacion(
    'eliminacion', 'Detalle_Venta', 'venta',
    OLD.id_venta, v_id_empleado, v_id_sede,
    'Item: ' || OLD.id_item || ', Cantidad devuelta: ' || OLD.cantidad
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_det_venta_delete ON Detalle_Venta;
CREATE TRIGGER trg_det_venta_delete
  AFTER DELETE ON Detalle_Venta
  FOR EACH ROW EXECUTE FUNCTION trg_det_venta_delete();

-- ============================================================================
-- SECCIÓN 5: TRIGGERS DE INVENTARIO — REPARACIONES (misma lógica que ventas)
-- ============================================================================

-- Al usar repuesto en reparación: valida stock y descuenta atómicamente.
CREATE OR REPLACE FUNCTION trg_rep_repuestos_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  -- Obtener sede y técnico desde la cabecera de reparación.
  SELECT id_sede, id_tecnico
  INTO v_id_sede, v_id_empleado
  FROM Reparaciones
  WHERE id_reparacion = NEW.id_reparacion;

  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  IF v_id_inventario IS NULL THEN
    RAISE EXCEPTION 'No existe inventario para el repuesto % en la sede %', NEW.id_item, v_id_sede;
  END IF;

  -- Razonamiento: Validación + descuento atómico (mismo patrón que ventas).
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual - NEW.cantidad
  WHERE id_inventario = v_id_inventario
    AND cantidad_actual >= NEW.cantidad;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente del repuesto % en la sede % (disponible: %, solicitado: %)',
      NEW.id_item, v_id_sede,
      (SELECT cantidad_actual FROM Inventario_Sedes WHERE id_inventario = v_id_inventario),
      NEW.cantidad;
  END IF;

  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'reparacion', -NEW.cantidad,
    NEW.id_reparacion, v_id_empleado
  );

  PERFORM fn_log_operacion(
    'creacion', 'Reparacion_Repuestos_Usados', 'reparacion',
    NEW.id_reparacion, v_id_empleado, v_id_sede,
    'Repuesto: ' || NEW.id_item || ', Cantidad: ' || NEW.cantidad ||
    ', Precio cobrado: ' || NEW.precio_cobrado
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rep_repuestos_insert ON Reparacion_Repuestos_Usados;
CREATE TRIGGER trg_rep_repuestos_insert
  BEFORE INSERT ON Reparacion_Repuestos_Usados
  FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_insert();

-- Al modificar cantidad de repuesto usado: ajusta stock por delta con validación atómica.
CREATE OR REPLACE FUNCTION trg_rep_repuestos_update()
RETURNS TRIGGER AS $$
DECLARE
  v_delta        INT;
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  v_delta := NEW.cantidad - OLD.cantidad;

  IF v_delta = 0 THEN
    RETURN NEW;
  END IF;

  SELECT id_sede, id_tecnico
  INTO v_id_sede, v_id_empleado
  FROM Reparaciones
  WHERE id_reparacion = NEW.id_reparacion;

  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  IF v_delta > 0 THEN
    UPDATE Inventario_Sedes
    SET cantidad_actual = cantidad_actual - v_delta
    WHERE id_inventario = v_id_inventario
      AND cantidad_actual >= v_delta;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para ajustar repuesto % en sede %', NEW.id_item, v_id_sede;
    END IF;
  ELSE
    UPDATE Inventario_Sedes
    SET cantidad_actual = cantidad_actual - v_delta
    WHERE id_inventario = v_id_inventario;
  END IF;

  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'reparacion', -v_delta,
    NEW.id_reparacion, v_id_empleado
  );

  PERFORM fn_log_operacion(
    'actualizacion', 'Reparacion_Repuestos_Usados', 'reparacion',
    NEW.id_reparacion, v_id_empleado, v_id_sede,
    'Cantidad ajustada: ' || OLD.cantidad || ' → ' || NEW.cantidad
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rep_repuestos_update ON Reparacion_Repuestos_Usados;
CREATE TRIGGER trg_rep_repuestos_update
  BEFORE UPDATE OF cantidad ON Reparacion_Repuestos_Usados
  FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_update();

-- Al eliminar repuesto usado: devuelve stock al inventario.
CREATE OR REPLACE FUNCTION trg_rep_repuestos_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  SELECT id_sede, id_tecnico
  INTO v_id_sede, v_id_empleado
  FROM Reparaciones
  WHERE id_reparacion = OLD.id_reparacion;

  v_id_inventario := fn_get_id_inventario(v_id_sede, OLD.id_item);

  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual + OLD.cantidad
  WHERE id_inventario = v_id_inventario;

  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'reparacion', OLD.cantidad,
    OLD.id_reparacion, v_id_empleado
  );

  PERFORM fn_log_operacion(
    'eliminacion', 'Reparacion_Repuestos_Usados', 'reparacion',
    OLD.id_reparacion, v_id_empleado, v_id_sede,
    'Repuesto: ' || OLD.id_item || ', Cantidad devuelta: ' || OLD.cantidad
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rep_repuestos_delete ON Reparacion_Repuestos_Usados;
CREATE TRIGGER trg_rep_repuestos_delete
  AFTER DELETE ON Reparacion_Repuestos_Usados
  FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_delete();

-- ============================================================================
-- SECCIÓN 6: ACTUALIZACIÓN DE PRECIOS (al registrar compra, actualiza precios del item)
-- ============================================================================

-- Al insertar detalle de compra: actualiza precio_compra_actual y precio_venta_actual
-- en Items. El log y updated_at los manejan trg_items_updated_at y trg_items_log_precio.
CREATE OR REPLACE FUNCTION trg_actualizar_precios_item()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE Items
  SET precio_compra_actual = NEW.costo_unidad,
      precio_venta_actual = COALESCE(NEW.precio_venta_sugerido, precio_venta_actual)
  WHERE id_item = NEW.id_item;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_precios_item ON Detalle_Compra_Refill;
CREATE TRIGGER trg_actualizar_precios_item
  AFTER INSERT ON Detalle_Compra_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_actualizar_precios_item();

-- ============================================================================
-- SECCIÓN 7: LOGS DE CAMBIO DE ESTADO (registran transiciones de estado en Logs_Sistema)
-- ============================================================================

-- Loguea cambios de id_estado en Reparaciones con nombres legibles de estados.
CREATE OR REPLACE FUNCTION trg_reparaciones_log_estado()
RETURNS TRIGGER AS $$
DECLARE
  v_estado_anterior VARCHAR;
  v_estado_nuevo    VARCHAR;
BEGIN
  -- Solo actuar si el estado cambió.
  IF OLD.id_estado = NEW.id_estado THEN
    RETURN NEW;
  END IF;

  SELECT nombre INTO v_estado_anterior
  FROM Estados_Reparacion
  WHERE id_estado = OLD.id_estado;

  SELECT nombre INTO v_estado_nuevo
  FROM Estados_Reparacion
  WHERE id_estado = NEW.id_estado;

  PERFORM fn_log_cambio_estado(
    'Reparaciones', 'reparacion', NEW.id_reparacion,
    NEW.id_tecnico, NEW.id_sede,
    v_estado_anterior, v_estado_nuevo
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reparaciones_log_estado ON Reparaciones;
CREATE TRIGGER trg_reparaciones_log_estado
  AFTER UPDATE OF id_estado ON Reparaciones
  FOR EACH ROW EXECUTE FUNCTION trg_reparaciones_log_estado();

-- Loguea cambios de estado en Promociones.
CREATE OR REPLACE FUNCTION trg_promociones_log_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  -- Promociones no tiene id_empleado ni id_sede; se pasan NULL.
  PERFORM fn_log_cambio_estado(
    'Promociones', 'promocion', NEW.id_promocion,
    NULL, NULL,
    OLD.estado, NEW.estado
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_promociones_log_estado ON Promociones;
CREATE TRIGGER trg_promociones_log_estado
  AFTER UPDATE OF estado ON Promociones
  FOR EACH ROW EXECUTE FUNCTION trg_promociones_log_estado();

-- Loguea cambios de estado en Garantias. Obtiene empleado/sede desde la venta o reparación asociada.
CREATE OR REPLACE FUNCTION trg_garantias_log_estado()
RETURNS TRIGGER AS $$
DECLARE
  v_id_empleado INT := NULL;
  v_id_sede     INT := NULL;
  v_tipo_ref    VARCHAR;
  v_id_ref      INT;
BEGIN
  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  -- Determinar origen (venta o reparación) para obtener empleado y sede.
  IF NEW.id_venta IS NOT NULL THEN
    v_id_ref   := NEW.id_venta;
    v_tipo_ref := 'venta';
    SELECT id_empleado, id_sede
    INTO v_id_empleado, v_id_sede
    FROM Ventas
    WHERE id_venta = NEW.id_venta;
  ELSE
    v_id_ref   := NEW.id_reparacion;
    v_tipo_ref := 'reparacion';
    SELECT id_tecnico, id_sede
    INTO v_id_empleado, v_id_sede
    FROM Reparaciones
    WHERE id_reparacion = NEW.id_reparacion;
  END IF;

  PERFORM fn_log_cambio_estado(
    'Garantias', v_tipo_ref, v_id_ref,
    v_id_empleado, v_id_sede,
    OLD.estado, NEW.estado
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_garantias_log_estado ON Garantias;
CREATE TRIGGER trg_garantias_log_estado
  AFTER UPDATE OF estado ON Garantias
  FOR EACH ROW EXECUTE FUNCTION trg_garantias_log_estado();


-- ============================================================================
-- SECCIÓN 8: LOGS DE CAMBIO DE PRECIO (modificaciones en Items, automáticas o manuales)
-- ============================================================================

-- Loguea cambios en precio_compra_actual y/o precio_venta_actual en Items.
CREATE OR REPLACE FUNCTION trg_items_log_precio()
RETURNS TRIGGER AS $$
DECLARE
  v_detalle TEXT := '';
BEGIN
  IF OLD.precio_compra_actual IS DISTINCT FROM NEW.precio_compra_actual THEN
    v_detalle := v_detalle || 'precio_compra: ' ||
      OLD.precio_compra_actual || ' → ' || NEW.precio_compra_actual || '; ';
  END IF;

  IF OLD.precio_venta_actual IS DISTINCT FROM NEW.precio_venta_actual THEN
    v_detalle := v_detalle || 'precio_venta: ' ||
      OLD.precio_venta_actual || ' → ' || NEW.precio_venta_actual || '; ';
  END IF;

  -- Solo insertar log si algún precio cambió.
  IF v_detalle != '' THEN
    -- Items no tiene id_empleado ni id_sede; se dejan NULL.
    INSERT INTO Logs_Sistema (
      tipo_accion, tabla_afectada, tipo_referencia,
      id_referencia, detalle_cambio
    ) VALUES (
      'cambio_precio', 'Items', 'otro',
      NEW.id_item, rtrim(v_detalle, '; ')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_log_precio ON Items;
CREATE TRIGGER trg_items_log_precio
  AFTER UPDATE OF precio_compra_actual, precio_venta_actual ON Items
  FOR EACH ROW EXECUTE FUNCTION trg_items_log_precio();

-- ============================================================================
-- SECCIÓN 9: CAMBIOS DE PRODUCTO (devuelve item del cliente + descuenta item entregado)
-- ============================================================================

-- Al insertar Cambio_Producto: devuelve item_devuelto al stock y descuenta
-- item_entregado atómicamente. Sin stock suficiente → RAISE EXCEPTION.
-- Side effects: 2 INSERT en Movimientos_Inventario, INSERT en Logs_Sistema.
CREATE OR REPLACE FUNCTION trg_cambio_producto_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_id_inventario_dev INT;
  v_id_inventario_ent INT;
BEGIN
  v_id_inventario_dev := fn_get_id_inventario(NEW.id_sede, NEW.id_item_devuelto);

  -- Si no existe inventario para el item devuelto, crearlo con cantidad 0.
  IF v_id_inventario_dev IS NULL THEN
    INSERT INTO Inventario_Sedes (id_sede, id_item, cantidad_actual, stock_minimo)
    VALUES (NEW.id_sede, NEW.id_item_devuelto, 0, 0)
    ON CONFLICT (id_sede, id_item) DO NOTHING
    RETURNING id_inventario INTO v_id_inventario_dev;

    IF v_id_inventario_dev IS NULL THEN
      v_id_inventario_dev := fn_get_id_inventario(NEW.id_sede, NEW.id_item_devuelto);
    END IF;
  END IF;

  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual + NEW.cantidad
  WHERE id_inventario = v_id_inventario_dev;

  v_id_inventario_ent := fn_get_id_inventario(NEW.id_sede, NEW.id_item_entregado);

  IF v_id_inventario_ent IS NULL THEN
    RAISE EXCEPTION 'No existe inventario para el item % en la sede %',
      NEW.id_item_entregado, NEW.id_sede;
  END IF;

  -- Validación + descuento atómico (mismo patrón que ventas).
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual - NEW.cantidad
  WHERE id_inventario = v_id_inventario_ent
    AND cantidad_actual >= NEW.cantidad;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente del item % en la sede % para procesar cambio (disponible: %, solicitado: %)',
      NEW.id_item_entregado, NEW.id_sede,
      (SELECT cantidad_actual FROM Inventario_Sedes WHERE id_inventario = v_id_inventario_ent),
      NEW.cantidad;
  END IF;

  -- Dos movimientos: item devuelto (positivo) + item entregado (negativo).
  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad, id_referencia, id_empleado
  ) VALUES (
    v_id_inventario_dev, 'cambio', NEW.cantidad, NEW.id_cambio, NEW.id_empleado
  );

  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad, id_referencia, id_empleado
  ) VALUES (
    v_id_inventario_ent, 'cambio', -NEW.cantidad, NEW.id_cambio, NEW.id_empleado
  );

  PERFORM fn_log_operacion(
    'creacion', 'Cambios_Producto', 'cambio',
    NEW.id_cambio, NEW.id_empleado, NEW.id_sede,
    'Item devuelto: ' || NEW.id_item_devuelto ||
    ' → Item entregado: ' || NEW.id_item_entregado ||
    ', Cantidad: ' || NEW.cantidad ||
    CASE WHEN NEW.diferencia_cobrada > 0
         THEN ', Diferencia cobrada: S/' || NEW.diferencia_cobrada
         ELSE '' END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cambio_producto_insert ON Cambios_Producto;
CREATE TRIGGER trg_cambio_producto_insert
  AFTER INSERT ON Cambios_Producto
  FOR EACH ROW EXECUTE FUNCTION trg_cambio_producto_insert();

-- ============================================================================
-- SECCIÓN 10: AUDITORÍA — SEDES Y EMPLEADOS (loguean INSERT/UPDATE/DELETE en Logs_Sistema)
-- El actor se obtiene con fn_get_actor_id() desde la variable de sesión 'app.actor_id'.
-- ============================================================================

-- Loguea creación de Sede. Usa fn_get_actor_id() para identificar al Propietario.
CREATE OR REPLACE FUNCTION trg_sedes_log_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_log_operacion(
    'creacion', 'Sedes', 'otro',
    NEW.id_sede, fn_get_actor_id(), NEW.id_sede,
    'Sede creada: ' || NEW.nombre
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sedes_log_insert ON Sedes;
CREATE TRIGGER trg_sedes_log_insert
  AFTER INSERT ON Sedes
  FOR EACH ROW EXECUTE FUNCTION trg_sedes_log_insert();

-- Loguea modificaciones en Sede (nombre, dirección, teléfono, horario).
-- El cambio de esta_habilitada se registra aparte en trg_sedes_log_habilitada.
CREATE OR REPLACE FUNCTION trg_sedes_log_update()
RETURNS TRIGGER AS $$
DECLARE
  v_detalle TEXT := '';
BEGIN
  IF OLD.nombre IS DISTINCT FROM NEW.nombre THEN
    v_detalle := v_detalle || 'nombre: ' || OLD.nombre || ' → ' || NEW.nombre || '; ';
  END IF;
  IF OLD.direccion IS DISTINCT FROM NEW.direccion THEN
    v_detalle := v_detalle || 'direccion: ' || COALESCE(OLD.direccion,'NULL') || ' → ' || COALESCE(NEW.direccion,'NULL') || '; ';
  END IF;
  IF OLD.telefono IS DISTINCT FROM NEW.telefono THEN
    v_detalle := v_detalle || 'telefono: ' || COALESCE(OLD.telefono,'NULL') || ' → ' || COALESCE(NEW.telefono,'NULL') || '; ';
  END IF;
  IF OLD.hora_apertura IS DISTINCT FROM NEW.hora_apertura THEN
    v_detalle := v_detalle || 'hora_apertura: ' || OLD.hora_apertura::text || ' → ' || NEW.hora_apertura::text || '; ';
  END IF;
  IF OLD.hora_cierre IS DISTINCT FROM NEW.hora_cierre THEN
    v_detalle := v_detalle || 'hora_cierre: ' || OLD.hora_cierre::text || ' → ' || NEW.hora_cierre::text || '; ';
  END IF;
  -- esta_habilitada se loguea en trg_sedes_log_habilitada como 'cambio_estado'.

  IF v_detalle != '' THEN
    PERFORM fn_log_operacion(
      'actualizacion', 'Sedes', 'otro',
      NEW.id_sede, fn_get_actor_id(), NEW.id_sede,
      rtrim(v_detalle, '; ')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sedes_log_update ON Sedes;
CREATE TRIGGER trg_sedes_log_update
  AFTER UPDATE ON Sedes
  FOR EACH ROW EXECUTE FUNCTION trg_sedes_log_update();

-- Loguea cambios de esta_habilitada como 'cambio_estado'. Acción crítica del Propietario.
CREATE OR REPLACE FUNCTION trg_sedes_log_habilitada()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.esta_habilitada IS DISTINCT FROM NEW.esta_habilitada THEN
    PERFORM fn_log_cambio_estado(
      'Sedes', 'otro', NEW.id_sede,
      fn_get_actor_id(), NEW.id_sede,
      CASE WHEN OLD.esta_habilitada THEN 'habilitada' ELSE 'deshabilitada' END,
      CASE WHEN NEW.esta_habilitada THEN 'habilitada' ELSE 'deshabilitada' END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sedes_log_habilitada ON Sedes;
CREATE TRIGGER trg_sedes_log_habilitada
  AFTER UPDATE OF esta_habilitada ON Sedes
  FOR EACH ROW EXECUTE FUNCTION trg_sedes_log_habilitada();

-- Loguea eliminación de Sede.
CREATE OR REPLACE FUNCTION trg_sedes_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_log_operacion(
    'eliminacion', 'Sedes', 'otro',
    OLD.id_sede, fn_get_actor_id(), OLD.id_sede,
    'Sede eliminada: ' || OLD.nombre
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sedes_log_delete ON Sedes;
CREATE TRIGGER trg_sedes_log_delete
  AFTER DELETE ON Sedes
  FOR EACH ROW EXECUTE FUNCTION trg_sedes_log_delete();

-- Loguea creación de Empleado. Captura el actor vía fn_get_actor_id().
CREATE OR REPLACE FUNCTION trg_empleados_log_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_log_operacion(
    'creacion', 'Empleados', 'otro',
    NEW.id_empleado, fn_get_actor_id(), NEW.id_sede,
    'Empleado creado: ' || NEW.nombre_completo ||
    ' (' || NEW.tipo_documento || ': ' || NEW.nro_documento || ')'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_empleados_log_insert ON Empleados;
CREATE TRIGGER trg_empleados_log_insert
  AFTER INSERT ON Empleados
  FOR EACH ROW EXECUTE FUNCTION trg_empleados_log_insert();

-- Loguea modificaciones en Empleado (estado, sede, sueldo, nombre).
-- Crítico para rastrear cambios de estado y reasignaciones de sede.
CREATE OR REPLACE FUNCTION trg_empleados_log_update()
RETURNS TRIGGER AS $$
DECLARE
  v_detalle TEXT := '';
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    v_detalle := v_detalle || 'estado: ' || OLD.estado || ' → ' || NEW.estado || '; ';
  END IF;
  IF OLD.id_sede IS DISTINCT FROM NEW.id_sede THEN
    v_detalle := v_detalle || 'id_sede: ' ||
      COALESCE(OLD.id_sede::text,'NULL') || ' → ' ||
      COALESCE(NEW.id_sede::text,'NULL') || '; ';
  END IF;
  IF OLD.sueldo_semanal_soles IS DISTINCT FROM NEW.sueldo_semanal_soles THEN
    v_detalle := v_detalle || 'sueldo: ' || OLD.sueldo_semanal_soles || ' → ' || NEW.sueldo_semanal_soles || '; ';
  END IF;
  IF OLD.nombre_completo IS DISTINCT FROM NEW.nombre_completo THEN
    v_detalle := v_detalle || 'nombre: ' || OLD.nombre_completo || ' → ' || NEW.nombre_completo || '; ';
  END IF;

  IF v_detalle != '' THEN
    PERFORM fn_log_operacion(
      'actualizacion', 'Empleados', 'otro',
      NEW.id_empleado, fn_get_actor_id(), NEW.id_sede,
      rtrim(v_detalle, '; ')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_empleados_log_update ON Empleados;
CREATE TRIGGER trg_empleados_log_update
  AFTER UPDATE ON Empleados
  FOR EACH ROW EXECUTE FUNCTION trg_empleados_log_update();

-- Loguea eliminación de Empleado. OLD.id_sede preserva el contexto post-eliminación.
CREATE OR REPLACE FUNCTION trg_empleados_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_log_operacion(
    'eliminacion', 'Empleados', 'otro',
    OLD.id_empleado, fn_get_actor_id(), OLD.id_sede,
    'Empleado eliminado: ' || OLD.nombre_completo ||
    ' (' || OLD.tipo_documento || ': ' || OLD.nro_documento || ')'
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_empleados_log_delete ON Empleados;
CREATE TRIGGER trg_empleados_log_delete
  AFTER DELETE ON Empleados
  FOR EACH ROW EXECUTE FUNCTION trg_empleados_log_delete();

-- ============================================================================
-- SECCIÓN 11: GUARDS DE SEDE HABILITADA (bloquean operaciones en sedes deshabilitadas)
-- ============================================================================

-- Bloquea nuevas ventas en sedes deshabilitadas.
CREATE OR REPLACE FUNCTION trg_ventas_check_sede_habilitada()
RETURNS TRIGGER AS $$
DECLARE
  v_habilitada BOOLEAN;
BEGIN
  SELECT esta_habilitada INTO v_habilitada
  FROM Sedes
  WHERE id_sede = NEW.id_sede
  FOR SHARE;

  IF NOT v_habilitada THEN
    RAISE EXCEPTION 'La sede % está deshabilitada. No se pueden registrar ventas en ella.', NEW.id_sede;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ventas_check_sede_habilitada ON Ventas;
CREATE TRIGGER trg_ventas_check_sede_habilitada
  BEFORE INSERT ON Ventas
  FOR EACH ROW EXECUTE FUNCTION trg_ventas_check_sede_habilitada();

-- Bloquea nuevas reparaciones en sedes deshabilitadas.
CREATE OR REPLACE FUNCTION trg_reparaciones_check_sede_habilitada()
RETURNS TRIGGER AS $$
DECLARE
  v_habilitada BOOLEAN;
BEGIN
  SELECT esta_habilitada INTO v_habilitada
  FROM Sedes
  WHERE id_sede = NEW.id_sede
  FOR SHARE;

  IF NOT v_habilitada THEN
    RAISE EXCEPTION 'La sede % está deshabilitada. No se pueden registrar reparaciones en ella.', NEW.id_sede;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reparaciones_check_sede_habilitada ON Reparaciones;
CREATE TRIGGER trg_reparaciones_check_sede_habilitada
  BEFORE INSERT ON Reparaciones
  FOR EACH ROW EXECUTE FUNCTION trg_reparaciones_check_sede_habilitada();

-- Bloquea nuevas compras/refill con destino a sede deshabilitada.
CREATE OR REPLACE FUNCTION trg_compras_check_sede_habilitada()
RETURNS TRIGGER AS $$
DECLARE
  v_habilitada BOOLEAN;
BEGIN
  SELECT esta_habilitada INTO v_habilitada
  FROM Sedes
  WHERE id_sede = NEW.id_sede_destino
  FOR SHARE;

  IF NOT v_habilitada THEN
    RAISE EXCEPTION 'La sede % está deshabilitada. No se pueden registrar compras con destino a ella.', NEW.id_sede_destino;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compras_check_sede_habilitada ON Compras_Refill;
CREATE TRIGGER trg_compras_check_sede_habilitada
  BEFORE INSERT ON Compras_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_compras_check_sede_habilitada();

-- Trigger: mínimo 1 categoría para productos
CREATE OR REPLACE FUNCTION fn_check_item_categorias()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT tipo FROM items WHERE id_item = OLD.id_item) = 'producto' THEN
    IF NOT EXISTS (
      SELECT 1 FROM item_categorias WHERE id_item = OLD.id_item
    ) THEN
      RAISE EXCEPTION 'Un producto debe tener al menos una categoría (id_item=%)', OLD.id_item;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_item_categorias_check
  AFTER DELETE ON item_categorias
  FOR EACH ROW EXECUTE FUNCTION fn_check_item_categorias();
