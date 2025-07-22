import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
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
  sendPaymentReminders
} from '../controllers/billing.controller';

const router = Router();

// Generate new invoice
router.post('/generate', authenticate, generateInvoice);

// Get invoice list with filters
router.get('/', authenticate, getInvoiceList);

// Get invoice details
router.get('/:id', getInvoiceDetails);

// Record payment for invoice
router.post('/:id/payment', authenticate, recordPayment);

// Cancel invoice
router.post('/:id/cancel', authenticate, cancelInvoice);

// Get outstanding report
router.get('/outstanding', authenticate, getOutstandingReport);

// Get daily collection report  
router.get('/daily-collection', authenticate, getDailyCollection);

// Get customer's invoices
router.get('/customer/:id', getCustomerInvoices);

// Generate customer statement
router.get('/customer/:id/statement', generateCustomerStatement);

// Send payment reminders via WhatsApp
router.post('/reminders/whatsapp', authenticate, sendPaymentReminders);

export default router;