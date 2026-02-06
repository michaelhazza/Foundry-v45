import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { projects } from '../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function validateProjectAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const projectId = req.params.projectId;
  const organisationId = req.user?.organisationId;

  if (!projectId || !organisationId) {
    res.status(400).json({ error: 'Project ID and authentication required' });
    return;
  }

  if (!UUID_REGEX.test(projectId)) {
    res.status(400).json({ error: 'Invalid project ID format' });
    return;
  }

  try {
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
  } catch (err) {
    res.status(400).json({ error: 'Invalid project ID' });
  }
}
