/** Seed 03 — Clientes: DNI, CE y pasaporte para probar tipos de cliente en flujo vendedor. Depende de seed-01. */

import { QueryRunner } from 'typeorm';

export async function seedClientes(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 03] Clientes...');

  await qr.query(`
    INSERT INTO Clientes
      (id_cliente, tipo_documento, nro_documento, nombre_completo,
       telefono, direccion_completa, es_extranjero)
    VALUES
      (1,  'DNI',       '12345678',     'Juan Pérez García',        '987-100-001', 'Av. Arequipa 1234, Lima',    false),
      (2,  'DNI',       '87654321',     'María López Flores',       '987-100-002', 'Jr. Callao 456, Lima',       false),
      (3,  'DNI',       '45678912',     'Carlos Quispe Mamani',     NULL,           NULL,                          false),
      (4,  'DNI',       '36985214',     'Rosa Huanca Puma',         '987-100-004', 'Av. Brasil 789, Callao',     false),
      (5,  'CE',        'C00123456789', 'James Wilson Torres',      '987-100-005', 'Miraflores, Lima',           true),
      (6,  'CE',        'E99887766554', 'Sofía Chen Ramírez',       NULL,           NULL,                          true),
      (7,  'pasaporte', 'ABC1234',      'Emma Johnson',             NULL,           NULL,                          true),
      (8,  'pasaporte', 'US98765',      'Michael Davis',            '987-100-008', 'San Isidro, Lima',           true)
  `);
  console.log('  OK - 8 clientes');
  console.log('    ids 1-4  DNI (nacionales, variados: con/sin teléfono)');
  console.log('    ids 5-6  CE  (extranjeros)');
  console.log('    ids 7-8  pasaporte (extranjeros)');

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Clientes', 'id_cliente'), 8)`,
  );

  console.log('[Seed 03] Completado.\n');
}
