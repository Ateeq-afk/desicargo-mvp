import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Dashboard routes will be implemented
router.get('/stats', authenticate, (req, res) => {
  res.json({ success: true, message: 'Dashboard stats endpoint' });
});

router.get('/recent-bookings', authenticate, (req, res) => {
  res.json({ success: true, message: 'Recent bookings endpoint' });
});

router.get('/branch-summary', authenticate, (req, res) => {
  res.json({ success: true, message: 'Branch summary endpoint' });
});

export default router;