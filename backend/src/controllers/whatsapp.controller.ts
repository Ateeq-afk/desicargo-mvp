import { Request, Response } from 'express';
import { processIncomingMessage, sendWhatsAppMessage } from '../services/whatsapp.service';

// Webhook verification (required by Twilio)
export const verifyWebhook = (req: Request, res: Response): void => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'desicargo-webhook-verify';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified');
      res.status(200).send(challenge);
      return;
    } else {
      res.status(403).send('Forbidden');
      return;
    }
  }
  
  res.status(400).send('Bad Request');
};

// Handle incoming WhatsApp messages
export const handleIncomingMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { From, Body, MessageSid } = req.body;
    
    if (!From || !Body) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
      return;
    }

    console.log(`📱 WhatsApp message from ${From}: ${Body}`);

    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = From.replace('whatsapp:', '').replace('+', '');
    
    // Process the message and get response
    const botResponse = await processIncomingMessage(phoneNumber, Body);
    
    // Send the response back
    await sendWhatsAppMessage(phoneNumber, botResponse);
    
    // Log the interaction for analytics
    console.log(`🤖 Bot response sent to ${phoneNumber}`);
    
    res.status(200).json({
      success: true,
      message: 'Message processed',
      messageSid: MessageSid
    });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process message'
    });
  }
};

// Send manual WhatsApp message (for testing/admin use)
export const sendManualMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      res.status(400).json({
        success: false,
        error: 'Phone and message are required'
      });
      return;
    }

    await sendWhatsAppMessage(phone, message);
    
    res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      sentTo: phone
    });
  } catch (error) {
    console.error('Manual WhatsApp message error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message'
    });
  }
};

// Get WhatsApp chatbot analytics
export const getChatbotAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from_date, to_date } = req.query;
    
    // This would fetch analytics from your database
    // For now, returning mock data
    const analytics = {
      total_messages: 150,
      unique_users: 85,
      tracking_queries: 120,
      help_requests: 25,
      rate_inquiries: 15,
      contact_requests: 10,
      date_range: {
        from: from_date || 'last_30_days',
        to: to_date || 'today'
      },
      popular_queries: [
        { query: 'Track CN', count: 120 },
        { query: 'Help', count: 25 },
        { query: 'Rates', count: 15 },
        { query: 'Contact', count: 10 },
        { query: 'Offices', count: 8 }
      ],
      hourly_distribution: [
        { hour: 9, count: 12 },
        { hour: 10, count: 18 },
        { hour: 11, count: 22 },
        { hour: 14, count: 25 },
        { hour: 15, count: 20 },
        { hour: 16, count: 15 }
      ]
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('WhatsApp analytics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics'
    });
  }
};