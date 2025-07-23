import { Router } from 'express';
import { RateController } from '../controllers/rate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

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
router.get('/customer/:customer_id/rates', RateController.getCustomerRatesWithFallback);
router.post('/customer', RateController.createCustomerRate);
router.post('/customer/calculate', RateController.calculateFreightForCustomer);

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