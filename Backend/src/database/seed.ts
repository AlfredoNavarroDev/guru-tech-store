/** Orquestador principal de seeds. Ejecuta seeds 01-05 en orden dentro de una transacción. Rollback si alguno falla. */

import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { seedMaster } from './seed-01-master';
import { seedEmpleados } from './seed-02-empleados';
import { seedCatalogo } from './seed-04-catalogo';

async function main(): Promise<void> {
  console.log('============================================================');
  console.log(' SEED — Sprint 1 / Flujo Vendedor');
  console.log('============================================================');

  // Conectar al DataSource (lee .env via data-source.ts)
  console.log('\nConectando a la base de datos...');
  await AppDataSource.initialize();
  console.log('OK - Conexión establecida');

  // QueryRunner para agrupar todos los INSERTs en una transacción
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    // Limpiar tablas en orden inverso de FK. CASCADE propaga a dependientes.
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

    // Seeders en orden estricto (cada uno depende de los anteriores)
    await seedMaster(qr);
    await seedEmpleados(qr);
    await seedCatalogo(qr);

    // COMMIT solo si TODOS los seeders completaron sin error
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
    console.log('');
  } catch (err) {
    // Revertir todo si cualquier seed falla. DB queda vacío.
    await qr.rollbackTransaction();
    console.error('\n[ERROR] Seed fallido. Se hizo ROLLBACK. DB queda vacío.');
    console.error(err);
    process.exit(1);
  } finally {
    // Liberar conexión al pool y cerrar DataSource
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('[FATAL] Error no capturado en seed:', err);
  process.exit(1);
});
