import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../data-source';

dotenv.config();

async function migrate(): Promise<void> {
  await AppDataSource.initialize();
  const migrations = await AppDataSource.runMigrations();
  await AppDataSource.destroy();

  if (migrations.length === 0) {
    console.log('Migraciones TypeORM: ninguna pendiente');
  } else {
    console.log(
      `Migraciones TypeORM aplicadas: ${migrations.map((m) => m.name).join(', ')}`,
    );
  }

  console.log('============================================================');
  console.log(' MIGRACIÓN COMPLETA');
  console.log('============================================================');
  console.log('\nEjecuta `npm run seed` para poblar datos de prueba.');
}

migrate().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n[ERROR] Migración fallida:', message);
  process.exit(1);
});
