import { env } from './env.js';

export const config = {
  port: parseInt(env.PORT, 10),
  apiPort: 3001,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  maxFileSizeBytes: parseInt(env.MAX_FILE_SIZE_BYTES, 10),
  appUrl: env.APP_URL,
};
