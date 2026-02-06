import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateProjectAccess } from '../middleware/validateProjectAccess.js';
import * as datasetsService from '../services/datasets.service.js';

const router = Router();

router.get('/api/projects/:projectId/datasets', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const result = await datasetsService.listDatasets(
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

router.get('/api/projects/:projectId/datasets/:datasetId', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const dataset = await datasetsService.getDataset(
      req.user!.organisationId,
      req.params.projectId,
      req.params.datasetId
    );
    res.json(dataset);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/api/projects/:projectId/datasets/:datasetId/download', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const { filePath, name, format } = await datasetsService.downloadDataset(
      req.user!.organisationId,
      req.params.projectId,
      req.params.datasetId
    );

    const mimeMap: Record<string, string> = {
      conversationalJsonl: 'application/jsonl',
      qaPairsJson: 'application/json',
      rawStructuredJson: 'application/json',
    };

    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Content-Type', mimeMap[format] || 'application/octet-stream');
    res.sendFile(filePath, { root: process.cwd() });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete('/api/projects/:projectId/datasets/:datasetId', authenticate, validateProjectAccess, async (req, res) => {
  try {
    const result = await datasetsService.deleteDataset(
      req.user!.organisationId,
      req.params.projectId,
      req.params.datasetId
    );
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
