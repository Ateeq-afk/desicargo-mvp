import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
  sendSignupOTP,
  verifySignupOTP,
  createCompanyWithTrial,
  generateSampleData,
  updateOnboardingProgress,
  getTrialStatus
} from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Validation middleware
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes for signup
router.post('/send-otp', [
  body('phone').isMobilePhone('en-IN').withMessage('Invalid phone number'),
  body('email').isEmail().withMessage('Invalid email address'),
  validate
], sendSignupOTP);

router.post('/verify-otp', [
  body('phone').isMobilePhone('en-IN'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  validate
], verifySignupOTP);

router.post('/signup', [
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('ownerName').notEmpty().withMessage('Owner name is required'),
  body('phone').isMobilePhone('en-IN'),
  body('email').isEmail(),
  body('address').notEmpty(),
  body('city').notEmpty(),
  body('state').notEmpty(),
  body('pincode').isLength({ min: 6, max: 6 }).isNumeric(),
  body('businessType').isIn(['ftl', 'ltl', 'parcel', 'mixed']),
  body('fleetSize').isIn(['1-5', '6-20', '20+', 'booking_agent']),
  body('servicesOffered').isArray(),
  body('firstBranch.branchCode').notEmpty().isLength({ min: 3, max: 4 }),
  body('firstBranch.branchName').notEmpty(),
  body('adminUser.username').notEmpty().isLength({ min: 4 }),
  body('adminUser.password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
], createCompanyWithTrial);

// Protected routes (require authentication)
router.use(authenticate);

router.post('/generate-sample-data', [
  body('dataType').isIn(['all', 'customers', 'bookings', 'routes']),
  validate
], generateSampleData);

router.post('/update-progress', [
  body('step').notEmpty(),
  body('completed').isBoolean(),
  validate
], updateOnboardingProgress);

router.get('/trial-status', getTrialStatus);

// Development only - get recent OTPs for debugging
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/recent-otps/:phone', async (req, res) => {
    try {
      const { phone } = req.params;
      const result = await require('../config/database').query(
        `SELECT otp, expires_at, created_at FROM otp_verifications 
         WHERE phone = $1 AND purpose = 'signup'
         ORDER BY created_at DESC LIMIT 5`,
        [phone]
      );
      
      res.json({
        success: true,
        otps: result.rows
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

export default router;