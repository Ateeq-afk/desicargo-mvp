import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import {
  generateInvoice,
  getInvoiceDetails,
  recordPayment,
  getOutstandingReport,
  getInvoiceList,
  getCustomerInvoices,
  getDailyCollection,
  cancelInvoice,
  generateCustomerStatement,
  sendPaymentReminders,
  getCustomersForBilling,
  checkCustomerCreditLimit
} from '../controllers/billing.controller';

const router = Router();

// Get customers for billing selection
router.get('/customers', authenticate, requireTenant, getCustomersForBilling);

// Check customer credit limit
router.get('/customers/:customer_id/credit-check', authenticate, requireTenant, checkCustomerCreditLimit);

// Generate new invoice
router.post('/generate', authenticate, requireTenant, generateInvoice);

// Get invoice list with filters
router.get('/', authenticate, requireTenant, getInvoiceList);

// Get invoice details
router.get('/:id', getInvoiceDetails);

// Record payment for invoice
router.post('/:id/payment', authenticate, requireTenant, recordPayment);

// Cancel invoice
router.post('/:id/cancel', authenticate, requireTenant, cancelInvoice);

// Get outstanding report
router.get('/outstanding', authenticate, requireTenant, getOutstandingReport);

// Get daily collection report  
router.get('/daily-collection', authenticate, requireTenant, getDailyCollection);

// Get customer's invoices
router.get('/customer/:id', getCustomerInvoices);

// Generate customer statement
router.get('/customer/:id/statement', generateCustomerStatement);

// Send payment reminders via WhatsApp
router.post('/reminders/whatsapp', authenticate, requireTenant, sendPaymentReminders);

export default router;