import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { validateRequest as validate } from '../middleware/validation.middleware';
import { body, param } from 'express-validator';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword
} from '../controllers/user.controller';

const router = Router();

// Validation rules
const createUserValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('role').isIn(['admin', 'manager', 'operator', 'accountant']).withMessage('Invalid role'),
  body('branch_id').isUUID().withMessage('Invalid branch ID')
];

const updateUserValidation = [
  body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('role').optional().isIn(['admin', 'manager', 'operator', 'accountant']).withMessage('Invalid role'),
  body('branch_id').optional().isUUID().withMessage('Invalid branch ID'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
];

const changePasswordValidation = [
  body('new_password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('current_password').optional().notEmpty().withMessage('Current password is required')
];

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// User routes
router.get('/', getUsers);

router.get('/:id', 
  param('id').isUUID().withMessage('Invalid user ID'),
  validate,
  getUserById
);

router.post('/', 
  createUserValidation,
  validate,
  createUser
);

router.put('/:id',
  param('id').isUUID().withMessage('Invalid user ID'),
  updateUserValidation,
  validate,
  updateUser
);

router.delete('/:id',
  param('id').isUUID().withMessage('Invalid user ID'),
  validate,
  deleteUser
);

router.post('/:id/change-password',
  param('id').isUUID().withMessage('Invalid user ID'),
  changePasswordValidation,
  validate,
  changePassword
);

export default router;