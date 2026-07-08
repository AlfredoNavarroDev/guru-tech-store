/**
 * Seed 10 — Garantías de prueba.
 * Cubre los 3 estados del ciclo de vida: activa, vencida.
 * Incluye una garantía de venta y una de reparación (cobertura del patrón XOR).
 * Depende de: seed-07 (reparaciones), seed-09 (ventas 5-10).
 */

import { QueryRunner } from 'typeorm';

export async function seedGarantias(qr: QueryRunner): Promise<void> {
  console.log('\n[Seed 10] Garantías...');

  await qr.query(`
    INSERT INTO garantias
      (id_garantia, id_venta, id_reparacion, fecha_inicio, fecha_fin, estado)
    VALUES
      -- Garantía de venta 5 (Cable USB-C + Cargador), vigente 6 meses
      (1, 5, NULL, '2026-06-10', '2026-12-10', 'activa'),
      -- Garantía de reparacion 1 (Samsung Galaxy A54), vigente 3 meses
      (2, NULL, 1, '2026-06-16', '2026-09-16', 'activa'),
      -- Garantía de venta 6 (Auriculares), ya vencida (enero 2026)
      (3, 6, NULL, '2026-01-01', '2026-01-31', 'vencida')
  `);

  await qr.query(
    `SELECT setval(pg_get_serial_sequence('garantias', 'id_garantia'), 3)`,
  );

  console.log('  OK - 3 garantías');
  console.log('    id=1  venta 5       activa   hasta 2026-12-10  (6 meses)');
  console.log('    id=2  reparacion 1  activa   hasta 2026-09-16  (3 meses)');
  console.log('    id=3  venta 6       vencida  desde 2026-01-31');
  console.log('[Seed 10] Completado.\n');
}
