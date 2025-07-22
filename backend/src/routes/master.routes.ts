import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Routes will be implemented
router.get('/', authenticate, (req, res) => {
  res.json({ message: 'Master routes endpoint' });
});

export default router;