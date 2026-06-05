/** Fija TZ antes de imports → Date() y drivers PostgreSQL usan process.env.TZ al iniciar. */
process.env.TZ = 'America/Lima';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ValidationPipe global: whitelist + forbidNonWhitelisted + transform.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // GlobalExceptionFilter: serializa errores en envelope JSON uniforme.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS para frontend Next.js (distinto dominio en dev/prod).
  app.enableCors();

  // Prefijo global /api + versionado URI /v1.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Swagger en /api/docs con Bearer Auth para probar endpoints protegidos.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Guru Tech Dev — Vendedor Sprint 1')
    .setDescription('REST API para el rol Vendedor')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  // Puerto desde .env; default 3000.
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
void bootstrap();
