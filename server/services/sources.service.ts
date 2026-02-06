import { db } from '../db/index.js';
import { sources, projectSources } from '../db/schema/index.js';
import { eq, and, isNull, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

function clampPagination(page?: string | number, limit?: string | number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export async function listSources(organisationId: string, page?: string, limit?: string) {
  const p = clampPagination(page, limit);

  const data = await db.select().from(sources)
    .where(and(eq(sources.organisationId, organisationId), isNull(sources.deletedAt)))
    .limit(p.limit)
    .offset(p.offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(sources)
    .where(and(eq(sources.organisationId, organisationId), isNull(sources.deletedAt)));

  return { data, pagination: { page: p.page, limit: p.limit, total: count } };
}

export async function getSource(organisationId: string, sourceId: string) {
  const [source] = await db.select().from(sources)
    .where(and(
      eq(sources.id, sourceId),
      eq(sources.organisationId, organisationId),
      isNull(sources.deletedAt)
    ))
    .limit(1);

  if (!source) {
    throw new Error('Source not found');
  }
  return source;
}

export async function uploadSource(
  organisationId: string,
  userId: string,
  file: Express.Multer.File,
  name: string
) {
  // Detect columns from the file (simplified detection)
  let detectedColumns: string[] = [];
  try {
    if (file.mimetype === 'text/csv') {
      const content = fs.readFileSync(file.path, 'utf-8');
      const firstLine = content.split('\n')[0];
      if (firstLine) {
        detectedColumns = firstLine.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      }
    } else if (file.mimetype === 'application/json') {
      const content = fs.readFileSync(file.path, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        detectedColumns = Object.keys(parsed[0]);
      } else if (typeof parsed === 'object' && parsed !== null) {
        detectedColumns = Object.keys(parsed);
      }
    }
  } catch {
    // Column detection failure is non-fatal
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const [source] = await db.insert(sources).values({
    organisationId,
    name,
    sourceType: 'fileUpload',
    status: 'ready',
    originalFilename: file.originalname,
    filePath: file.path,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    detectedColumns,
    expiresAt,
    createdByUserId: userId,
  }).returning();

  return source;
}

export async function deleteSource(organisationId: string, sourceId: string) {
  const [source] = await db.update(sources)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(sources.id, sourceId),
      eq(sources.organisationId, organisationId),
      isNull(sources.deletedAt)
    ))
    .returning();

  if (!source) {
    throw new Error('Source not found');
  }

  // Cascade soft-delete to projectSources linked to this source
  const now = new Date();
  await db.update(projectSources)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(projectSources.sourceId, sourceId), isNull(projectSources.deletedAt)));

  return { success: true };
}
