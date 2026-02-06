import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as canonicalSchemasService from '../services/canonicalSchemas.service.js';

const router = Router();

router.get('/api/canonical-schemas', authenticate, async (req, res) => {
  try {
    const result = await canonicalSchemasService.listCanonicalSchemas(
      req.query.page as string,
      req.query.limit as string
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/canonical-schemas/:schemaId', authenticate, async (req, res) => {
  try {
    const schema = await canonicalSchemasService.getCanonicalSchema(req.params.schemaId);
    res.json(schema);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
