import { Router } from 'express';
import * as healthService from '../services/health.service.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const result = await healthService.getHealthStatus();
  const statusCode = result.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(result);
});

export default router;
