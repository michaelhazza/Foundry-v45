import { db } from '../db/index.js';
import { projectSources, projects } from '../db/schema/index.js';
import { eq, and, isNull, sql } from 'drizzle-orm';

function clampPagination(page?: string | number, limit?: string | number) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

export async function listProjectSources(organisationId: string, projectId: string, page?: string, limit?: string) {
  const p = clampPagination(page, limit);

  // Verify project belongs to organisation (tenant isolation)
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const data = await db.select().from(projectSources)
    .where(and(eq(projectSources.projectId, projectId), isNull(projectSources.deletedAt)))
    .limit(p.limit)
    .offset(p.offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(projectSources)
    .where(and(eq(projectSources.projectId, projectId), isNull(projectSources.deletedAt)));

  return { data, pagination: { page: p.page, limit: p.limit, total: count } };
}

export async function getProjectSource(organisationId: string, projectId: string, projectSourceId: string) {
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const [ps] = await db.select().from(projectSources)
    .where(and(
      eq(projectSources.id, projectSourceId),
      eq(projectSources.projectId, projectId),
      isNull(projectSources.deletedAt)
    ))
    .limit(1);

  if (!ps) {
    throw new Error('Project source not found');
  }
  return ps;
}

export async function linkSourceToProject(
  organisationId: string,
  projectId: string,
  userId: string,
  sourceId: string,
  mappingConfig: unknown
) {
  // Verify project belongs to organisation
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  // Check for duplicate active link
  const existing = await db.select({ id: projectSources.id }).from(projectSources)
    .where(and(
      eq(projectSources.projectId, projectId),
      eq(projectSources.sourceId, sourceId),
      isNull(projectSources.deletedAt)
    ))
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Source is already linked to this project');
  }

  const [ps] = await db.insert(projectSources).values({
    projectId,
    sourceId,
    mappingConfig: mappingConfig as object,
    mappingConfigVersion: 1,
    createdByUserId: userId,
  }).returning();

  return ps;
}

export async function updateProjectSource(
  organisationId: string,
  projectId: string,
  projectSourceId: string,
  updates: { mappingConfig?: unknown; filterRules?: unknown }
) {
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  // Get current for version bumping
  const [current] = await db.select().from(projectSources)
    .where(and(
      eq(projectSources.id, projectSourceId),
      eq(projectSources.projectId, projectId),
      isNull(projectSources.deletedAt)
    ))
    .limit(1);

  if (!current) {
    throw new Error('Project source not found');
  }

  const setValues: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.mappingConfig !== undefined) {
    setValues.mappingConfig = updates.mappingConfig;
    setValues.mappingConfigVersion = current.mappingConfigVersion + 1;
  }

  if (updates.filterRules !== undefined) {
    setValues.filterRules = updates.filterRules;
    setValues.filterRulesVersion = (current.filterRulesVersion || 0) + 1;
  }

  const [ps] = await db.update(projectSources)
    .set(setValues)
    .where(and(
      eq(projectSources.id, projectSourceId),
      eq(projectSources.projectId, projectId),
      isNull(projectSources.deletedAt)
    ))
    .returning();

  return ps;
}

export async function unlinkSource(organisationId: string, projectId: string, projectSourceId: string) {
  const [project] = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organisationId, organisationId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) {
    throw new Error('Project not found');
  }

  const [ps] = await db.update(projectSources)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(projectSources.id, projectSourceId),
      eq(projectSources.projectId, projectId),
      isNull(projectSources.deletedAt)
    ))
    .returning();

  if (!ps) {
    throw new Error('Project source not found');
  }
  return { success: true };
}
