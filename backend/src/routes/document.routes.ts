import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  shareConsignmentDocuments,
  shareInvoiceDocument,
  downloadDocument
} from '../controllers/document.controller';

const router = Router();

// Share consignment documents via WhatsApp (LR, POD)
router.post('/consignment/:consignmentId/share', authenticate, shareConsignmentDocuments);

// Share invoice via WhatsApp
router.post('/invoice/:invoiceId/share', authenticate, shareInvoiceDocument);

// Download document with token verification (public endpoint)
router.get('/:type/:id', downloadDocument);

export default router;