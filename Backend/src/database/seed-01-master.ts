/**
 * Seed 01 — Tablas maestras de referencia
 *
 * Pobla: Sedes, Roles, Marcas, Categorias
 * Omitido: Proveedores, Estados_Reparacion (externos al flujo vendedor)
 * Dependencias: ninguna (primer seed)
 *
 * Debe ejecutarse PRIMERO porque todos los demás seeds referencian estas tablas
 * mediante FK. Si se insertara en otro orden, PostgreSQL lanzaría error de
 * violación de clave foránea.
 */

import { QueryRunner } from 'typeorm';

export async function seedMaster(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 01] Tablas maestras...');

  // ── Sedes ─────────────────────────────────────────────────────────────────
  // Dos sedes para poder probar que el catalogo y ventas son por sede
  console.log('  Insertando Sedes...');
  await qr.query(`
    INSERT INTO Sedes (id_sede, nombre, direccion, telefono, hora_apertura, hora_cierre) VALUES
    (1, 'TechStore Lima Centro',  'Jr. de la Unión 620, Lima',     '01-4271890', '09:00', '20:00'),
    (2, 'TechStore Miraflores',   'Av. Larco 345, Miraflores',     '01-4459320', '09:30', '21:00')
  `);
  console.log('  OK - 2 sedes (id 1 y 2)');

  // ── Roles ─────────────────────────────────────────────────────────────────
  // Se insertan todos los roles porque el JWT payload incluye el array de roles
  // y la tabla Roles es referenciada por Empleado_Roles con FK
  console.log('  Insertando Roles...');
  await qr.query(`
    INSERT INTO Roles (id_rol, nombre_rol) VALUES
    (1, 'propietario'),
    (2, 'gerente'),
    (3, 'vendedor'),
    (4, 'tecnico'),
    (5, 'abastecedor')
  `);
  console.log('  OK - 5 roles');

  // ── Marcas ────────────────────────────────────────────────────────────────
  // Solo las marcas que usan los Items del seed-04-catalogo
  console.log('  Insertando Marcas...');
  await qr.query(`
    INSERT INTO Marcas (id_marca, nombre) VALUES
    (1, 'Samsung'),
    (2, 'Apple'),
    (3, 'Anker'),
    (4, 'Xiaomi'),
    (5, 'Genérico')
  `);
  console.log('  OK - 5 marcas');

  // ── Categorias ────────────────────────────────────────────────────────────
  // Las 4 categorias que usa la vista v_vendedor_catalogo para productos
  console.log('  Insertando Categorias...');
  await qr.query(`
    INSERT INTO Categorias (id_categoria, nombre_categoria) VALUES
    (1, 'Cables y Cargadores'),
    (2, 'Fundas y Protectores'),
    (3, 'Auriculares'),
    (4, 'Accesorios')
  `);
  console.log('  OK - 4 categorias');

  // ── Reset sequences ───────────────────────────────────────────────────────
  // Se ajustan las secuencias al valor máximo insertado para que futuros INSERTs
  // sin id explícito (como los que hace NestJS en tiempo de ejecución real) no
  // colisionen con los ids fijos del seed.
  // pg_get_serial_sequence devuelve el nombre de la secuencia asociada a la columna,
  // independientemente del nombre interno que PostgreSQL le asignó al crearla.
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Sedes',      'id_sede'),       2)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Roles',      'id_rol'),        5)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Marcas',     'id_marca'),      5)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Categorias', 'id_categoria'),  4)`,
  );

  console.log('[Seed 01] Completado.\n');
}
