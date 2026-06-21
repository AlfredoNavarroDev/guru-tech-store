// reflect-metadata requerido por los decoradores de TypeORM (@Entity, @Column).
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Carga .env manualmente: este archivo se usa fuera del ciclo de NestJS (CLI de migraciones, seeds).
dotenv.config();

// DataSource para CLI de TypeORM y scripts de seed.
// Separado de AppModule porque la CLI no tiene acceso al contenedor de NestJS.
const isProd = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

const baseConfig = {
  type: 'postgres' as const,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  ssl: isProd ? { rejectUnauthorized: false } : false,
};

export const AppDataSource = new DataSource(
  databaseUrl
    ? { ...baseConfig, url: databaseUrl }
    : {
        ...baseConfig,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
      },
);
