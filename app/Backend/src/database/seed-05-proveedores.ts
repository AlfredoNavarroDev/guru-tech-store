/** Seed 05 — Proveedores para flujo abastecedor. Depende de seed-01. */

import { QueryRunner } from 'typeorm';

export async function seedProveedores(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 05] Proveedores...');

  await qr.query(`
    INSERT INTO Proveedores (id_proveedor, ruc, razon_social, contacto_nombre, telefono)
    VALUES
      (1, '20123456789', 'Distribuidora TecParts S.A.C.',   'Rodrigo Vásquez', '01-3456789'),
      (2, '20987654321', 'Importaciones Cell World S.R.L.', 'Sofía Herrera',   '01-7654321'),
      (3, '20456789123', 'Global Accessories Peru S.A.',    'Fernando Mora',   '01-4567891')
  `);
  console.log('  OK - 3 proveedores');
  console.log('    id=1  Distribuidora TecParts (accesorios y cables)');
  console.log('    id=2  Importaciones Cell World (pantallas y baterías)');
  console.log('    id=3  Global Accessories Peru (varios)');

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('Proveedores', 'id_proveedor'), 3)`,
  );

  console.log('[Seed 05] Completado.\n');
}
