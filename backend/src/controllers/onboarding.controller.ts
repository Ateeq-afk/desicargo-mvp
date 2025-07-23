import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { generateToken, generateRefreshToken } from '../utils/jwt.utils';
import { sendOTP, verifyOTP } from '../services/otp.service';
import { sendWelcomeEmail } from '../services/email.service';

export const sendSignupOTP = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { phone, email } = req.body;

    // Check if company already exists
    const existingCompany = await query(
      'SELECT id FROM companies WHERE phone = $1 OR email = $2',
      [phone, email]
    );

    if (existingCompany.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Company with this phone or email already exists'
      });
    }

    // Generate and send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(
      `INSERT INTO otp_verifications (phone, email, otp, purpose, expires_at)
       VALUES ($1, $2, $3, 'signup', $4)`,
      [phone, email, otp, expiresAt]
    );

    // Send OTP via SMS (implement actual SMS service)
    await sendOTP(phone, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // Include OTP in response for development/testing only
      ...(process.env.NODE_ENV === 'development' && { otp: otp })
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

export const verifySignupOTP = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { phone, otp } = req.body;

    // Allow universal development OTP
    if (process.env.NODE_ENV === 'development' && otp === '123456') {
      res.json({
        success: true,
        message: 'OTP verified successfully (dev mode)'
      });
      return;
    }

    const result = await query(
      `SELECT * FROM otp_verifications 
       WHERE phone = $1 AND otp = $2 AND purpose = 'signup' 
       AND expires_at > NOW() AND is_verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [phone, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as verified
    await query(
      'UPDATE otp_verifications SET is_verified = true WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};

export const createCompanyWithTrial = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      companyName,
      ownerName,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      gstin,
      businessType,
      fleetSize,
      servicesOffered,
      firstBranch,
      adminUser
    } = req.body;

    // Verify OTP was completed (skip in development mode)
    if (process.env.NODE_ENV !== 'development') {
      const otpCheck = await query(
        `SELECT * FROM otp_verifications 
         WHERE phone = $1 AND purpose = 'signup' AND is_verified = true
         ORDER BY created_at DESC LIMIT 1`,
        [phone]
      );

      if (otpCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please verify your phone number first'
        });
      }
    }

    // Start transaction
    await query('BEGIN');

    try {
      // 1. Create company with 30-day trial
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const companyResult = await query(
        `INSERT INTO companies (
          name, gstin, address, city, state, pincode, phone, email,
          owner_name, business_type, fleet_size, services_offered,
          subscription_plan, trial_ends_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'trial', $13, true)
        RETURNING *`,
        [
          companyName, gstin, address, city, state, pincode, phone, email,
          ownerName, businessType, fleetSize, servicesOffered,
          trialEndsAt
        ]
      );

      const company = companyResult.rows[0];

      // 2. Create first branch
      const branchResult = await query(
        `INSERT INTO branches (
          company_id, branch_code, name, address, city, state, pincode,
          phone, is_head_office, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true)
        RETURNING *`,
        [
          company.id,
          firstBranch.branchCode,
          firstBranch.branchName,
          firstBranch.sameAsHead ? address : firstBranch.address,
          firstBranch.sameAsHead ? city : firstBranch.city,
          firstBranch.sameAsHead ? state : firstBranch.state,
          firstBranch.sameAsHead ? pincode : firstBranch.pincode,
          firstBranch.phone || phone
        ]
      );

      const branch = branchResult.rows[0];

      // 3. Create admin user
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      
      const userResult = await query(
        `INSERT INTO users (
          company_id, branch_id, username, password_hash,
          full_name, role, phone, email, is_active
        ) VALUES ($1, $2, $3, $4, $5, 'admin', $6, $7, true)
        RETURNING id, username, full_name, role, phone, email`,
        [
          company.id,
          branch.id,
          adminUser.username,
          hashedPassword,
          ownerName,
          phone,
          email
        ]
      );

      const user = userResult.rows[0];

      // 4. Create default data
      await createDefaultData(company.id, branch.id);

      // 5. Track onboarding event
      await query(
        `INSERT INTO onboarding_analytics (company_id, event_name, event_data)
         VALUES ($1, 'company_created', $2)`,
        [company.id, JSON.stringify({ source: req.headers.referer || 'direct' })]
      );

      // 6. Send welcome email
      await sendWelcomeEmail(email, {
        companyName,
        username: adminUser.username,
        trialDays: 30
      });

      await query('COMMIT');

      // Generate JWT tokens for auto-login
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        companyId: company.id,
        branchId: branch.id
      });

      const refreshToken = generateRefreshToken({
        id: user.id,
        companyId: company.id
      });

      res.json({
        success: true,
        token,
        refreshToken,
        user: {
          ...user,
          company: {
            id: company.id,
            name: company.name,
            trialEndsAt: company.trial_ends_at
          },
          branch: {
            id: branch.id,
            name: branch.name,
            code: branch.branch_code
          }
        },
        message: 'Welcome to DesiCargo! Your account has been created successfully.'
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company account'
    });
  }
};

async function createDefaultData(companyId: string, branchId: string) {
  // Create common routes
  const routes = [
    { from: 'Mumbai', to: 'Delhi', distance: 1400, transit_days: 2, rate_per_kg: 2.5 },
    { from: 'Mumbai', to: 'Bangalore', distance: 980, transit_days: 2, rate_per_kg: 2.0 },
    { from: 'Delhi', to: 'Kolkata', distance: 1500, transit_days: 3, rate_per_kg: 2.2 },
    { from: 'Chennai', to: 'Hyderabad', distance: 520, transit_days: 1, rate_per_kg: 1.8 },
    { from: 'Mumbai', to: 'Pune', distance: 150, transit_days: 1, rate_per_kg: 1.5 }
  ];

  // Create sample customers
  const customers = [
    {
      name: 'Cash Customer',
      type: 'walkin',
      phone: '9999999999',
      address: 'Walk-in Customer',
      city: 'Various',
      credit_limit: 0
    },
    {
      name: 'Sample Customer - ABC Traders',
      type: 'regular',
      phone: '9876543210',
      gstin: '27AAACB1234C1Z5',
      address: '123 Business Park',
      city: 'Mumbai',
      credit_limit: 50000
    }
  ];

  // Insert routes (you might need a routes table)
  // Insert customers
  for (const customer of customers) {
    await query(
      `INSERT INTO customers (
        company_id, branch_id, name, type, phone, gstin,
        address, city, credit_limit, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [
        companyId, branchId, customer.name, customer.type,
        customer.phone, customer.gstin || null, customer.address,
        customer.city, customer.credit_limit
      ]
    );
  }
}

