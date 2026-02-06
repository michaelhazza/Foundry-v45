import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import { multerUpload } from '../middleware/upload.js';
import * as sourcesService from '../services/sources.service.js';

const router = Router();

const uploadSourceSchema = z.object({
  name: z.string().min(1),
});

router.get('/api/sources', authenticate, async (req, res) => {
  try {
    const result = await sourcesService.listSources(
      req.user!.organisationId,
      req.query.page as string,
      req.query.limit as string
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/sources/upload', authenticate, multerUpload, validateBody(uploadSourceSchema), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }
    const source = await sourcesService.uploadSource(
      req.user!.organisationId,
      req.user!.id,
      req.file,
      req.body.name
    );
    res.status(201).json(source);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/api/sources/:sourceId', authenticate, async (req, res) => {
  try {
    const source = await sourcesService.getSource(req.user!.organisationId, req.params.sourceId);
    res.json(source);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete('/api/sources/:sourceId', authenticate, async (req, res) => {
  try {
    const result = await sourcesService.deleteSource(req.user!.organisationId, req.params.sourceId);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
