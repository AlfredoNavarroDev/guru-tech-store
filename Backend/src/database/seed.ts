/**
 * seed.ts — Orquestador principal
 *
 * Ejecuta todos los seeders del Sprint 1 en orden dentro de UNA transacción.
 * Si cualquier seeder falla, se hace ROLLBACK completo y el DB queda limpio.
 *
 * Uso:
 *   npm run seed
 *
 * Orden de ejecución (respeta FKs y triggers):
 *   01 → Sedes, Roles, Marcas, Categorias
 *   02 → Empleados, Empleado_Roles   (necesita Sedes, Roles)
 *   03 → Clientes                    (sin FKs a tablas anteriores)
 *   04 → Items, Inventario_Sedes,    (necesita Sedes, Marcas, Categorias)
 *         Promociones
 *   05 → Ventas, Detalle_Venta,      (necesita Sedes, Empleados, Clientes,
 *         Pagos, Boletas              Items, Inventario_Sedes)
 *
 * Tablas omitidas (externas al flujo vendedor Sprint 1):
 *   Proveedores, Compras_Refill, Detalle_Compra_Refill
 *   Reparaciones, Reparacion_Repuestos_Usados
 *   Garantias, Cambios_Producto
 *   Estados_Reparacion, Empleados técnicos/abastecedores
 *   Logs_Sistema (se autorrellena via triggers, no se seedea manualmente)
 */

import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { seedMaster } from './seed-01-master';
import { seedEmpleados } from './seed-02-empleados';
import { seedClientes } from './seed-03-clientes';
import { seedCatalogo } from './seed-04-catalogo';
import { seedVentas } from './seed-05-ventas';

async function main(): Promise<void> {
  console.log('============================================================');
  console.log(' SEED — Sprint 1 / Flujo Vendedor');
  console.log('============================================================');

  // Conectar al DataSource (lee .env automáticamente via data-source.ts)
  console.log('\nConectando a la base de datos...');
  await AppDataSource.initialize();
  console.log('OK - Conexión establecida');

  // QueryRunner permite agrupar todos los INSERTs en una sola transacción.
  // Si cualquier seeder falla, el catch hace ROLLBACK y el DB queda en estado
  // limpio (ninguna tabla parcialmente poblada).
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    // ── TRUNCATE ─────────────────────────────────────────────────────────
    // Se limpian TODAS las tablas del flujo vendedor en orden inverso de FK.
    // Se incluye Logs_Sistema porque los triggers de ventas escriben ahí y
    // las FKs de Logs_Sistema a Empleados/Sedes bloquearían el truncate
    // si no se limpia también.
    // RESTART IDENTITY: resetea secuencias para que los ids empiecen desde 1.
    // CASCADE: propaga el truncate a tablas dependientes no listadas explícitamente.
    console.log('\nLimpiando tablas...');
    await qr.query(`
      TRUNCATE TABLE
        Logs_Sistema,
        Boletas,
        Pagos,
        Detalle_Venta,
        Ventas,
        Movimientos_Inventario,
        Inventario_Sedes,
        Promociones,
        Items,
        Empleado_Roles,
        Empleados,
        Clientes,
        Categorias,
        Marcas,
        Roles,
        Sedes
      RESTART IDENTITY CASCADE
    `);
    console.log('OK - Tablas limpias\n');

    // ── Seeders en orden ─────────────────────────────────────────────────
    // Cada función recibe el mismo QueryRunner para participar de la misma
    // transacción. El orden es estricto: cada seed depende de los anteriores.
    await seedMaster(qr);
    await seedEmpleados(qr);
    await seedClientes(qr);
    await seedCatalogo(qr);
    await seedVentas(qr);

    // ── COMMIT ────────────────────────────────────────────────────────────
    // Solo se persiste si TODOS los seeders completaron sin error.
    await qr.commitTransaction();

    console.log('============================================================');
    console.log(' SEED COMPLETADO');
    console.log('============================================================');
    console.log('\nDatos listos para probar Sprint 1:');
    console.log('\n  LOGIN');
    console.log('    POST /auth/login');
    console.log(
      '    { "nro_documento": "10003001", "password": "Vendedor123!" }  → vendedor sede 1',
    );
    console.log(
      '    { "nro_documento": "10003002", "password": "Vendedor123!" }  → vendedor sede 2',
    );
    console.log(
      '    { "nro_documento": "10003099", "password": "Vendedor123!" }  → 401 (suspendido)',
    );
    console.log('\n  CATÁLOGO  (requiere JWT vendedor sede 1 o 2)');
    console.log(
      '    GET /catalogo?id_sede=1   → 6 productos, algunos con promo',
    );
    console.log('    GET /catalogo?id_sede=1&con_stock=true');
    console.log('    GET /catalogo?id_sede=1&nombre=cable');
    console.log('\n  CLIENTES');
    console.log('    GET  /clientes            → 6 clientes');
    console.log('    GET  /clientes/1');
    console.log('    POST /clientes');
    console.log('    PATCH /clientes/1');
    console.log('\n  VENTAS  (requiere JWT vendedor de la sede correcta)');
    console.log(
      '    GET  /ventas              → ventas del vendedor autenticado',
    );
    console.log('    GET  /ventas/1            → detalle venta 1');
    console.log('    POST /ventas');
    console.log('\n  PAGOS & BOLETAS');
    console.log('    GET  /ventas/1/pagos');
    console.log('    POST /ventas/1/pagos      → { metodo_pago, monto }');
    console.log('    GET  /ventas/1/boleta');
    console.log(
      '    POST /ventas/1/boleta     → genera PDF + sube a S3 (requiere R2 config)',
    );
    console.log('');
  } catch (err) {
    // Revertir todo si cualquier seed falla — el DB queda vacío (estado limpio)
    await qr.rollbackTransaction();
    console.error('\n[ERROR] Seed fallido. Se hizo ROLLBACK. DB queda vacío.');
    console.error(err);
    process.exit(1);
  } finally {
    // release() devuelve la conexión al pool; destroy() cierra el DataSource.
    // Se ejecutan siempre (éxito o error) para no dejar conexiones abiertas.
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('[FATAL] Error no capturado en seed:', err);
  process.exit(1);
});
