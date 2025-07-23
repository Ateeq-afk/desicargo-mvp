import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { validateRequest as validate } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats
} from '../controllers/branch.controller';

const router = Router();

// Validation rules
const createBranchValidation = [
  body('branch_code').trim().notEmpty().withMessage('Branch code is required'),
  body('name').trim().notEmpty().withMessage('Branch name is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('pincode').optional().isLength({ min: 6, max: 6 }).withMessage('Pincode must be 6 digits'),
  body('is_head_office').optional().isBoolean().withMessage('is_head_office must be boolean')
];

const updateBranchValidation = [
  body('branch_code').optional().trim().notEmpty().withMessage('Branch code cannot be empty'),
  body('name').optional().trim().notEmpty().withMessage('Branch name cannot be empty'),
  body('city').optional().trim().notEmpty().withMessage('City cannot be empty'),
  body('state').optional().trim().notEmpty().withMessage('State cannot be empty'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('pincode').optional().isLength({ min: 6, max: 6 }).withMessage('Pincode must be 6 digits'),
  body('is_head_office').optional().isBoolean().withMessage('is_head_office must be boolean'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
];

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Branch routes
router.get('/', getBranches);

router.get('/:id', 
  param('id').isUUID().withMessage('Invalid branch ID'),
  validate,
  getBranchById
);

router.get('/:id/stats',
  param('id').isUUID().withMessage('Invalid branch ID'),
  validate,
  getBranchStats
);

router.post('/', 
  createBranchValidation,
  validate,
  createBranch
);

router.put('/:id',
  param('id').isUUID().withMessage('Invalid branch ID'),
  updateBranchValidation,
  validate,
  updateBranch
);

router.delete('/:id',
  param('id').isUUID().withMessage('Invalid branch ID'),
  validate,
  deleteBranch
);

export default router;