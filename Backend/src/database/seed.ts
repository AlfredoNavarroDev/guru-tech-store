/** Orquestador principal de seeds. Ejecuta seeds 01-06 en orden dentro de una transacción. Rollback si alguno falla. */

import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { seedMaster } from './seed-01-master';
import { seedEmpleados } from './seed-02-empleados';
import { seedClientes } from './seed-03-clientes';
import { seedCatalogo } from './seed-04-catalogo';
import { seedProveedores } from './seed-05-proveedores';
import { seedCompras } from './seed-06-compras';

async function main(): Promise<void> {
  console.log('============================================================');
  console.log(' SEED — Sprint 2 / Todos los roles');
  console.log('============================================================');

  console.log('\nConectando a la base de datos...');
  await AppDataSource.initialize();
  console.log('OK - Conexión establecida');

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    console.log('\nLimpiando tablas...');
    await qr.query(`
      TRUNCATE TABLE
        Logs_Sistema,
        Boletas,
        Pagos,
        Detalle_Venta,
        Ventas,
        Movimientos_Inventario,
        RefreshTokens,
        Detalle_Compra_Refill,
        Compras_Refill,
        Inventario_Sedes,
        Promociones,
        Item_Categorias,
        Items,
        Empleados,
        Clientes,
        Categorias,
        Marcas,
        Roles,
        Proveedores,
        Sedes
      RESTART IDENTITY CASCADE
    `);
    console.log('OK - Tablas limpias\n');

    await seedMaster(qr);
    await seedEmpleados(qr);
    await seedClientes(qr);
    await seedCatalogo(qr);
    await seedProveedores(qr);
    await seedCompras(qr);

    await qr.commitTransaction();

    console.log('============================================================');
    console.log(
      ' SEED COMPLETADO — credenciales de prueba (password: Vendedor123!)',
    );
    console.log('============================================================');
    console.log('\n  ROL ADMIN');
    console.log('    DNI 10002001  → admin    sede 1 (Lima Centro)');
    console.log('    DNI 10002002  → admin    sede 2 (Miraflores)');
    console.log('\n  ROL VENDEDOR');
    console.log('    DNI 10003001  → vendedor sede 1');
    console.log('    DNI 10003002  → vendedor sede 2');
    console.log('\n  ROL TÉCNICO');
    console.log('    DNI 10004001  → técnico  sede 1');
    console.log('    DNI 10004002  → técnico  sede 2');
    console.log('\n  ROL ABASTECEDOR');
    console.log(
      '    DNI 10005001  → abastecedor sede 1  (tiene 3 compras, stock crítico/bajo/OK)',
    );
    console.log(
      '    DNI 10005002  → abastecedor sede 2  (stock independiente de sede 1)',
    );
    console.log('\n  CASO BORDE');
    console.log('    DNI 10003099  → suspendido → 401');
    console.log('\n  CATÁLOGO (20 items: 14 productos + 6 repuestos, 2 sedes)');
    console.log('    GET /catalogo?id_sede=1   → 14 productos con promos');
    console.log(
      '    GET /catalogo?id_sede=2   → mismo catálogo, stock independiente',
    );
    console.log('\n  STOCK ABASTECEDOR');
    console.log(
      '    GET /stock?id_sede=1                     → todos los items',
    );
    console.log(
      '    GET /stock?id_sede=1&requiere_reposicion=true → críticos y bajos',
    );
    console.log('    GET /stock/critico?id_sede=1             → solo críticos');
    console.log('');
  } catch (err) {
    await qr.rollbackTransaction();
    console.error('\n[ERROR] Seed fallido. Se hizo ROLLBACK. DB queda vacío.');
    console.error(err);
    process.exit(1);
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('[FATAL] Error no capturado en seed:', err);
  process.exit(1);
});
