import nodemailer from 'nodemailer';

// Create transporter (in production, use actual email service)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendWelcomeEmail = async (
  email: string,
  data: {
    companyName: string;
    username: string;
    trialDays: number;
  }
): Promise<void> => {
  const mailOptions = {
    from: '"DesiCargo" <noreply@desicargo.com>',
    to: email,
    subject: 'Welcome to DesiCargo - Your Digital Transport Management Journey Begins!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature { margin: 15px 0; padding-left: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to DesiCargo!</h1>
            <p>Your Transport Business, Now Digital</p>
          </div>
          <div class="content">
            <h2>Hello ${data.companyName}! 👋</h2>
            
            <p>Congratulations on taking the first step towards digitalizing your logistics business. Your DesiCargo account has been created successfully!</p>
            
            <p><strong>Your Login Details:</strong></p>
            <p>Username: <strong>${data.username}</strong><br/>
            URL: <a href="https://app.desicargo.com">app.desicargo.com</a></p>
            
            <p><strong>Your ${data.trialDays}-Day Free Trial Includes:</strong></p>
            <div class="feature">✅ 100 consignments per month</div>
            <div class="feature">✅ 2 user accounts</div>
            <div class="feature">✅ Real-time tracking</div>
            <div class="feature">✅ Auto LR generation</div>
            <div class="feature">✅ Basic reports</div>
            
            <center>
              <a href="https://app.desicargo.com" class="button">Start Using DesiCargo</a>
            </center>
            
            <p><strong>What's Next?</strong></p>
            <ol>
              <li>Add your vehicles and regular customers</li>
              <li>Create your first booking</li>
              <li>Generate and print LR instantly</li>
              <li>Track your consignments in real-time</li>
            </ol>
            
            <p><strong>Need Help?</strong></p>
            <p>📱 WhatsApp: +91 98765 43210<br/>
            📧 Email: support@desicargo.com<br/>
            📺 Video Tutorials: <a href="https://desicargo.com/tutorials">Watch Here</a></p>
          </div>
          <div class="footer">
            <p>© 2024 DesiCargo. Built for Indian Transporters.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    // In development, just log the email
    if (process.env.NODE_ENV === 'development') {
      console.log('[Email Service] Would send welcome email to:', email);
      console.log('[Email Service] Company:', data.companyName);
      return;
    }

    // In production, actually send the email
    await transporter.sendMail(mailOptions);
    console.log('[Email Service] Welcome email sent to:', email);
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
    // Don't throw error to not block signup process
  }
};

export const sendTrialExpiryReminder = async (
  email: string,
  data: {
    companyName: string;
    daysRemaining: number;
  }
): Promise<void> => {
  const mailOptions = {
    from: '"DesiCargo" <noreply@desicargo.com>',
    to: email,
    subject: `Your DesiCargo trial expires in ${data.daysRemaining} days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${data.companyName},</h2>
        <p>Your free trial expires in <strong>${data.daysRemaining} days</strong>.</p>
        <p>Don't lose access to your data! Upgrade now and get:</p>
        <ul>
          <li>50% OFF on your first 3 months</li>
          <li>Unlimited consignments</li>
          <li>Multiple branches</li>
          <li>API access</li>
          <li>Priority support</li>
        </ul>
        <p><a href="https://app.desicargo.com/upgrade" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade Now</a></p>
      </div>
    `
  };

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Email Service] Trial expiry reminder to:', email);
      return;
    }
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Email Service] Error sending reminder:', error);
  }
};