import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import customerAddressRoutes from './customerAddress.routes';
import {
  createCustomer,
  updateCustomer,
  getCustomers,
  searchCustomers,
  getCustomerById,
  getFrequentCustomers,
  deleteCustomer,
  reactivateCustomer,
  importCustomers
} from '../controllers/customer.controller';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Validation rules
const customerValidationRules = [
  body('name').notEmpty().withMessage('Customer name is required'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format'),
  body('gstin')
    .optional({ checkFalsy: true })
    .isLength({ min: 15, max: 15 })
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GSTIN format'),
  body('customer_type').optional()
    .isIn(['regular', 'walkin', 'corporate', 'agent'])
    .withMessage('Invalid customer type'),
  body('credit_limit').optional().isNumeric().withMessage('Credit limit must be a number'),
  body('credit_days').optional().isInt({ min: 0 }).withMessage('Credit days must be a positive integer')
];

// Routes
router.post('/', customerValidationRules, validateRequest, createCustomer);
router.get('/', getCustomers);
router.get('/search', searchCustomers);
router.get('/frequent', getFrequentCustomers);
router.post('/import', importCustomers);
router.post('/:id/reactivate', reactivateCustomer);
router.get('/:id', getCustomerById);
router.put('/:id', customerValidationRules, validateRequest, updateCustomer);
router.delete('/:id', deleteCustomer);

// Nested routes for customer addresses
router.use('/:customerId/addresses', customerAddressRoutes);

export default router;