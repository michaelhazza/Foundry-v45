import { db } from '../db/index.js';
import { processingJobs, projects, projectSources, datasets } from '../db/schema/index.js';
import { eq, and, isNull, sql } from 'drizzle-orm';

function clampPagination(page?: string | number, limit?: string | number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export async function listProcessingJobs(organisationId: string, projectId: string, page?: string, limit?: string) {
  const p = clampPagination(page, limit);

  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const data = await db.select().from(processingJobs)
    .where(and(eq(processingJobs.projectId, projectId), isNull(processingJobs.deletedAt)))
    .limit(p.limit)
    .offset(p.offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(processingJobs)
    .where(and(eq(processingJobs.projectId, projectId), isNull(processingJobs.deletedAt)));

  return { data, pagination: { page: p.page, limit: p.limit, total: count } };
}

export async function getProcessingJob(organisationId: string, projectId: string, jobId: string) {
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const [job] = await db.select().from(processingJobs)
    .where(and(
      eq(processingJobs.id, jobId),
      eq(processingJobs.projectId, projectId),
      isNull(processingJobs.deletedAt)
    ))
    .limit(1);

  if (!job) {
    throw new Error('Processing job not found');
  }
  return job;
}

export async function createProcessingJob(organisationId: string, projectId: string, userId: string) {
  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  // Validate project has at least one linked source
  const linkedSources = await db.select().from(projectSources)
    .where(and(eq(projectSources.projectId, projectId), isNull(projectSources.deletedAt)));

  if (linkedSources.length === 0) {
    throw new Error('Project must have at least one linked source');
  }

  // Build config snapshot
  const configSnapshot = {
    deIdentificationConfig: project.deIdentificationConfig,
    deIdentificationConfigVersion: project.deIdentificationConfigVersion,
    filterConfig: project.filterConfig,
    filterConfigVersion: project.filterConfigVersion,
    canonicalSchemaId: project.canonicalSchemaId,
    sources: linkedSources.map(s => ({
      projectSourceId: s.id,
      sourceId: s.sourceId,
      mappingConfig: s.mappingConfig,
      mappingConfigVersion: s.mappingConfigVersion,
    })),
  };

  const [job] = await db.insert(processingJobs).values({
    projectId,
    status: 'queued',
    triggeredBy: 'user',
    configSnapshot,
    createdByUserId: userId,
  }).returning();

  return job;
}
