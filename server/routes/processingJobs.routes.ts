import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateProjectAccess } from '../middleware/validateProjectAccess.js';
import * as processingJobsService from '../services/processingJobs.service.js';

const router = Router();

router.get('/api/projects/:projectId/processing-jobs', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const result = await processingJobsService.listProcessingJobs(
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

router.post('/api/projects/:projectId/processing-jobs', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const job = await processingJobsService.createProcessingJob(
      req.user!.organisationId,
      req.params.projectId,
      req.user!.id
    );
    res.status(201).json(job);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/api/projects/:projectId/processing-jobs/:jobId', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const job = await processingJobsService.getProcessingJob(
      req.user!.organisationId,
      req.params.projectId,
      req.params.jobId
    );
    res.json(job);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
