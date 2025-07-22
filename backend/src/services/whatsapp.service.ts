import twilio from 'twilio';

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio Sandbox number

// Send WhatsApp message
const sendWhatsAppMessage = async (to: string, message: string): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n' + '='.repeat(60));
    console.log(`📱 WhatsApp to ${to}:`);
    console.log(message);
    console.log('='.repeat(60) + '\n');
    return;
  }

  try {
    await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:+91${to.replace(/\D/g, '')}`, // Ensure Indian format
      body: message
    });
    console.log(`✅ WhatsApp sent to ${to}`);
  } catch (error) {
    console.error('WhatsApp send error:', error);
    throw new Error('Failed to send WhatsApp message');
  }
};

// Send booking confirmation with details
export const sendBookingConfirmation = async (
  phone: string,
  data: {
    cnNumber: string;
    consignorName: string;
    consigneeName: string;
    fromCity: string;
    toCity: string;
    packages: number;
    totalAmount: number;
    bookingDate: string;
  }
): Promise<void> => {
  const message = `🚛 *DesiCargo Booking Confirmed*

📋 *CN Number:* ${data.cnNumber}
📅 *Booking Date:* ${data.bookingDate}

👤 *From:* ${data.consignorName}
📍 *Origin:* ${data.fromCity}

👤 *To:* ${data.consigneeName}  
📍 *Destination:* ${data.toCity}

📦 *Packages:* ${data.packages}
💰 *Total Amount:* ₹${data.totalAmount}

🔗 *Track your shipment:*
https://app.desicargo.com/track/${data.cnNumber}

Need help? Reply to this message!
*DesiCargo - Digital Transport Solutions*`;

  await sendWhatsAppMessage(phone, message);
};

// Send delivery notification with tracking
export const sendDeliveryNotification = async (
  phone: string,
  data: {
    cnNumber: string;
    status: string;
    currentLocation: string;
    estimatedDelivery?: string;
    deliveryType: string;
  }
): Promise<void> => {
  const statusEmojis: { [key: string]: string } = {
    'booked': '📋',
    'picked': '📦',
    'in_transit': '🚛',
    'reached': '🏢',
    'out_for_delivery': '🚚',
    'delivered': '✅',
    'undelivered': '⚠️'
  };

  const emoji = statusEmojis[data.status] || '📍';
  
  let message = `${emoji} *Shipment Update - ${data.cnNumber}*

*Status:* ${data.status.toUpperCase().replace('_', ' ')}
*Current Location:* ${data.currentLocation}`;

  if (data.estimatedDelivery) {
    message += `\n*Estimated Delivery:* ${data.estimatedDelivery}`;
  }

  if (data.status === 'out_for_delivery') {
    message += `\n\n📞 *Delivery Person will call you shortly*
📍 *Delivery Type:* ${data.deliveryType === 'door' ? 'Door Delivery' : 'Godown Pickup'}`;
  }

  message += `\n\n🔗 *Live Tracking:*
https://app.desicargo.com/track/${data.cnNumber}

*DesiCargo - Real-time Updates*`;

  await sendWhatsAppMessage(phone, message);
};

// Send payment reminder
export const sendPaymentReminder = async (
  phone: string,
  data: {
    cnNumber: string;
    consigneeName: string;
    pendingAmount: number;
    dueDate: string;
    paymentLink?: string;
  }
): Promise<void> => {
  let message = `💳 *Payment Reminder - DesiCargo*

📋 *CN Number:* ${data.cnNumber}
👤 *Consignee:* ${data.consigneeName}
💰 *Pending Amount:* ₹${data.pendingAmount}
📅 *Due Date:* ${data.dueDate}

⚡ *Quick Pay Options:*`;

  if (data.paymentLink) {
    message += `\n🔗 Pay Online: ${data.paymentLink}`;
  }

  message += `
💰 UPI: desicargo@paytm
📱 Call: +91 98765 43210

*Pay now to avoid delivery delays!*
*DesiCargo Finance Team*`;

  await sendWhatsAppMessage(phone, message);
};

// Send document via WhatsApp (for LR, POD, Invoices)
export const sendDocument = async (
  phone: string,
  data: {
    cnNumber: string;
    documentType: 'LR' | 'POD' | 'Invoice';
    documentUrl: string;
    consigneeName: string;
  }
): Promise<void> => {
  const docTypes = {
    'LR': '📄 Loading Receipt',
    'POD': '📋 Proof of Delivery',
    'Invoice': '💰 Invoice'
  };

  const message = `📎 *${docTypes[data.documentType]} - ${data.cnNumber}*

👤 *Consignee:* ${data.consigneeName}

📥 *Download your ${data.documentType}:*
${data.documentUrl}

*Valid for 30 days*
*DesiCargo Document Center*`;

  await sendWhatsAppMessage(phone, message);
};

// Handle incoming WhatsApp messages (for chatbot)
export const processIncomingMessage = async (
  from: string,
  message: string
): Promise<string> => {
  const cleanMessage = message.toLowerCase().trim();

  // Check if it's a CN number (format: BRN2025000001)
  const cnPattern = /[a-z]{3}\d{10}/i;
  const cnMatch = cleanMessage.match(cnPattern);

  if (cnMatch) {
    const cnNumber = cnMatch[0].toUpperCase();
    try {
      // This would integrate with your tracking API
      const trackingUrl = `https://app.desicargo.com/track/${cnNumber}`;
      return `🔍 *Tracking ${cnNumber}*

🔗 *Live Tracking:* ${trackingUrl}

📱 For detailed status, click the link above or visit our app.

*DesiCargo AutoBot*`;
    } catch (error) {
      return `❌ *CN Number ${cnNumber} not found*

Please check the number and try again.
Format: BRN2025000001

Need help? Type *help*
*DesiCargo AutoBot*`;
    }
  }

  // Handle other queries
  if (cleanMessage.includes('help')) {
    return `🤖 *DesiCargo AutoBot - Help*

📋 *Available Commands:*
• Send your CN Number to track
• Type *rates* for pricing info
• Type *contact* for support details
• Type *offices* for branch locations

📱 *Or visit:* https://app.desicargo.com

*DesiCargo Support*`;
  }

  if (cleanMessage.includes('rates') || cleanMessage.includes('price')) {
    return `💰 *DesiCargo Freight Rates*

📋 *Standard Rates:*
• Local Delivery: ₹5/kg (Min ₹100)
• Inter-city: ₹8/kg (Min ₹150)
• Express: +25% charges

📞 *For exact quote:* +91 98765 43210
🌐 *Online Quote:* https://app.desicargo.com/quote

*Rates subject to change*
*DesiCargo Pricing*`;
  }

  if (cleanMessage.includes('contact') || cleanMessage.includes('support')) {
    return `📞 *DesiCargo Contact Details*

*Customer Support:*
📱 WhatsApp: +91 98765 43210
☎️ Call: 1800-DESI-CARGO
📧 Email: support@desicargo.com

*Business Hours:*
🕘 Mon-Sat: 9 AM to 7 PM
🕘 Sun: 10 AM to 5 PM

*Emergency Support:*
📱 +91 98765 43299 (24/7)

*DesiCargo Support Team*`;
  }

  if (cleanMessage.includes('office') || cleanMessage.includes('branch')) {
    return `🏢 *DesiCargo Branch Network*

📍 *Main Branches:*
• Mumbai: 400+ locations
• Delhi: 300+ locations  
• Bangalore: 200+ locations
• Chennai: 150+ locations

🔗 *Find nearest branch:*
https://app.desicargo.com/branches

📞 *Branch Contact:* +91 98765 43210

*DesiCargo Network*`;
  }

  // Default response
  return `🤖 *DesiCargo AutoBot*

I didn't understand that. Here's what I can help with:

📋 *Track Shipment:* Send your CN Number
💰 *Get Rates:* Type *rates*
📞 *Support:* Type *contact*  
🏢 *Branches:* Type *offices*
❓ *Help:* Type *help*

*Or visit:* https://app.desicargo.com

*DesiCargo Support*`;
};

export { sendWhatsAppMessage };