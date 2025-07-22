import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createCustomer,
  updateCustomer,
  getCustomers,
  searchCustomers,
  getCustomerById,
  getFrequentCustomers,
  deleteCustomer,
  importCustomers
} from '../controllers/customer.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const customerValidationRules = [
  body('name').notEmpty().withMessage('Customer name is required'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
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
router.get('/:id', getCustomerById);
router.put('/:id', customerValidationRules, validateRequest, updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/import', importCustomers);

export default router;