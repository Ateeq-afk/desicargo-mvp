import { Router } from 'express';
import { RateController } from '../controllers/rate.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Rate master routes
router.get('/', RateController.getRates);
router.get('/route', RateController.getRateByRoute);
router.get('/route/all', RateController.getRatesForRoute);
router.get('/route/comparison', RateController.getRateComparison);
router.post('/', RateController.createRate);
router.put('/:id', RateController.updateRate);
router.delete('/:id', RateController.deleteRate);

// Customer rate routes
router.get('/customer/:customer_id', RateController.getCustomerRates);
router.post('/customer', RateController.createCustomerRate);

// Rate calculation and history
router.post('/calculate', RateController.calculateRates);
router.post('/history', RateController.saveRateHistory);
router.get('/history/:consignment_id', RateController.getRateHistory);

// Bulk operations
router.post('/bulk-upload', RateController.bulkUploadRates);
router.post('/copy', RateController.copyRate);

// Approval workflow
router.get('/approvals/pending', RateController.getPendingApprovals);
router.put('/approvals/:id', RateController.updateApprovalStatus);

export default router;