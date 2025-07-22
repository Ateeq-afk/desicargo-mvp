import { Router } from 'express';
import { body } from 'express-validator';
import {
  createTenant,
  getTenantInfo,
  updateTenant,
  getTenantStats
} from '../controllers/tenant.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

// Public route - tenant self-registration
router.post(
  '/register',
  [
    body('tenantCode')
      .trim()
      .notEmpty().withMessage('Tenant code is required')
      .matches(/^[a-z0-9-]+$/).withMessage('Tenant code must be lowercase alphanumeric with hyphens only')
      .isLength({ min: 3, max: 20 }).withMessage('Tenant code must be between 3 and 20 characters'),
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('contactEmail').isEmail().withMessage('Valid email is required'),
    body('contactPhone').optional().isMobilePhone('en-IN').withMessage('Valid phone number is required'),
    body('adminUsername')
      .trim()
      .notEmpty().withMessage('Admin username is required')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('adminPassword')
      .notEmpty().withMessage('Admin password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('adminFullName').optional().trim(),
    body('adminEmail').optional().isEmail().withMessage('Valid admin email is required'),
    body('adminPhone').optional().isMobilePhone('en-IN').withMessage('Valid admin phone is required'),
    body('branchName').optional().trim(),
    body('branchCity').optional().trim(),
    body('branchState').optional().trim(),
    body('branchAddress').optional().trim(),
    body('planType').optional().isIn(['trial', 'starter', 'professional', 'enterprise'])
  ],
  validateRequest,
  createTenant
);

// Public route - get tenant info by code (for login page branding)
router.get('/:code', getTenantInfo);

// Protected routes - require tenant authentication
router.put(
  '/settings',
  requireTenant,
  requireRole(['admin', 'superadmin']),
  [
    body('companyName').optional().trim().notEmpty(),
    body('contactEmail').optional().isEmail(),
    body('contactPhone').optional().isMobilePhone('en-IN'),
    body('logoUrl').optional().isURL(),
    body('primaryColor').optional().matches(/^#[0-9A-F]{6}$/i),
    body('secondaryColor').optional().matches(/^#[0-9A-F]{6}$/i)
  ],
  validateRequest,
  updateTenant
);

// Get tenant usage statistics
router.get(
  '/stats/usage',
  requireTenant,
  requireRole(['admin', 'superadmin']),
  getTenantStats
);

export default router;