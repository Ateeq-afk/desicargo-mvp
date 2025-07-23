import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import {
  getDashboardStats,
  getRecentBookings,
  getBranchSummary,
  getRevenueChart,
  getTopCustomers,
  getCustomerGrowth
} from '../controllers/dashboard.controller';

const router = Router();

// Dashboard statistics
router.get('/stats', authenticate, requireTenant, getDashboardStats);

// Recent bookings with optional limit
router.get('/recent-bookings', authenticate, requireTenant, getRecentBookings);

// Branch-wise summary (admin only)
router.get('/branch-summary', authenticate, requireTenant, getBranchSummary);

// Revenue chart data (last 7 days)
router.get('/revenue-chart', authenticate, requireTenant, getRevenueChart);

// Customer analytics
router.get('/top-customers', authenticate, requireTenant, getTopCustomers);
router.get('/customer-growth', authenticate, requireTenant, getCustomerGrowth);

export default router;