import cors from 'cors';
import { env } from '../lib/env.js';

const isProduction = env.NODE_ENV === 'production';

export const corsMiddleware = cors({
  origin: isProduction ? env.APP_URL : true,
  credentials: true
});
