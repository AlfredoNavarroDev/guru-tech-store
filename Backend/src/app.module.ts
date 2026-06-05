import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { VentasModule } from './ventas/ventas.module';
import { BoletasModule } from './boletas/boletas.module';
import { PagosModule } from './pagos/pagos.module';

@Module({
  imports: [
    // ConfigModule global: valida .env con Joi al iniciar la app.
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),

    // TypeORM async: espera a ConfigService antes de conectar a PostgreSQL.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const databaseUrl = config.get<string>('DATABASE_URL');

        const baseConfig = {
          type: 'postgres' as const,
          synchronize: false,
          logging: !isProd,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          ssl: isProd ? { rejectUnauthorized: false } : false,
        };

        // DATABASE_URL (Neon) tiene prioridad sobre variables individuales.
        if (databaseUrl) {
          return { ...baseConfig, url: databaseUrl };
        }

        return {
          ...baseConfig,
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASS'),
          database: config.get<string>('DB_NAME'),
        };
      },
    }),

    // Módulos del Sprint 1 — flujo de Vendedor.
    AuthModule,
    ClientesModule,
    CatalogoModule,
    VentasModule,
    BoletasModule,
    PagosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
