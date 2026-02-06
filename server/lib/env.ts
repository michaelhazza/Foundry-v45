import { z } from 'zod';

const baseSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  JWT_SECRET: z.string().min(32),
  APP_URL: z.string().url().refine(url => !url.endsWith('/'), 'No trailing slash'),
  PORT: z.string().default('5000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MAX_FILE_SIZE_BYTES: z.string().default('52428800'),
});

const baseEnv = baseSchema.parse(process.env);

let ENCRYPTION_KEY: string | undefined;

if (process.env.ENCRYPTION_KEY) {
  if (process.env.ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
} else if (baseEnv.NODE_ENV === 'production') {
  throw new Error(
    'ENCRYPTION_KEY is required in production. ' +
    'Reason: Source data contains PII that must be encrypted at rest per GDPR compliance.'
  );
} else {
  console.warn(
    '[WARN] ENCRYPTION_KEY not set - source file encryption disabled. ' +
    'This is acceptable in development but MUST be set in production.'
  );
}

export const env = {
  ...baseEnv,
  ENCRYPTION_KEY,
};
