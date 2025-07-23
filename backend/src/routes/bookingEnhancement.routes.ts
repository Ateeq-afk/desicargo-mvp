import { Router } from 'express';
import { BookingEnhancementController } from '../controllers/bookingEnhancement.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Booking validation endpoints
router.get('/check-duplicate', BookingEnhancementController.checkDuplicate);
router.get('/minimum-charge', BookingEnhancementController.getMinimumCharge);

// Customer endpoints
router.get('/customer/:customerId/history', BookingEnhancementController.getCustomerHistory);
router.get('/customer/:customerId/preferences', BookingEnhancementController.getCustomerPreferences);
router.post('/customer/:customerId/preferences', BookingEnhancementController.updatePreferences);
router.get('/customer/:customerId/credit-status', BookingEnhancementController.getCreditStatus);

// Draft endpoints
router.post('/drafts', BookingEnhancementController.saveDraft);
router.get('/drafts/latest', BookingEnhancementController.loadDraft);

// Finance endpoints
router.get('/finance-summary', BookingEnhancementController.getFinanceSummary);

// Notification endpoints
router.post('/email-lr', BookingEnhancementController.emailLR);

export default router;