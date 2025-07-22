import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  verifyWebhook,
  handleIncomingMessage,
  sendManualMessage,
  getChatbotAnalytics
} from '../controllers/whatsapp.controller';

const router = Router();

// Webhook verification (GET) and message handling (POST)
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleIncomingMessage);

// Send manual WhatsApp message (for testing/admin)
router.post('/send', authenticate, sendManualMessage);

// Get chatbot analytics
router.get('/analytics', authenticate, getChatbotAnalytics);

export default router;