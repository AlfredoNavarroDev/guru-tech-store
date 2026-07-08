// Fija zona horaria de Perú antes de cualquier import.
process.env.TZ = 'America/Lima';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // ValidationPipe global: descarta campos no declarados y transforma tipos.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtro global que unifica el formato JSON de errores.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Habilita CORS para el frontend Next.js.
  app.enableCors();

  // Prefijo /api con versionado URI v1 por defecto.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Swagger disponible en /api/docs con autenticación Bearer.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Guru Tech Dev')
    .setDescription('REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  // Puerto desde variable de entorno, por defecto 3000.
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
void bootstrap();
