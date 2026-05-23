-- ============================================================================
-- @Purpose: Triggers del sistema para integridad de datos, movimientos de
--           inventario y auditoría en Logs_Sistema.
--           Incluye protección contra condiciones de carrera en operaciones
--           concurrentes de venta y reparación.
-- @Dialect: PostgreSQL 15+
-- @Dependencies: DB-Tables.sql (todas las tablas deben existir)
-- @Orden_de_ejecucion: Ejecutar después de DB-Tables.sql
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: FUNCIONES HELPER
-- Funciones reutilizables invocadas por los triggers.
-- ============================================================================

-- @Purpose: Auto-asigna updated_at = now() en cualquier BEFORE UPDATE.
-- @Usage:   Se adjunta a todas las tablas con columna updated_at.
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- @Purpose: Registra una operación genérica en Logs_Sistema.
-- @Parameters:
--   p_tipo_accion     - 'creacion','actualizacion','eliminacion','anulacion',etc.
--   p_tabla_afectada  - Nombre de la tabla donde ocurrió la acción.
--   p_tipo_referencia - Tipo de entidad referenciada ('venta','compra','reparacion',etc.).
--   p_id_referencia   - ID del registro afectado.
--   p_id_empleado     - Empleado que ejecutó la acción (puede ser NULL).
--   p_id_sede         - Sede donde ocurrió (puede ser NULL).
--   p_detalle_cambio  - Descripción textual del cambio realizado.
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

-- @Purpose: Registra un cambio de estado en Logs_Sistema.
--           Es un caso específico de fn_log_operacion con tipo_accion='cambio_estado'
--           y detalle_cambio formateado como "estado: anterior → nuevo".
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

-- @Purpose: Retorna el id_inventario para una combinación (sede, item).
--           Retorna NULL si no existe registro en Inventario_Sedes.
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
-- SECCIÓN 2: TRIGGERS updated_at
-- Actualizan automáticamente la columna updated_at en cada UPDATE.
-- ============================================================================

CREATE TRIGGER trg_sedes_updated_at
  BEFORE UPDATE ON Sedes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_empleados_updated_at
  BEFORE UPDATE ON Empleados
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON Clientes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON Items
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON Proveedores
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_compras_refill_updated_at
  BEFORE UPDATE ON Compras_Refill
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_promociones_updated_at
  BEFORE UPDATE ON Promociones
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_ventas_updated_at
  BEFORE UPDATE ON Ventas
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_reparaciones_updated_at
  BEFORE UPDATE ON Reparaciones
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_garantias_updated_at
  BEFORE UPDATE ON Garantias
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- SECCIÓN 3: TRIGGERS DE INVENTARIO — COMPRAS
-- Gestionan el stock al insertar, modificar o eliminar detalles de compra.
-- ============================================================================

