/** Orquestador principal de seeds. Ejecuta seeds 01-10 en orden dentro de una transacción. Rollback si alguno falla. */

import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { seedMaster } from './seed-01-master';
import { seedEmpleados } from './seed-02-empleados';
import { seedClientes } from './seed-03-clientes';
import { seedCatalogo } from './seed-04-catalogo';
import { seedProveedores } from './seed-05-proveedores';
import { seedCompras } from './seed-06-compras';
import { seedReparaciones } from './seed-07-reparaciones';
import { seedCambios } from './seed-08-cambios';
import { seedVentas } from './seed-09-ventas';
import { seedGarantias } from './seed-10-garantias';

async function main(): Promise<void> {
  console.log('============================================================');
  console.log(' SEED — Todos los módulos / Seeds 01-10');
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
        garantias,
        Cambios_Producto,
        Pagos,
        reparacion_repuestos_usados,
        reparaciones,
        estados_reparacion,
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
    await seedReparaciones(qr);
    await seedCambios(qr);
    await seedVentas(qr);
    await seedGarantias(qr);

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
    console.log('\n  VENTAS (10 ventas, 11 pagos)');
    console.log('    GET /ventas        → historial del vendedor autenticado');
    console.log('    ids 1-4: ventas del flujo de cambios (seed-08)');
    console.log('    ids 5-10: ventas directas con pagos (seed-09)');
    console.log('\n  REPARACIONES (4 reparaciones, un estado por reparación)');
    console.log('    id=1  pendiente   Samsung Galaxy A54  + adelanto S/60 pagado');
    console.log('    id=2  reparacion  Apple iPhone 12     (sin pago aún)');
    console.log('    id=3  listo       Xiaomi Redmi Note 12  sede 2');
    console.log('    id=4  entregado   Samsung Galaxy A52');
    console.log('\n  GARANTÍAS (3 garantías)');
    console.log('    id=1  venta 5      activa   hasta 2026-12-10');
    console.log('    id=2  reparacion 1 activa   hasta 2026-09-16');
    console.log('    id=3  venta 6      vencida  desde 2026-01-31');
    console.log('\n  CAMBIOS');
    console.log(
      '    GET /cambios             → 3 cambios sede 1 para vendedor',
    );
    console.log('    GET /cambios/3/boleta    → boleta ya emitida');
    console.log('    POST /cambios/1/boleta   → emite boleta nueva');
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
