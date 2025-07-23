import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress
} from '../controllers/customerAddress.controller';

const router = Router({ mergeParams: true }); // mergeParams to access parent route params

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Validation rules
const addressValidationRules = [
  body('address_type').isIn(['pickup', 'delivery', 'billing']).withMessage('Invalid address type'),
  body('address_line1').notEmpty().withMessage('Address line 1 is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('pincode').optional().matches(/^[0-9]{6}$/).withMessage('Pincode must be 6 digits')
];

// Routes
router.get('/', getCustomerAddresses);
router.post('/', addressValidationRules, validateRequest, createCustomerAddress);
router.put('/:addressId', addressValidationRules, validateRequest, updateCustomerAddress);
router.delete('/:addressId', deleteCustomerAddress);
router.post('/:addressId/set-default', setDefaultAddress);

export default router;