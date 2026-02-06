import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validateBody.js';
import * as authService from '../services/auth.service.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  organisationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/api/auth/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { email, password, name, organisationName } = req.body;
    const result = await authService.register(email, password, name, organisationName);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'Email already in use') {
      res.status(409).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

router.post('/api/auth/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

export default router;
