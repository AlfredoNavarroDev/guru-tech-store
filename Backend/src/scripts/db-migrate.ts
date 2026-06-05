import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const DB_DIR = path.join(__dirname, '../../../DB');

// Orden estricto: Tables primero (FKs e índices), luego Views (dependen de tablas),
// luego Triggers (dependen de tablas y Views).
const SQL_FILES = ['DB-Tables.sql', 'DB-Views.sql', 'DB-Triggers.sql'];

async function migrate(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL no definida en .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log('Conectado a la base de datos\n');

  for (const file of SQL_FILES) {
    const filePath = path.join(DB_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`SKIP — ${file} no encontrado`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Aplicando ${file}...`);
    await client.query(sql);
    console.log(`OK    ${file}\n`);
  }

  await client.end();
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
