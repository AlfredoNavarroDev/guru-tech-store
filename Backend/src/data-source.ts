// reflect-metadata debe importarse antes que cualquier decorador de TypeORM,
// porque los decoradores (@Entity, @Column, etc.) se apoyan en la API de
// metadatos que este polyfill agrega al runtime de Node.js.
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Se carga el .env manualmente porque este archivo se ejecuta FUERA del ciclo
// de vida de NestJS (CLI de migraciones, scripts de seed). ConfigModule no
// está disponible aquí, así que dotenv.config() lee el archivo .env directamente.
dotenv.config();

// AppDataSource es la instancia de conexión que usa la CLI de TypeORM para
// ejecutar migraciones (`typeorm migration:run`) y que los scripts de seed
// importan para obtener un QueryRunner con transacción controlada.
//
// IMPORTANTE: Este archivo existe de forma separada a la configuración de
// TypeOrmModule en app.module.ts por un motivo arquitectónico: la CLI de
// TypeORM y los scripts Node.js puros no tienen acceso al contenedor de IoC
// de NestJS. Ambas configuraciones (aquí y en AppModule) deben mantenerse
// sincronizadas al agregar nuevas entidades o cambiar credenciales.
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
