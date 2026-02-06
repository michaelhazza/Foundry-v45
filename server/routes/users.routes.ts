import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';
import * as usersService from '../services/users.service.js';

const router = Router();

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
});

const updateUserSchema = z.object({
  role: z.enum(['admin', 'member']),
});

router.get('/api/users', authenticate, async (req, res) => {
  try {
    const result = await usersService.listUsers(
      req.user!.organisationId,
      req.query.page as string,
      req.query.limit as string
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/users', authenticate, requireRole('admin'), validateBody(inviteUserSchema), async (req, res) => {
  try {
    const user = await usersService.inviteUser(req.user!.organisationId, req.body.email, req.body.role);
    res.status(201).json(user);
  } catch (err: any) {
    if (err.message === 'Email already in use') {
      res.status(409).json({ error: err.message });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

router.get('/api/users/:userId', authenticate, async (req, res) => {
  try {
    const user = await usersService.getUser(req.user!.organisationId, req.params.userId);
    res.json(user);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.patch('/api/users/:userId', authenticate, requireRole('admin'), validateBody(updateUserSchema), async (req, res) => {
  try {
    const user = await usersService.updateUser(req.user!.organisationId, req.params.userId, req.body.role);
    res.json(user);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete('/api/users/:userId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete yourself' });
      return;
    }
    const result = await usersService.deleteUser(req.user!.organisationId, req.params.userId);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
