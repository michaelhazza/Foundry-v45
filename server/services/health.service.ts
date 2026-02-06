import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export async function getHealthStatus() {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - start;
    return {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'healthy' as const, latencyMs }
      }
    };
  } catch {
    const latencyMs = Date.now() - start;
    return {
      status: 'unhealthy' as const,
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'unhealthy' as const, latencyMs }
      }
    };
  }
}
