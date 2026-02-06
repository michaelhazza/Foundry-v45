import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { projects } from '../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';

export async function validateProjectAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const projectId = req.params.projectId;
  const organisationId = req.user?.organisationId;

  if (!projectId || !organisationId) {
    res.status(400).json({ error: 'Project ID and authentication required' });
    return;
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organisationId, organisationId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  next();
}
