import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import * as organisationsService from '../services/organisations.service.js';

const router = Router();

const updateOrgSchema = z.object({
  name: z.string().min(1),
});

router.get('/api/organisation', authenticate, async (req, res) => {
  try {
    const org = await organisationsService.getOrganisation(req.user!.organisationId);
    res.json(org);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.patch('/api/organisation', authenticate, requireRole('admin'), validateBody(updateOrgSchema), async (req, res) => {
  try {
    const org = await organisationsService.updateOrganisation(req.user!.organisationId, req.body.name);
    res.json(org);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
