import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewsAndTriggers1780537051249 implements MigrationInterface {
  name = 'AddViewsAndTriggers1780537051249';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Funciones helper reutilizables

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    // Triggers para updated_at automático

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_sedes_updated_at ON sedes`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_sedes_updated_at
        BEFORE UPDATE ON sedes
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_empleados_updated_at ON empleados`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_empleados_updated_at
        BEFORE UPDATE ON empleados
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_clientes_updated_at
        BEFORE UPDATE ON clientes
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_items_updated_at ON items`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_items_updated_at
        BEFORE UPDATE ON items
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON proveedores`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_proveedores_updated_at
        BEFORE UPDATE ON proveedores
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_compras_refill_updated_at ON compras_refill`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_compras_refill_updated_at
        BEFORE UPDATE ON compras_refill
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_promociones_updated_at ON promociones`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_promociones_updated_at
        BEFORE UPDATE ON promociones
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_ventas_updated_at ON ventas`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_ventas_updated_at
        BEFORE UPDATE ON ventas
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_reparaciones_updated_at ON reparaciones`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_reparaciones_updated_at
        BEFORE UPDATE ON reparaciones
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_garantias_updated_at ON garantias`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_garantias_updated_at
        BEFORE UPDATE ON garantias
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
    `);

    // Triggers de inventario — compras

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_det_compra_insert()
      RETURNS TRIGGER AS $$
      DECLARE
        v_id_sede       INT;
        v_id_empleado   INT;
        v_id_inventario INT;
      BEGIN
        SELECT id_sede_destino, id_empleado_refiller
        INTO v_id_sede, v_id_empleado
        FROM Compras_Refill
        WHERE id_compra = NEW.id_compra;

        v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

        IF v_id_inventario IS NULL THEN
          INSERT INTO Inventario_Sedes (id_sede, id_item, cantidad_actual, stock_minimo)
          VALUES (v_id_sede, NEW.id_item, 0, 0)
          ON CONFLICT (id_sede, id_item) DO NOTHING
          RETURNING id_inventario INTO v_id_inventario;

          IF v_id_inventario IS NULL THEN
            v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);
          END IF;
        END IF;

        UPDATE Inventario_Sedes
        SET cantidad_actual = cantidad_actual + NEW.cantidad_comprada
        WHERE id_inventario = v_id_inventario;

        INSERT INTO Movimientos_Inventario (
          id_inventario, tipo_movimiento, cantidad,
          id_referencia, id_empleado
        ) VALUES (
          v_id_inventario, 'compra', NEW.cantidad_comprada,
          NEW.id_compra, v_id_empleado
        );

        PERFORM fn_log_operacion(
          'creacion', 'Detalle_Compra_Refill', 'compra',
          NEW.id_compra, v_id_empleado, v_id_sede,
          'Item: ' || NEW.id_item || ', Cantidad: ' || NEW.cantidad_comprada ||
          ', Costo: ' || NEW.costo_unidad
        );

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_det_compra_insert ON detalle_compra_refill`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_det_compra_insert
        AFTER INSERT ON detalle_compra_refill
        FOR EACH ROW EXECUTE FUNCTION trg_det_compra_insert()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_det_compra_update()
      RETURNS TRIGGER AS $$
      DECLARE
        v_delta         INT;
        v_id_sede       INT;
        v_id_empleado   INT;
        v_id_inventario INT;
      BEGIN
        v_delta := NEW.cantidad_comprada - OLD.cantidad_comprada;

        IF v_delta = 0 THEN
          RETURN NEW;
        END IF;

        SELECT id_sede_destino, id_empleado_refiller
        INTO v_id_sede, v_id_empleado
        FROM Compras_Refill
        WHERE id_compra = NEW.id_compra;

        v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_det_compra_update ON detalle_compra_refill`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_det_compra_update
        AFTER UPDATE OF cantidad_comprada ON detalle_compra_refill
        FOR EACH ROW EXECUTE FUNCTION trg_det_compra_update()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_det_compra_delete()
      RETURNS TRIGGER AS $$
      DECLARE
        v_id_sede       INT;
        v_id_empleado   INT;
        v_id_inventario INT;
      BEGIN
        SELECT id_sede_destino, id_empleado_refiller
        INTO v_id_sede, v_id_empleado
        FROM Compras_Refill
        WHERE id_compra = OLD.id_compra;

        v_id_inventario := fn_get_id_inventario(v_id_sede, OLD.id_item);

        UPDATE Inventario_Sedes
        SET cantidad_actual = cantidad_actual - OLD.cantidad_comprada
        WHERE id_inventario = v_id_inventario;

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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_det_compra_delete ON detalle_compra_refill`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_det_compra_delete
        AFTER DELETE ON detalle_compra_refill
        FOR EACH ROW EXECUTE FUNCTION trg_det_compra_delete()
    `);

    // Triggers de inventario — ventas

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_det_venta_insert()
      RETURNS TRIGGER AS $$
      DECLARE
        v_id_sede       INT;
        v_id_empleado   INT;
        v_id_inventario INT;
      BEGIN
        SELECT id_sede, id_empleado
        INTO v_id_sede, v_id_empleado
        FROM Ventas
        WHERE id_venta = NEW.id_venta;

        v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

        IF v_id_inventario IS NULL THEN
          RAISE EXCEPTION 'No existe inventario para el item % en la sede %', NEW.id_item, v_id_sede;
        END IF;

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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_det_venta_insert ON detalle_venta`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_det_venta_insert
        BEFORE INSERT ON detalle_venta
        FOR EACH ROW EXECUTE FUNCTION trg_det_venta_insert()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_det_venta_update()
      RETURNS TRIGGER AS $$
      DECLARE
        v_delta         INT;
        v_id_sede       INT;
        v_id_empleado   INT;
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

        IF v_delta > 0 THEN
          UPDATE Inventario_Sedes
          SET cantidad_actual = cantidad_actual - v_delta
          WHERE id_inventario = v_id_inventario
            AND cantidad_actual >= v_delta;

          IF NOT FOUND THEN
            RAISE EXCEPTION 'Stock insuficiente para ajustar la venta (item %, sede %)', NEW.id_item, v_id_sede;
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_det_venta_update ON detalle_venta`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_det_venta_update
        BEFORE UPDATE OF cantidad ON detalle_venta
        FOR EACH ROW EXECUTE FUNCTION trg_det_venta_update()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_det_venta_delete()
      RETURNS TRIGGER AS $$
      DECLARE
        v_id_sede       INT;
        v_id_empleado   INT;
        v_id_inventario INT;
      BEGIN
        SELECT id_sede, id_empleado
        INTO v_id_sede, v_id_empleado
        FROM Ventas
        WHERE id_venta = OLD.id_venta;

        v_id_inventario := fn_get_id_inventario(v_id_sede, OLD.id_item);

        UPDATE Inventario_Sedes
        SET cantidad_actual = cantidad_actual + OLD.cantidad
        WHERE id_inventario = v_id_inventario;

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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_det_venta_delete ON detalle_venta`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_det_venta_delete
        AFTER DELETE ON detalle_venta
        FOR EACH ROW EXECUTE FUNCTION trg_det_venta_delete()
    `);

    // Triggers de inventario — reparaciones

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_rep_repuestos_insert()
      RETURNS TRIGGER AS $$
      DECLARE
        v_id_sede       INT;
        v_id_empleado   INT;
        v_id_inventario INT;
      BEGIN
        SELECT id_sede, id_tecnico
        INTO v_id_sede, v_id_empleado
        FROM Reparaciones
        WHERE id_reparacion = NEW.id_reparacion;

        v_id_inventario := fn_get_id_inventario(v_id_sede, NEW.id_item);

        IF v_id_inventario IS NULL THEN
          RAISE EXCEPTION 'No existe inventario para el repuesto % en la sede %', NEW.id_item, v_id_sede;
        END IF;

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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_rep_repuestos_insert ON reparacion_repuestos_usados`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_rep_repuestos_insert
        BEFORE INSERT ON reparacion_repuestos_usados
        FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_insert()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_rep_repuestos_update()
      RETURNS TRIGGER AS $$
      DECLARE
        v_delta         INT;
        v_id_sede       INT;
        v_id_empleado   INT;
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_rep_repuestos_update ON reparacion_repuestos_usados`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_rep_repuestos_update
        BEFORE UPDATE OF cantidad ON reparacion_repuestos_usados
        FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_update()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_rep_repuestos_delete()
      RETURNS TRIGGER AS $$
      DECLARE
        v_id_sede       INT;
        v_id_empleado   INT;
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_rep_repuestos_delete ON reparacion_repuestos_usados`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_rep_repuestos_delete
        AFTER DELETE ON reparacion_repuestos_usados
        FOR EACH ROW EXECUTE FUNCTION trg_rep_repuestos_delete()
    `);

    // Trigger de actualización de precios

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_actualizar_precios_item()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE Items
        SET precio_compra_actual = NEW.costo_unidad,
            precio_venta_actual = COALESCE(NEW.precio_venta_sugerido, precio_venta_actual)
        WHERE id_item = NEW.id_item;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_actualizar_precios_item ON detalle_compra_refill`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_actualizar_precios_item
        AFTER INSERT ON detalle_compra_refill
        FOR EACH ROW EXECUTE FUNCTION trg_actualizar_precios_item()
    `);

    // Triggers de cambio de estado

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_reparaciones_log_estado()
      RETURNS TRIGGER AS $$
      DECLARE
        v_estado_anterior VARCHAR;
        v_estado_nuevo    VARCHAR;
      BEGIN
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_reparaciones_log_estado ON reparaciones`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_reparaciones_log_estado
        AFTER UPDATE OF id_estado ON reparaciones
        FOR EACH ROW EXECUTE FUNCTION trg_reparaciones_log_estado()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_promociones_log_estado()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.estado = NEW.estado THEN
          RETURN NEW;
        END IF;

        PERFORM fn_log_cambio_estado(
          'Promociones', 'promocion', NEW.id_promocion,
          NULL, NULL,
          OLD.estado, NEW.estado
        );

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_promociones_log_estado ON promociones`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_promociones_log_estado
        AFTER UPDATE OF estado ON promociones
        FOR EACH ROW EXECUTE FUNCTION trg_promociones_log_estado()
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_garantias_log_estado ON garantias`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_garantias_log_estado
        AFTER UPDATE OF estado ON garantias
        FOR EACH ROW EXECUTE FUNCTION trg_garantias_log_estado()
    `);

    // Trigger de cambio de precio

    await queryRunner.query(`
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

        IF v_detalle != '' THEN
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_items_log_precio ON items`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_items_log_precio
        AFTER UPDATE OF precio_compra_actual, precio_venta_actual ON items
        FOR EACH ROW EXECUTE FUNCTION trg_items_log_precio()
    `);

    // Trigger de cambios de producto

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_cambio_producto_insert()
      RETURNS TRIGGER AS $$
      DECLARE
        v_id_inventario_dev INT;
        v_id_inventario_ent INT;
      BEGIN
        v_id_inventario_dev := fn_get_id_inventario(NEW.id_sede, NEW.id_item_devuelto);

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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_cambio_producto_insert ON cambios_producto`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_cambio_producto_insert
        AFTER INSERT ON cambios_producto
        FOR EACH ROW EXECUTE FUNCTION trg_cambio_producto_insert()
    `);

    // Triggers de auditoría — sedes

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_sedes_log_insert ON sedes`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_sedes_log_insert
        AFTER INSERT ON sedes
        FOR EACH ROW EXECUTE FUNCTION trg_sedes_log_insert()
    `);

    await queryRunner.query(`
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

        IF v_detalle != '' THEN
          PERFORM fn_log_operacion(
            'actualizacion', 'Sedes', 'otro',
            NEW.id_sede, fn_get_actor_id(), NEW.id_sede,
            rtrim(v_detalle, '; ')
          );
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_sedes_log_update ON sedes`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_sedes_log_update
        AFTER UPDATE ON sedes
        FOR EACH ROW EXECUTE FUNCTION trg_sedes_log_update()
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_sedes_log_habilitada ON sedes`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_sedes_log_habilitada
        AFTER UPDATE OF esta_habilitada ON sedes
        FOR EACH ROW EXECUTE FUNCTION trg_sedes_log_habilitada()
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_sedes_log_delete ON sedes`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_sedes_log_delete
        AFTER DELETE ON sedes
        FOR EACH ROW EXECUTE FUNCTION trg_sedes_log_delete()
    `);

    // Triggers de auditoría — empleados

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_empleados_log_insert ON empleados`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_empleados_log_insert
        AFTER INSERT ON empleados
        FOR EACH ROW EXECUTE FUNCTION trg_empleados_log_insert()
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_empleados_log_update ON empleados`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_empleados_log_update
        AFTER UPDATE ON empleados
        FOR EACH ROW EXECUTE FUNCTION trg_empleados_log_update()
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_empleados_log_delete ON empleados`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_empleados_log_delete
        AFTER DELETE ON empleados
        FOR EACH ROW EXECUTE FUNCTION trg_empleados_log_delete()
    `);

    // Guard de sede habilitada

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_ventas_check_sede_habilitada ON ventas`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_ventas_check_sede_habilitada
        BEFORE INSERT ON ventas
        FOR EACH ROW EXECUTE FUNCTION trg_ventas_check_sede_habilitada()
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_reparaciones_check_sede_habilitada ON reparaciones`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_reparaciones_check_sede_habilitada
        BEFORE INSERT ON reparaciones
        FOR EACH ROW EXECUTE FUNCTION trg_reparaciones_check_sede_habilitada()
    `);

    await queryRunner.query(`
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
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_compras_check_sede_habilitada ON compras_refill`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_compras_check_sede_habilitada
        BEFORE INSERT ON compras_refill
        FOR EACH ROW EXECUTE FUNCTION trg_compras_check_sede_habilitada()
    `);

    // Vistas — propietario

    await queryRunner.query(`
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
               rps.total_reparaciones, rps.ingresos_reparaciones
    `);

    await queryRunner.query(`
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
      LEFT JOIN Boletas b       ON b.id_venta     = v.id_venta
    `);

    await queryRunner.query(`
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
      LEFT JOIN Garantias g                  ON g.id_reparacion = r.id_reparacion
    `);

    await queryRunner.query(`
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
      LEFT JOIN Categorias cat ON cat.id_categoria = i.id_categoria
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_propietario_empleados_global AS
      SELECT
          e.id_empleado,
          s.id_sede,
          s.nombre                                                    AS sede,
          e.nombre_completo,
          e.tipo_documento,
          e.nro_documento,
          e.telefono,
          e.estado,
          e.sueldo_semanal_soles,
          e.es_extranjero,
          STRING_AGG(r.nombre_rol, ', ' ORDER BY r.nombre_rol)        AS roles,
          e.created_by,
          ec.nombre_completo                                          AS creado_por,
          e.created_at
      FROM Empleados e
      LEFT JOIN Sedes s           ON s.id_sede      = e.id_sede
      LEFT JOIN Empleado_Roles er ON er.id_empleado = e.id_empleado
      LEFT JOIN Roles r           ON r.id_rol       = er.id_rol
      LEFT JOIN Empleados ec      ON ec.id_empleado = e.created_by
      GROUP BY e.id_empleado, s.id_sede, s.nombre,
               e.nombre_completo, e.tipo_documento, e.nro_documento,
               e.telefono, e.estado, e.sueldo_semanal_soles, e.es_extranjero,
               e.created_by, ec.nombre_completo, e.created_at
    `);

    await queryRunner.query(`
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
      LEFT JOIN Empleados e ON e.id_empleado = s.created_by
    `);

    // Vistas — gerente

    await queryRunner.query(`
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
               v.monto_descuento, v.tipo_descuento, b.numero, b.total, b.estado
    `);

    await queryRunner.query(`
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
               r.monto_cotizado, r.monto_descuento, b.numero, b.total
    `);

    await queryRunner.query(`
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
      LEFT JOIN Categorias cat ON cat.id_categoria = i.id_categoria
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_gerente_empleados AS
      SELECT
          e.id_empleado,
          e.id_sede,
          s.nombre                                                    AS sede,
          e.nombre_completo,
          e.tipo_documento,
          e.nro_documento,
          e.telefono,
          e.estado,
          e.sueldo_semanal_soles,
          STRING_AGG(r.nombre_rol, ', ' ORDER BY r.nombre_rol)        AS roles,
          e.created_by,
          ec.nombre_completo                                          AS creado_por,
          e.created_at
      FROM Empleados e
      JOIN  Sedes s               ON s.id_sede      = e.id_sede
      LEFT JOIN Empleado_Roles er ON er.id_empleado = e.id_empleado
      LEFT JOIN Roles r           ON r.id_rol       = er.id_rol
      LEFT JOIN Empleados ec      ON ec.id_empleado = e.created_by
      GROUP BY e.id_empleado, e.id_sede, s.nombre,
               e.nombre_completo, e.tipo_documento, e.nro_documento,
               e.telefono, e.estado, e.sueldo_semanal_soles,
               e.created_by, ec.nombre_completo, e.created_at
    `);

    await queryRunner.query(`
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
      JOIN Items i                  ON i.id_item      = dc.id_item
    `);

    await queryRunner.query(`
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
      LEFT JOIN Garantias g   ON g.id_garantia  = cp.id_garantia
    `);

    // Vistas — vendedor

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_vendedor_catalogo AS
      WITH promo_vigente AS (
          SELECT
              COALESCE(pr.id_item_afectado, dv_cat.id_item) AS id_item,
              pr.nombre          AS promo_nombre,
              pr.tipo_descuento  AS promo_tipo,
              pr.valor_descuento AS promo_valor
          FROM Promociones pr
          LEFT JOIN Items dv_cat ON dv_cat.id_categoria = pr.id_categoria_afectada
          WHERE pr.estado = 'activa'
            AND (pr.fecha_inicio IS NULL OR pr.fecha_inicio <= CURRENT_DATE)
            AND (pr.fecha_fin    IS NULL OR pr.fecha_fin    >= CURRENT_DATE)
      )
      SELECT
          i.id_item,
          i.sku,
          i.nombre                  AS producto,
          m.nombre                  AS marca,
          cat.nombre_categoria      AS categoria,
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
      JOIN  Inventario_Sedes inv  ON inv.id_item      = i.id_item
      JOIN  Sedes s               ON s.id_sede        = inv.id_sede
      LEFT JOIN Marcas m          ON m.id_marca       = i.id_marca
      LEFT JOIN Categorias cat    ON cat.id_categoria = i.id_categoria
      LEFT JOIN promo_vigente pv  ON pv.id_item       = i.id_item
      WHERE i.tipo = 'producto'
    `);

    await queryRunner.query(`
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
        AND (pr.fecha_fin    IS NULL OR pr.fecha_fin    >= CURRENT_DATE)
    `);

    await queryRunner.query(`
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
          SUM(dv.importe) OVER (PARTITION BY v.id_venta) - v.monto_descuento AS total_venta_cabecera,
          b.numero                                                          AS nro_boleta
      FROM Ventas v
      JOIN  Sedes s             ON s.id_sede      = v.id_sede
      JOIN  Empleados e         ON e.id_empleado  = v.id_empleado
      LEFT JOIN Clientes c      ON c.id_cliente   = v.id_cliente
      JOIN  Detalle_Venta dv    ON dv.id_venta    = v.id_venta
      JOIN  Items i             ON i.id_item      = dv.id_item
      LEFT JOIN Boletas b       ON b.id_venta     = v.id_venta
    `);

    await queryRunner.query(`
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
      GROUP BY id_empleado, fecha
    `);

    await queryRunner.query(`
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
               c.nro_documento, c.telefono, c.direccion_completa, c.es_extranjero
    `);

    // Vistas — historial cliente (vendedor + técnico)

    await queryRunner.query(`
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
      LEFT JOIN Garantias g     ON g.id_venta     = v.id_venta
    `);

    await queryRunner.query(`
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
      LEFT JOIN Garantias g                  ON g.id_reparacion = r.id_reparacion
    `);

    // Vistas — técnico

    await queryRunner.query(`
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
      WHERE er.es_final = false
    `);

    await queryRunner.query(`
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
      LEFT JOIN Garantias g                  ON g.id_reparacion = r.id_reparacion
    `);

    await queryRunner.query(`
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
        AND inv.cantidad_actual > 0
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_tecnico_estados_reparacion AS
      SELECT
          id_estado,
          nombre,
          descripcion,
          orden,
          es_final
      FROM Estados_Reparacion
      ORDER BY orden
    `);

    // Vistas — abastecedor

    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_abastecedor_stock_actual AS
      SELECT
          inv.id_inventario,
          inv.id_sede,
          s.nombre                                            AS sede,
          i.id_item,
          i.sku,
          i.nombre                                            AS item,
          i.tipo,
          m.nombre                                            AS marca,
          cat.nombre_categoria                                AS categoria,
          i.modelo,
          i.calidad,
          inv.cantidad_actual,
          inv.stock_minimo,
          (inv.cantidad_actual - inv.stock_minimo)            AS diferencia_stock,
          (inv.cantidad_actual <= inv.stock_minimo)           AS requiere_reposicion,
          i.precio_compra_actual
      FROM Inventario_Sedes inv
      JOIN  Sedes s           ON s.id_sede      = inv.id_sede
      JOIN  Items i           ON i.id_item      = inv.id_item
      LEFT JOIN Marcas m      ON m.id_marca     = i.id_marca
      LEFT JOIN Categorias cat ON cat.id_categoria = i.id_categoria
    `);

    await queryRunner.query(`
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
      ORDER BY (inv.stock_minimo - inv.cantidad_actual) DESC
    `);

    await queryRunner.query(`
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
      LEFT JOIN Marcas m             ON m.id_marca     = i.id_marca
    `);

    await queryRunner.query(`
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
      GROUP BY p.id_proveedor, p.ruc, p.razon_social, p.contacto_nombre, p.telefono
    `);

    // Vista — boletas

    await queryRunner.query(`
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
          SUM(dv.importe) OVER (PARTITION BY v.id_venta) - v.monto_descuento AS total_venta
      FROM Ventas v
      JOIN  Sedes s           ON s.id_sede     = v.id_sede
      JOIN  Empleados e       ON e.id_empleado = v.id_empleado
      LEFT JOIN Clientes c    ON c.id_cliente  = v.id_cliente
      JOIN  Detalle_Venta dv  ON dv.id_venta   = v.id_venta
      JOIN  Items i           ON i.id_item     = dv.id_item
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Vistas
    const views = [
      'v_boleta_venta',
      'v_abastecedor_proveedores',
      'v_abastecedor_historial_compras',
      'v_abastecedor_stock_critico',
      'v_abastecedor_stock_actual',
      'v_tecnico_estados_reparacion',
      'v_tecnico_repuestos_disponibles',
      'v_tecnico_historial_reparaciones',
      'v_tecnico_reparaciones_activas',
      'v_historial_cliente_reparaciones',
      'v_historial_cliente_ventas',
      'v_vendedor_clientes',
      'v_vendedor_resumen_diario',
      'v_vendedor_ventas',
      'v_vendedor_promociones_activas',
      'v_vendedor_catalogo',
      'v_gerente_cambios',
      'v_gerente_compras',
      'v_gerente_empleados',
      'v_gerente_inventario',
      'v_gerente_reparaciones',
      'v_gerente_ventas',
      'v_propietario_sedes',
      'v_propietario_empleados_global',
      'v_propietario_inventario_global',
      'v_propietario_reparaciones_global',
      'v_propietario_ventas_global',
      'v_propietario_resumen_sedes',
    ];
    for (const view of views) {
      await queryRunner.query(`DROP VIEW IF EXISTS ${view} CASCADE`);
    }

    // Triggers (tabla, nombre)
    const triggers: [string, string][] = [
      ['compras_refill', 'trg_compras_check_sede_habilitada'],
      ['reparaciones', 'trg_reparaciones_check_sede_habilitada'],
      ['ventas', 'trg_ventas_check_sede_habilitada'],
      ['empleados', 'trg_empleados_log_delete'],
      ['empleados', 'trg_empleados_log_update'],
      ['empleados', 'trg_empleados_log_insert'],
      ['sedes', 'trg_sedes_log_delete'],
      ['sedes', 'trg_sedes_log_habilitada'],
      ['sedes', 'trg_sedes_log_update'],
      ['sedes', 'trg_sedes_log_insert'],
      ['cambios_producto', 'trg_cambio_producto_insert'],
      ['items', 'trg_items_log_precio'],
      ['garantias', 'trg_garantias_log_estado'],
      ['promociones', 'trg_promociones_log_estado'],
      ['reparaciones', 'trg_reparaciones_log_estado'],
      ['detalle_compra_refill', 'trg_actualizar_precios_item'],
      ['reparacion_repuestos_usados', 'trg_rep_repuestos_delete'],
      ['reparacion_repuestos_usados', 'trg_rep_repuestos_update'],
      ['reparacion_repuestos_usados', 'trg_rep_repuestos_insert'],
      ['detalle_venta', 'trg_det_venta_delete'],
      ['detalle_venta', 'trg_det_venta_update'],
      ['detalle_venta', 'trg_det_venta_insert'],
      ['detalle_compra_refill', 'trg_det_compra_delete'],
      ['detalle_compra_refill', 'trg_det_compra_update'],
      ['detalle_compra_refill', 'trg_det_compra_insert'],
      ['garantias', 'trg_garantias_updated_at'],
      ['reparaciones', 'trg_reparaciones_updated_at'],
      ['ventas', 'trg_ventas_updated_at'],
      ['promociones', 'trg_promociones_updated_at'],
      ['compras_refill', 'trg_compras_refill_updated_at'],
      ['proveedores', 'trg_proveedores_updated_at'],
      ['items', 'trg_items_updated_at'],
      ['clientes', 'trg_clientes_updated_at'],
      ['empleados', 'trg_empleados_updated_at'],
      ['sedes', 'trg_sedes_updated_at'],
    ];
    for (const [table, trigger] of triggers) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS ${trigger} ON ${table}`);
    }

    // Funciones
    const functions = [
      'trg_compras_check_sede_habilitada',
      'trg_reparaciones_check_sede_habilitada',
      'trg_ventas_check_sede_habilitada',
      'trg_empleados_log_delete',
      'trg_empleados_log_update',
      'trg_empleados_log_insert',
      'trg_sedes_log_delete',
      'trg_sedes_log_habilitada',
      'trg_sedes_log_update',
      'trg_sedes_log_insert',
      'trg_cambio_producto_insert',
      'trg_items_log_precio',
      'trg_garantias_log_estado',
      'trg_promociones_log_estado',
      'trg_reparaciones_log_estado',
      'trg_actualizar_precios_item',
      'trg_rep_repuestos_delete',
      'trg_rep_repuestos_update',
      'trg_rep_repuestos_insert',
      'trg_det_venta_delete',
      'trg_det_venta_update',
      'trg_det_venta_insert',
      'trg_det_compra_delete',
      'trg_det_compra_update',
      'trg_det_compra_insert',
      'fn_get_id_inventario',
      'fn_get_actor_id',
      'fn_log_cambio_estado',
      'fn_log_operacion',
      'fn_set_updated_at',
    ];
    for (const fn of functions) {
      await queryRunner.query(`DROP FUNCTION IF EXISTS ${fn} CASCADE`);
    }
  }
}
