/**
 * Seed 03 — Clientes
 *
 * Pobla: Clientes
 * Dependencias: seed-01 (ninguna FK directa, pero la vista v_vendedor_clientes
 *               hace JOIN con Ventas que referencia a Sedes/Empleados)
 *
 * Se inserta ANTES de seed-05 (Ventas) porque Ventas.id_cliente referencia
 * Clientes con FK. El orden aquí (después de seed-02) es por convención de
 * flujo: master → personal → clientes → catálogo → transacciones.
 *
 * Casos de prueba cubiertos:
 *   - Cliente con todos los campos
 *   - Cliente sin telefono (nullable)
 *   - Cliente sin direccion (nullable)
 *   - Cliente extranjero (para probar el flag es_extranjero)
 *   - Cliente que será usado en ventas del seed-05
 */

import { QueryRunner } from 'typeorm';

export async function seedClientes(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 03] Clientes...');

  console.log('  Insertando Clientes...');
  await qr.query(`
    INSERT INTO Clientes
      (id_cliente, tipo_documento, nro_documento, nombre_completo,
       telefono, direccion_completa, es_extranjero)
    VALUES
      -- Clientes nacionales completos (usados en seed-05-ventas)
      (1, 'DNI', '45001001', 'Ana García Pérez',
          '976-100-001', 'Av. Salaverry 120, Lima', false),
      (2, 'DNI', '45002002', 'Pedro Huamán Quispe',
          '976-100-002', 'Jr. Callao 55, Lima', false),
      (3, 'DNI', '45003003', 'Sofía Méndez Castillo',
          '976-100-003', 'Calle Los Ángeles 8, Miraflores', false),

      -- Cliente sin teléfono: prueba que el campo nullable funciona en la vista
      (4, 'DNI', '45004004', 'Carlos Quispe Tapia',
          NULL, 'Jr. Ucayali 340, Lima', false),

      -- Cliente sin dirección: prueba campo nullable
      (5, 'DNI', '45005005', 'Valeria Rojas Aguirre',
          '976-100-005', NULL, false),

      -- Cliente extranjero: pasaporte en lugar de DNI
      (6, 'PASAPORTE', 'AB123456', 'John Smith',
          '+1-555-0100', NULL, true)
  `);
  console.log('  OK - 6 clientes (ids 1-6)');
  console.log('    ids 1-3: usados en ventas del seed-05');
  console.log('    id 4:    sin teléfono');
  console.log('    id 5:    sin dirección');
  console.log('    id 6:    extranjero con PASAPORTE');

  // ── Reset sequences ───────────────────────────────────────────────────────
  // El siguiente cliente creado en tiempo de ejecución recibirá id=7.
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Clientes', 'id_cliente'), 6)`,
  );

  console.log('[Seed 03] Completado.\n');
}
