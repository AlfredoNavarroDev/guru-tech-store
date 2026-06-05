import * as Joi from 'joi';

/**
 * @purpose Esquema Joi para validar .env al arranque.
 * .env inválido → app falla con mensaje claro, no en runtime.
 */
export const envValidationSchema = Joi.object({
  /** development | production | test. Controla logging, SSL, etc. */
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  /** Puerto HTTP. Default 3000 evita config extra en local. */
  PORT: Joi.number().default(3000),

  /** DATABASE_URL (Neon) tiene precedencia. Sin ella → vars individuales required. */
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

  /** JWT_SECRET: mínimo 32 chars → entropía suficiente para HS256. */
  JWT_SECRET: Joi.string().min(32).required(),

  /** Access token: vida corta (min/horas) limita ventana de exposición. */
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  /** Refresh token: vida más larga, permite renovar sin re-autenticar. */
  REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  /** Debe coincidir con process.env.TZ en main.ts. */
  TZ: Joi.string().default('America/Lima'),

  /** Credenciales Cloudflare R2 (S3-compatible) para PDFs de boletas. */
  R2_ACCOUNT_ID: Joi.string().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().optional(),
  R2_PUBLIC_URL: Joi.string().optional(),
});
