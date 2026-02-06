import { db } from '../db/index.js';
import { projects, projectSources, processingJobs, datasets } from '../db/schema/index.js';
import { eq, and, isNull, sql } from 'drizzle-orm';

function clampPagination(page?: string | number, limit?: string | number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

const PROJECT_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['archived'],
  archived: ['active'],
};

export async function listProjects(organisationId: string, page?: string, limit?: string) {
  const p = clampPagination(page, limit);

  const data = await db.select().from(projects)
    .where(and(eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(p.limit)
    .offset(p.offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(projects)
    .where(and(eq(projects.organisationId, organisationId), isNull(projects.deletedAt)));

  return { data, pagination: { page: p.page, limit: p.limit, total: count } };
}

export async function getProject(organisationId: string, projectId: string) {
  const [project] = await db.select().from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organisationId, organisationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }
  return project;
}

export async function createProject(
  organisationId: string,
  userId: string,
  name: string,
  description: string | undefined,
  canonicalSchemaId: string
) {
  const [project] = await db.insert(projects).values({
    organisationId,
    canonicalSchemaId,
    name,
    description: description || null,
    status: 'draft',
    createdByUserId: userId,
  }).returning();

  return project;
}

export async function updateProject(
  organisationId: string,
  projectId: string,
  updates: {
    name?: string;
    description?: string;
    canonicalSchemaId?: string;
    deIdentificationConfig?: unknown;
    filterConfig?: unknown;
    status?: string;
  }
) {
  // Get current project for state transition validation
  const [current] = await db.select().from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organisationId, organisationId),
      isNull(projects.deletedAt)
    ))
    .limit(1);

  if (!current) {
    throw new Error('Project not found');
  }

  // Validate status transition
  if (updates.status && updates.status !== current.status) {
    const allowed = PROJECT_STATUS_TRANSITIONS[current.status] || [];
    if (!allowed.includes(updates.status)) {
      throw new Error(`Invalid status transition from ${current.status} to ${updates.status}`);
    }
  }

  const setValues: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.name !== undefined) setValues.name = updates.name;
  if (updates.description !== undefined) setValues.description = updates.description;
  if (updates.canonicalSchemaId !== undefined) setValues.canonicalSchemaId = updates.canonicalSchemaId;
  if (updates.status !== undefined) setValues.status = updates.status;

  if (updates.deIdentificationConfig !== undefined) {
    setValues.deIdentificationConfig = updates.deIdentificationConfig;
    setValues.deIdentificationConfigVersion = (current.deIdentificationConfigVersion || 0) + 1;
  }

  if (updates.filterConfig !== undefined) {
    setValues.filterConfig = updates.filterConfig;
    setValues.filterConfigVersion = (current.filterConfigVersion || 0) + 1;
  }

  const [project] = await db.update(projects)
    .set(setValues)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organisationId, organisationId),
      isNull(projects.deletedAt)
    ))
    .returning();

  return project;
}

export async function deleteProject(organisationId: string, projectId: string) {
  const [project] = await db.update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(projects.id, projectId),
      eq(projects.organisationId, organisationId),
      isNull(projects.deletedAt)
    ))
    .returning();

  if (!project) {
    throw new Error('Project not found');
  }

  // Cascade soft-delete to projectSources, processingJobs, datasets
  const now = new Date();
  await db.update(projectSources)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(projectSources.projectId, projectId), isNull(projectSources.deletedAt)));

  await db.update(processingJobs)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(processingJobs.projectId, projectId), isNull(processingJobs.deletedAt)));

  await db.update(datasets)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(datasets.projectId, projectId), isNull(datasets.deletedAt)));

  return { success: true };
}