export const generateSampleData = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { companyId, branchId } = (req as any).user;
    const { dataType } = req.body; // 'all', 'customers', 'bookings', etc.

    // Get sample data templates
    const templates = await query(
      'SELECT * FROM sample_data_templates WHERE template_type = $1 OR $1 = \'all\'',
      [dataType]
    );

    let created = {
      customers: 0,
      bookings: 0,
      routes: 0
    };

    for (const template of templates.rows) {
      const data = template.template_data;

      if (template.template_type === 'customer' && data.customers) {
        for (const customer of data.customers) {
          await query(
            `INSERT INTO customers (
              company_id, branch_id, name, type, phone, gstin,
              address, city, credit_limit, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
            ON CONFLICT DO NOTHING`,
            [
              companyId, branchId, customer.name + ' (Sample)',
              customer.type, customer.phone, customer.gstin || null,
              customer.address || 'Sample Address', customer.city || 'Mumbai',
              customer.credit_limit || 0
            ]
          );
          created.customers++;
        }
      }

      // Add more sample data generation logic for bookings, routes, etc.
    }

    // Track analytics
    await query(
      `INSERT INTO onboarding_analytics (company_id, event_name, event_data)
       VALUES ($1, 'sample_data_generated', $2)`,
      [companyId, JSON.stringify({ dataType, created })]
    );

    res.json({
      success: true,
      message: 'Sample data generated successfully',
      created
    });
  } catch (error) {
    console.error('Generate sample data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sample data'
    });
  }
};

export const updateOnboardingProgress = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { companyId } = (req as any).user;
    const { step, completed } = req.body;

    // Update onboarding steps
    await query(
      `UPDATE companies 
       SET onboarding_steps = jsonb_set(
         COALESCE(onboarding_steps, '{}'::jsonb),
         '{${step}}',
         $1::jsonb
       ),
       onboarding_completed = $2,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [JSON.stringify({ completed, timestamp: new Date() }), completed, companyId]
    );

    // Track analytics
    await query(
      `INSERT INTO onboarding_analytics (company_id, event_name, event_data)
       VALUES ($1, $2, $3)`,
      [companyId, 'onboarding_step_completed', JSON.stringify({ step })]
    );

    res.json({
      success: true,
      message: 'Onboarding progress updated'
    });
  } catch (error) {
    console.error('Update onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update onboarding progress'
    });
  }
};

export const getTrialStatus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { companyId } = (req as any).user;

    const result = await query(
      `SELECT 
        subscription_plan,
        trial_ends_at,
        subscription_ends_at,
        onboarding_completed,
        onboarding_steps,
        (trial_ends_at - CURRENT_TIMESTAMP) as time_remaining
       FROM companies WHERE id = $1`,
      [companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const company = result.rows[0];
    const daysRemaining = Math.ceil(
      (new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Get usage stats
    const usageResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE c.created_at >= date_trunc('month', CURRENT_DATE)) as monthly_bookings,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT b.id) as total_branches
       FROM consignments c
       LEFT JOIN users u ON u.company_id = $1
       LEFT JOIN branches b ON b.company_id = $1
       WHERE c.company_id = $1`,
      [companyId]
    );

    const usage = usageResult.rows[0];

    // Get trial limitations
    const limitsResult = await query(
      'SELECT * FROM trial_limitations WHERE plan_type = $1',
      [company.subscription_plan]
    );

    const limits = limitsResult.rows[0];

    res.json({
      success: true,
      trial: {
        plan: company.subscription_plan,
        daysRemaining,
        endsAt: company.trial_ends_at,
        onboardingCompleted: company.onboarding_completed,
        onboardingSteps: company.onboarding_steps
      },
      usage: {
        monthlyBookings: parseInt(usage.monthly_bookings),
        totalUsers: parseInt(usage.total_users),
        totalBranches: parseInt(usage.total_branches)
      },
      limits: {
        maxBookingsPerMonth: limits.max_consignments_per_month,
        maxUsers: limits.max_users,
        maxBranches: limits.max_branches,
        featuresAllowed: limits.features_allowed
      }
    });
  } catch (error) {
    console.error('Get trial status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trial status'
    });
  }
};