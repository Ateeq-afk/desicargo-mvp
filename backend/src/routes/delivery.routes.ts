import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createDeliveryRun,
  assignConsignments,
  updateDeliveryStatus,
  getDeliveryRunList,
  getDeliveryRunDetails,
  getActiveDeliveryRuns,
  verifyDeliveryOTP,
  getAvailableConsignments
} from '../controllers/delivery.controller';

const router = Router();

// Create new delivery run
router.post('/runs', authenticate, createDeliveryRun);

// Assign consignments to delivery run
router.post('/runs/:id/assign', authenticate, assignConsignments);

// Update delivery status for a consignment
router.put('/runs/:id/status', authenticate, updateDeliveryStatus);

// Get delivery run list with pagination
router.get('/runs', authenticate, getDeliveryRunList);

// Get delivery run details
router.get('/runs/:id', getDeliveryRunDetails);

// Get active delivery runs for today
router.get('/active', authenticate, getActiveDeliveryRuns);

// Verify OTP for delivery
router.post('/verify-otp', verifyDeliveryOTP);

// Get available consignments for delivery
router.get('/available', authenticate, getAvailableConsignments);

export default router;