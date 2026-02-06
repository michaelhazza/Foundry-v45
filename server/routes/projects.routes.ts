import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { validateProjectAccess } from '../middleware/validateProjectAccess.js';
import * as projectsService from '../services/projects.service.js';

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  canonicalSchemaId: z.string().uuid(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  canonicalSchemaId: z.string().uuid().optional(),
  deIdentificationConfig: z.unknown().optional(),
  filterConfig: z.unknown().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

router.get('/api/projects', authenticate, async (req, res) => {
  try {
    const result = await projectsService.listProjects(
      req.user!.organisationId,
      req.query.page as string,
      req.query.limit as string
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/projects', authenticate, validateBody(createProjectSchema), async (req, res) => {
  try {
    const project = await projectsService.createProject(
      req.user!.organisationId,
      req.user!.id,
      req.body.name,
      req.body.description,
      req.body.canonicalSchemaId
    );
    res.status(201).json(project);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/api/projects/:projectId', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const project = await projectsService.getProject(req.user!.organisationId, req.params.projectId);
    res.json(project);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.patch('/api/projects/:projectId', authenticate, validateProjectAccess, validateBody(updateProjectSchema), async (req, res) => {
  try {
    const project = await projectsService.updateProject(req.user!.organisationId, req.params.projectId, req.body);
    res.json(project);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/api/projects/:projectId', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const result = await projectsService.deleteProject(req.user!.organisationId, req.params.projectId);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
