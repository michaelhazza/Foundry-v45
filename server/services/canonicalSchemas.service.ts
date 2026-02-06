import { db } from '../db/index.js';
import { canonicalSchemas } from '../db/schema/index.js';
import { eq, and, isNull, sql } from 'drizzle-orm';

function clampPagination(page?: string | number, limit?: string | number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export async function listCanonicalSchemas(page?: string, limit?: string) {
  const p = clampPagination(page, limit);

  const data = await db.select().from(canonicalSchemas)
    .where(isNull(canonicalSchemas.deletedAt))
    .limit(p.limit)
    .offset(p.offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(canonicalSchemas)
    .where(isNull(canonicalSchemas.deletedAt));

  return { data, pagination: { page: p.page, limit: p.limit, total: count } };
}

export async function getCanonicalSchema(schemaId: string) {
  const [schema] = await db.select().from(canonicalSchemas)
    .where(and(eq(canonicalSchemas.id, schemaId), isNull(canonicalSchemas.deletedAt)))
    .limit(1);

  if (!schema) {
    throw new Error('Canonical schema not found');
  }
  return schema;
}
