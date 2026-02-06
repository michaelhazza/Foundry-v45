import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { validateProjectAccess } from '../middleware/validateProjectAccess.js';
import * as projectSourcesService from '../services/projectSources.service.js';

const router = Router();

const linkSourceSchema = z.object({
  sourceId: z.string().uuid(),
  mappingConfig: z.record(z.unknown()),
});

const updateProjectSourceSchema = z.object({
  mappingConfig: z.record(z.unknown()).optional(),
  filterRules: z.record(z.unknown()).optional(),
});

router.get('/api/projects/:projectId/sources', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const result = await projectSourcesService.listProjectSources(
      req.user!.organisationId,
      req.params.projectId,
      req.query.page as string,
      req.query.limit as string
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/projects/:projectId/sources', authenticate, validateProjectAccess, validateBody(linkSourceSchema), async (req, res) => {
  try {
    const ps = await projectSourcesService.linkSourceToProject(
      req.user!.organisationId,
      req.params.projectId,
      req.user!.id,
      req.body.sourceId,
      req.body.mappingConfig
    );
    res.status(201).json(ps);
  } catch (err: any) {
    if (err.message === 'Source is already linked to this project') {
      res.status(409).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

router.get('/api/projects/:projectId/sources/:projectSourceId', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const ps = await projectSourcesService.getProjectSource(
      req.user!.organisationId,
      req.params.projectId,
      req.params.projectSourceId
    );
    res.json(ps);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.patch('/api/projects/:projectId/sources/:projectSourceId', authenticate, validateProjectAccess, validateBody(updateProjectSourceSchema), async (req, res) => {
  try {
    const ps = await projectSourcesService.updateProjectSource(
      req.user!.organisationId,
      req.params.projectId,
      req.params.projectSourceId,
      req.body
    );
    res.json(ps);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/api/projects/:projectId/sources/:projectSourceId', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const result = await projectSourcesService.unlinkSource(
      req.user!.organisationId,
      req.params.projectId,
      req.params.projectSourceId
    );
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
