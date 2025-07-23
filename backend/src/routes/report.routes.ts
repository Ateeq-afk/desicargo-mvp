import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// Routes will be implemented
router.get('/', authenticate, requireTenant, (req, res) => {
  res.json({ message: 'Report routes endpoint' });
});

export default router;