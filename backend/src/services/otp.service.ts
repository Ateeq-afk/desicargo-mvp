import axios from 'axios';

export const sendOTP = async (phone: string, otp: string): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    // In development, log OTP prominently
    console.log('\n' + '='.repeat(50));
    console.log(`🔐 OTP for ${phone}: ${otp}`);
    console.log('Valid for 10 minutes');
    console.log('='.repeat(50) + '\n');
    return;
  }

  // In production, integrate with actual SMS service
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    console.error('SMS_API_KEY not configured. OTP:', otp);
    return;
  }

  const sender = process.env.SMS_SENDER || 'DSCRGO';
  const message = `Your DesiCargo verification code is: ${otp}. Valid for 10 minutes.`;
  
  try {
    // Example TextLocal integration
    await axios.post('https://api.textlocal.in/send/', {
      apikey: apiKey,
      numbers: phone,
      sender: sender,
      message: message
    });
    console.log(`✅ OTP sent to ${phone}`);
  } catch (error) {
    console.error('SMS send error:', error);
    throw new Error('Failed to send SMS');
  }
};

export const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
  // This is handled in the controller by checking the database
  // This function is here for future enhancement if needed
  return true;
};