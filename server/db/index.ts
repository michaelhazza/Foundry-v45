import { env } from '../lib/env.js';
import * as schema from './schema/index.js';

let db: any;

if (env.DATABASE_URL.includes('neon.tech') || env.DATABASE_URL.includes('neon.cloud')) {
  // Production: Neon serverless driver
  const { neon } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-http');
  const sql = neon(env.DATABASE_URL);
  db = drizzle(sql, { schema });
} else {
  // Local development: standard pg driver
  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pool = new pg.default.Pool({ connectionString: env.DATABASE_URL });
  db = drizzle(pool, { schema });
}

export { db };
