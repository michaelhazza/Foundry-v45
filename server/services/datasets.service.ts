import { db } from '../db/index.js';
import { datasets, projects } from '../db/schema/index.js';
import { eq, and, isNull, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

function clampPagination(page?: string | number, limit?: string | number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export async function listDatasets(organisationId: string, projectId: string, page?: string, limit?: string) {
  const p = clampPagination(page, limit);

  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const data = await db.select().from(datasets)
    .where(and(eq(datasets.projectId, projectId), isNull(datasets.deletedAt)))
    .limit(p.limit)
    .offset(p.offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(datasets)
    .where(and(eq(datasets.projectId, projectId), isNull(datasets.deletedAt)));

  return { data, pagination: { page: p.page, limit: p.limit, total: count } };
}

export async function getDataset(organisationId: string, projectId: string, datasetId: string) {
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const [dataset] = await db.select().from(datasets)
    .where(and(
      eq(datasets.id, datasetId),
      eq(datasets.projectId, projectId),
      isNull(datasets.deletedAt)
    ))
    .limit(1);

  if (!dataset) {
    throw new Error('Dataset not found');
  }
  return dataset;
}

export async function downloadDataset(organisationId: string, projectId: string, datasetId: string) {
  const dataset = await getDataset(organisationId, projectId, datasetId);

  if (!fs.existsSync(dataset.filePath)) {
    throw new Error('Dataset file not found');
  }

  return {
    filePath: dataset.filePath,
    name: dataset.name,
    format: dataset.format,
  };
}

export async function deleteDataset(organisationId: string, projectId: string, datasetId: string) {
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const [dataset] = await db.update(datasets)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(datasets.id, datasetId),
      eq(datasets.projectId, projectId),
      isNull(datasets.deletedAt)
    ))
    .returning();

  if (!dataset) {
    throw new Error('Dataset not found');
  }
  return { success: true };
}