-- @Purpose: Al insertar un detalle de compra, crea el registro de inventario
--           si no existe (con ON CONFLICT para evitar race conditions) y suma
--           la cantidad comprada al stock de la sede destino.
-- @SideEffects: INSERT en Movimientos_Inventario, INSERT en Logs_Sistema.
CREATE OR REPLACE FUNCTION trg_det_compra_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  -- Razonamiento: Obtener sede destino y empleado refiller desde la cabecera.
  SELECT id_sede_destino, id_empleado_refiller
  INTO v_id_sede, v_id_empleado
  FROM Compras_Refill
  WHERE id_compra = NEW.id_compra;

  -- Razonamiento: Buscar el registro de inventario (sede + item).
  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  -- Razonamiento: Si no existe, crearlo. ON CONFLICT evita que dos compras
  --               simultáneas del mismo item nuevo generen error de duplicado.
  IF v_id_inventario IS NULL THEN
    INSERT INTO Inventario_Sedes (id_sede, id_item, cantidad_actual, stock_minimo)
    VALUES (v_id_sede, NEW.id_item, 0, 0)
    ON CONFLICT (id_sede, id_item) DO NOTHING
    RETURNING id_inventario INTO v_id_inventario;

    -- Razonamiento: Si ON CONFLICT hizo DO NOTHING, otra transacción ya lo creó.
    --               Volvemos a leer para obtener el id.
    IF v_id_inventario IS NULL THEN
      v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);
    END IF;
  END IF;

  -- Razonamiento: Incrementar stock. cantidad_actual = cantidad_actual + X es
  --               atómico en PostgreSQL, no requiere FOR UPDATE.
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual + NEW.cantidad_comprada
  WHERE id_inventario = v_id_inventario;

  -- Razonamiento: Registrar el movimiento de inventario (cantidad positiva = ingreso).
  INSERT INTO Movimientos_Inventario (
    id_inventario, tipo_movimiento, cantidad,
    id_referencia, id_empleado
  ) VALUES (
    v_id_inventario, 'compra', NEW.cantidad_comprada,
    NEW.id_compra, v_id_empleado
  );

  -- Razonamiento: Auditar la creación del detalle de compra.
  PERFORM fn_log_operacion(
    'creacion', 'Detalle_Compra_Refill', 'compra',
    NEW.id_compra, v_id_empleado, v_id_sede,
    'Item: ' || NEW.id_item || ', Cantidad: ' || NEW.cantidad_comprada ||
    ', Costo: ' || NEW.costo_unidad
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_det_compra_insert
  AFTER INSERT ON Detalle_Compra_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_det_compra_insert();

-- @Purpose: Al modificar la cantidad en un detalle de compra, ajusta el stock
--           por la diferencia (delta). Si se reduce, valida que no deje stock negativo.
CREATE OR REPLACE FUNCTION trg_det_compra_update()
RETURNS TRIGGER AS $$
DECLARE
  v_delta        INT;
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  v_delta := NEW.cantidad_comprada - OLD.cantidad_comprada;

  -- Razonamiento: Si no cambió la cantidad, salir sin hacer nada.
  IF v_delta = 0 THEN
    RETURN NEW;
  END IF;

  SELECT id_sede_destino, id_empleado_refiller
  INTO v_id_sede, v_id_empleado
  FROM Compras_Refill
  WHERE id_compra = NEW.id_compra;

  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  -- Razonamiento: Si se reduce la cantidad comprada, verificar que el stock
  --               no quede negativo (podría haberse vendido parte del stock).
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

CREATE TRIGGER trg_det_compra_update
  AFTER UPDATE OF cantidad_comprada ON Detalle_Compra_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_det_compra_update();

-- @Purpose: Al eliminar un detalle de compra, resta la cantidad del stock
--           y registra el movimiento inverso.
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

  -- Razonamiento: Restar del stock. Es atómico.
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual - OLD.cantidad_comprada
  WHERE id_inventario = v_id_inventario;

  -- Razonamiento: Movimiento inverso (cantidad negativa = egreso).
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

CREATE TRIGGER trg_det_compra_delete
  AFTER DELETE ON Detalle_Compra_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_det_compra_delete();

-- ============================================================================
-- SECCIÓN 4: TRIGGERS DE INVENTARIO — VENTAS
-- Validan stock y descuentan atómicamente para evitar race conditions.
-- ============================================================================

-- @Purpose: Al insertar un detalle de venta, valida que haya stock suficiente
--           y descuenta atómicamente en un solo UPDATE. Si no hay stock, cancela
--           la operación con RAISE EXCEPTION.
-- @RaceCondition: El UPDATE con WHERE cantidad_actual >= NEW.cantidad garantiza
--                 que dos vendedores no puedan vender el mismo stock simultáneamente.
CREATE OR REPLACE FUNCTION trg_det_venta_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  -- Razonamiento: Obtener sede y vendedor desde la cabecera de venta.
  SELECT id_sede, id_empleado
  INTO v_id_sede, v_id_empleado
  FROM Ventas
  WHERE id_venta = NEW.id_venta;

  v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

  -- Razonamiento: Si no hay registro de inventario para este item en esta sede,
  --               no se puede vender.
  IF v_id_inventario IS NULL THEN
    RAISE EXCEPTION 'No existe inventario para el item % en la sede %', NEW.id_item, v_id_sede;
  END IF;

  -- Razonamiento: Validación + descuento atómico. El WHERE cantidad_actual >= NEW.cantidad
  --               bloquea la fila y garantiza que no se venda stock inexistente.
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

  -- Razonamiento: Registrar movimiento de egreso (cantidad negativa).
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

CREATE TRIGGER trg_det_venta_insert
  BEFORE INSERT ON Detalle_Venta
  FOR EACH ROW EXECUTE FUNCTION trg_det_venta_insert();

-- @Purpose: Al modificar la cantidad en un detalle de venta, ajusta el stock
--           por la diferencia. Si aumenta, valida stock disponible atómicamente.
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

  -- Razonamiento: Si aumenta la cantidad, validar stock disponible.
  IF v_delta > 0 THEN
    UPDATE Inventario_Sedes
    SET cantidad_actual = cantidad_actual - v_delta
    WHERE id_inventario = v_id_inventario
      AND cantidad_actual >= v_delta;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para ajustar la venta (item %, sede %)', NEW.id_item, v_id_sede;
    END IF;
  ELSE
    -- Razonamiento: Si disminuye, devolver stock (v_delta es negativo, sumar).
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

CREATE TRIGGER trg_det_venta_update
  BEFORE UPDATE OF cantidad ON Detalle_Venta
  FOR EACH ROW EXECUTE FUNCTION trg_det_venta_update();

-- @Purpose: Al eliminar un detalle de venta, devuelve el stock y registra
--           el movimiento inverso.
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

  -- Razonamiento: Devolver stock al inventario.
  UPDATE Inventario_Sedes
  SET cantidad_actual = cantidad_actual + OLD.cantidad
  WHERE id_inventario = v_id_inventario;

  -- Razonamiento: Movimiento inverso (cantidad positiva = devolución).
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

CREATE TRIGGER trg_det_venta_delete
  AFTER DELETE ON Detalle_Venta
  FOR EACH ROW EXECUTE FUNCTION trg_det_venta_delete();

-- ============================================================================
-- SECCIÓN 5: TRIGGERS DE INVENTARIO — REPARACIONES
-- Misma lógica que ventas: validación + descuento atómico para repuestos
-- usados en reparaciones.
-- ============================================================================

-- @Purpose: Al usar un repuesto en una reparación, valida stock y descuenta
--           atómicamente.
CREATE OR REPLACE FUNCTION trg_rep_repuestos_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_id_sede      INT;
  v_id_empleado  INT;
  v_id_inventario INT;
BEGIN
  -- Razonamiento: Obtener sede y técnico desde la cabecera de reparación.
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

CREATE TRIGGER trg_rep_repuestos_insert
  BEFORE INSERT ON Reparacion_Repuestos_Usados
  FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_insert();

-- @Purpose: Al modificar la cantidad de un repuesto usado, ajusta el stock
--           por la diferencia con validación atómica.
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

CREATE TRIGGER trg_rep_repuestos_update
  BEFORE UPDATE OF cantidad ON Reparacion_Repuestos_Usados
  FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_update();

-- @Purpose: Al eliminar un repuesto usado, devuelve el stock al inventario.
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

CREATE TRIGGER trg_rep_repuestos_delete
  AFTER DELETE ON Reparacion_Repuestos_Usados
  FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_delete();

-- ============================================================================
-- SECCIÓN 6: TRIGGER DE ACTUALIZACIÓN DE PRECIOS
-- Al registrar una compra, actualiza los precios actuales del item.
-- Delega el log y el updated_at a los triggers específicos de Items.
-- ============================================================================

-- @Purpose: Al insertar un detalle de compra, actualiza precio_compra_actual
--           y precio_venta_actual en Items con los valores de la compra.
-- @Delegacion: No loguea ni actualiza updated_at manualmente; los triggers
--              trg_items_updated_at y trg_items_log_precio lo hacen automáticamente.
CREATE OR REPLACE FUNCTION trg_actualizar_precios_item()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE Items
  SET precio_compra_actual = NEW.costo_unidad,
      precio_venta_actual = NEW.precio_venta_sugerido
  WHERE id_item = NEW.id_item;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_precios_item
  AFTER INSERT ON Detalle_Compra_Refill
  FOR EACH ROW EXECUTE FUNCTION trg_actualizar_precios_item();

-- ============================================================================
-- SECCIÓN 7: TRIGGERS DE LOGS DE CAMBIO DE ESTADO
-- Registran automáticamente en Logs_Sistema cada transición de estado
-- en las tablas que tienen flujo de trabajo.
-- ============================================================================

-- @Purpose: Loguea cambios de id_estado en Reparaciones, incluyendo los
--           nombres legibles de los estados (anterior y nuevo).
CREATE OR REPLACE FUNCTION trg_reparaciones_log_estado()
RETURNS TRIGGER AS $$
DECLARE
  v_estado_anterior VARCHAR;
  v_estado_nuevo    VARCHAR;
BEGIN
  -- Razonamiento: Solo actuar si el estado realmente cambió.
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

CREATE TRIGGER trg_reparaciones_log_estado
  AFTER UPDATE OF id_estado ON Reparaciones
  FOR EACH ROW EXECUTE FUNCTION trg_reparaciones_log_estado();

-- @Purpose: Loguea cambios de estado en Promociones.
CREATE OR REPLACE FUNCTION trg_promociones_log_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  -- Razonamiento: Promociones no tiene id_empleado ni id_sede directos; se pasan NULL.
  PERFORM fn_log_cambio_estado(
    'Promociones', 'promocion', NEW.id_promocion,
    NULL, NULL,
    OLD.estado, NEW.estado
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promociones_log_estado
  AFTER UPDATE OF estado ON Promociones
  FOR EACH ROW EXECUTE FUNCTION trg_promociones_log_estado();

-- @Purpose: Loguea cambios de estado en Garantias (activa → vencida, invalidada).
--           Obtiene id_empleado e id_sede desde la venta o reparación asociada.
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

  -- Razonamiento: Determinar si la garantía es de venta o reparación para
  --               obtener el contexto (empleado, sede).
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

CREATE TRIGGER trg_garantias_log_estado
  AFTER UPDATE OF estado ON Garantias
  FOR EACH ROW EXECUTE FUNCTION trg_garantias_log_estado();

-- @Purpose: Loguea la anulación de una boleta (cuando estado cambia a 'anulada').
CREATE OR REPLACE FUNCTION trg_boletas_log_anulacion()
RETURNS TRIGGER AS $$
DECLARE
  v_id_empleado INT := NULL;
  v_id_sede     INT := NULL;
  v_tipo_ref    VARCHAR;
  v_id_ref      INT;
BEGIN
  -- Razonamiento: Solo loguear cuando se anula, no en otros cambios de estado.
  IF OLD.estado = NEW.estado OR NEW.estado != 'anulada' THEN
    RETURN NEW;
  END IF;

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

  PERFORM fn_log_operacion(
    'anulacion', 'Boletas', v_tipo_ref, v_id_ref,
    v_id_empleado, v_id_sede,
    'Boleta anulada: ' || NEW.numero
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_boletas_log_anulacion
  AFTER UPDATE OF estado ON Boletas
  FOR EACH ROW EXECUTE FUNCTION trg_boletas_log_anulacion();

-- ============================================================================
-- SECCIÓN 8: TRIGGER DE LOGS DE CAMBIO DE PRECIO
-- Registra cualquier modificación de precios en Items, ya sea por compra
-- (automática) o manual (edición directa).
-- ============================================================================

-- @Purpose: Loguea cambios en precio_compra_actual y/o precio_venta_actual
--           en Items. Dispara tanto para cambios por compra como manuales.
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

  -- Razonamiento: Solo insertar log si al menos un precio cambió.
  IF v_detalle != '' THEN
    -- Razonamiento: No tenemos id_empleado ni id_sede en Items; se dejan NULL.
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

CREATE TRIGGER trg_items_log_precio
  AFTER UPDATE OF precio_compra_actual, precio_venta_actual ON Items
  FOR EACH ROW EXECUTE FUNCTION trg_items_log_precio();
