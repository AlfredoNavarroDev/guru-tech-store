import * as Joi from 'joi';

// Esquema Joi que valida .env al iniciar la app. Variables inválidas → error claro al arranque.
export const envValidationSchema = Joi.object({
  // development | production | test. Controla logging, SSL, etc.
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Puerto HTTP. Por defecto 3000.
  PORT: Joi.number().default(3000),

  // DATABASE_URL (Neon) tiene prioridad. Si no existe, las vars individuales son obligatorias.
  DATABASE_URL: Joi.string().uri().optional(),
  DB_HOST: Joi.when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  DB_PASS: Joi.when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),
  DB_NAME: Joi.when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.string().required(),
  }),

  // JWT_SECRET: mínimo 32 caracteres para entropía suficiente en HS256.
  JWT_SECRET: Joi.string().min(32).required(),

  // Access token de vida corta para limitar ventana de exposición.
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Refresh token de vida más larga para renovar sin reautenticar.
  REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // Debe coincidir con process.env.TZ en main.ts.
  TZ: Joi.string().default('America/Lima'),

  // Credenciales Cloudflare R2 (S3-compatible) para PDFs de boletas.
  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().optional(),
  R2_PUBLIC_URL: Joi.string().optional(),
});
