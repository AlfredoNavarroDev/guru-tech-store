/** Seed 01 — Tablas maestras: Sedes, Roles, Marcas, Categorias. Debe ejecutarse primero (FKs). */

import { QueryRunner } from 'typeorm';

export async function seedMaster(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 01] Tablas maestras...');

  // Dos sedes para probar catálogo y ventas por sede
  console.log('  Insertando Sedes...');
  await qr.query(`
    INSERT INTO Sedes (id_sede, nombre, direccion, telefono, hora_apertura, hora_cierre) VALUES
    (1, 'TechStore Lima Centro',  'Jr. de la Unión 620, Lima',     '01-4271890', '09:00', '20:00'),
    (2, 'TechStore Miraflores',   'Av. Larco 345, Miraflores',     '01-4459320', '09:30', '21:00')
  `);
  console.log('  OK - 2 sedes (id 1 y 2)');

  // Roles usados por Empleado_Roles y JWT payload
  console.log('  Insertando Roles...');
  await qr.query(`
    INSERT INTO Roles (id_rol, nombre_rol) VALUES
    (1, 'propietario'),
    (2, 'administrador'),
    (3, 'vendedor'),
    (4, 'tecnico'),
    (5, 'abastecedor')
  `);
  console.log('  OK - 5 roles');

  // Marcas usadas por los Items del seed-04
  console.log('  Insertando Marcas...');
  await qr.query(`
    INSERT INTO Marcas (id_marca, nombre) VALUES
    (1, 'Samsung'),
    (2, 'Apple'),
    (3, 'Anker'),
    (4, 'Xiaomi'),
    (5, 'Genérico'),
    (6, 'Huawei'),
    (7, 'Logitech'),
    (8, 'HP'),
    (9, 'Lenovo')
  `);
  console.log('  OK - 9 marcas');

  // Categorías usadas por v_vendedor_catalogo
  console.log('  Insertando Categorias...');
  await qr.query(`
    INSERT INTO Categorias (id_categoria, nombre_categoria) VALUES
    (1, 'Cables y Cargadores'),
    (2, 'Fundas y Protectores'),
    (3, 'Auriculares'),
    (4, 'Accesorios'),
    (5, 'Teclados y Mouse'),
    (6, 'Almacenamiento')
  `);
  console.log('  OK - 6 categorias');

  // Ajustar secuencias para no colisionar con ids fijos del seed
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Sedes',      'id_sede'),       2)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Roles',      'id_rol'),        5)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Marcas',     'id_marca'),      9)`,
  );
  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Categorias', 'id_categoria'),  6)`,
  );

  console.log('[Seed 01] Completado.\n');
}
