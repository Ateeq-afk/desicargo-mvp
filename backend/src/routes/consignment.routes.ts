import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as consignmentController from '../controllers/consignment.controller';
import { authenticate, authorize, checkBranchAccess } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// Validation rules
const createConsignmentValidation = [
  body('from_branch_id').notEmpty().isUUID().withMessage('Valid from branch ID is required'),
  body('to_branch_id').notEmpty().isUUID().withMessage('Valid to branch ID is required'),
  
  // Consignor validation
  body('consignor_name').notEmpty().trim().withMessage('Consignor name is required'),
  body('consignor_phone')
    .notEmpty().withMessage('Consignor phone is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Invalid phone number format'),
  body('consignor_address').optional().trim(),
  body('consignor_gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GSTIN format'),
  
  // Consignee validation
  body('consignee_name').notEmpty().trim().withMessage('Consignee name is required'),
  body('consignee_phone')
    .notEmpty().withMessage('Consignee phone is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Invalid phone number format'),
  body('consignee_address').optional().trim(),
  body('consignee_pincode').optional().matches(/^[1-9][0-9]{5}$/).withMessage('Invalid pincode format'),
  
  // Goods validation
  body('no_of_packages')
    .notEmpty().withMessage('Number of packages is required')
    .isInt({ min: 1 }).withMessage('Number of packages must be at least 1'),
  body('actual_weight')
    .optional()
    .isFloat({ min: 0.1 }).withMessage('Weight must be greater than 0'),
  body('charged_weight')
    .optional()
    .isFloat({ min: 0.1 }).withMessage('Charged weight must be greater than 0'),
  
  // Charges validation
  body('freight_amount')
    .notEmpty().withMessage('Freight amount is required')
    .isFloat({ min: 0 }).withMessage('Freight amount must be a positive number'),
  body('hamali_charges').optional().isFloat({ min: 0 }),
  body('door_delivery_charges').optional().isFloat({ min: 0 }),
  body('loading_charges').optional().isFloat({ min: 0 }),
  body('unloading_charges').optional().isFloat({ min: 0 }),
  body('other_charges').optional().isFloat({ min: 0 }),
  body('statistical_charges').optional().isFloat({ min: 0 }),
  
  // Payment and delivery type
  body('payment_type')
    .notEmpty().withMessage('Payment type is required')
    .isIn(['paid', 'topay', 'tbb']).withMessage('Invalid payment type'),
  body('delivery_type')
    .optional()
    .isIn(['godown', 'door']).withMessage('Invalid delivery type'),
  
  // Optional fields
  body('goods_description').optional().trim(),
  body('goods_value').optional().isFloat({ min: 0 }),
  body('eway_bill_number').optional().trim(),
  body('invoice_number').optional().trim(),
];

// Get consignments pending for OGPL (specific route first)
router.get(
  '/pending/ogpl',
  authenticate,
  [
    query('branch_id').optional().isUUID().withMessage('Invalid branch ID'),
    query('to_branch_id').optional().isUUID().withMessage('Invalid to branch ID')
  ],
  validate,
  consignmentController.getPendingForOGPL
);

// Public tracking endpoint (no auth required)
router.get(
  '/track/:cnNumber',
  param('cnNumber').notEmpty().withMessage('CN number is required'),
  validate,
  consignmentController.trackConsignment
);

// Create new consignment
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager', 'operator'),
  createConsignmentValidation,
  validate,
  consignmentController.createConsignment
);

// List consignments with filters
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('from_date').optional().isISO8601().withMessage('Invalid from date format'),
    query('to_date').optional().isISO8601().withMessage('Invalid to date format'),
    query('branch_id').optional().isUUID().withMessage('Invalid branch ID'),
    query('status').optional().isIn(['booked', 'picked', 'in_transit', 'reached', 'out_for_delivery', 'delivered', 'undelivered', 'cancelled']),
    query('payment_type').optional().isIn(['paid', 'topay', 'tbb']),
    query('search').optional().trim()
  ],
  validate,
  consignmentController.listConsignments
);

// Get consignment by CN number
router.get(
  '/:cnNumber',
  authenticate,
  param('cnNumber').notEmpty().withMessage('CN number is required'),
  validate,
  consignmentController.getConsignmentByCN
);

// Update consignment status
router.put(
  '/:id/status',
  authenticate,
  authorize('admin', 'manager', 'operator'),
  [
    param('id').isUUID().withMessage('Invalid consignment ID'),
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['booked', 'picked', 'in_transit', 'reached', 'out_for_delivery', 'delivered', 'undelivered', 'cancelled'])
      .withMessage('Invalid status'),
    body('remarks').optional().trim(),
    body('branch_id').optional().isUUID().withMessage('Invalid branch ID')
  ],
  validate,
  consignmentController.updateConsignmentStatus
);

export default router;