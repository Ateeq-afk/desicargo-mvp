import { Router } from 'express';
import { expenseController } from '../controllers/expenseController';
import { authenticate } from '../middleware/auth.middleware';
import { body, query, param } from 'express-validator';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get expense categories
router.get('/categories', expenseController.getCategories);

// Expense CRUD operations
router.post('/',
  [
    body('expense_date').isISO8601().toDate(),
    body('category_id').isUUID(),
    body('amount').isNumeric().isFloat({ min: 0 }),
    body('description').optional().isString(),
    body('vehicle_id').optional().isUUID(),
    body('driver_id').optional().isUUID(),
    body('ogpl_id').optional().isUUID(),
    body('branch_id').optional().isUUID(),
    body('payment_mode').optional().isIn(['cash', 'online', 'credit']),
    body('reference_number').optional().isString(),
    body('bill_number').optional().isString(),
    body('attachment_url').optional().isURL()
  ],
  validateRequest,
  expenseController.createExpense
);

router.get('/',
  [
    query('branch_id').optional().isUUID(),
    query('vehicle_id').optional().isUUID(),
    query('driver_id').optional().isUUID(),
    query('ogpl_id').optional().isUUID(),
    query('category_id').optional().isUUID(),
    query('category_type').optional().isIn(['direct', 'indirect']),
    query('from_date').optional().isISO8601(),
    query('to_date').optional().isISO8601(),
    query('payment_mode').optional().isIn(['cash', 'online', 'credit'])
  ],
  validateRequest,
  expenseController.getExpenses
);

router.put('/:id',
  [
    param('id').isUUID(),
    body('expense_date').optional().isISO8601().toDate(),
    body('category_id').optional().isUUID(),
    body('amount').optional().isNumeric().isFloat({ min: 0 }),
    body('description').optional().isString(),
    body('vehicle_id').optional().isUUID(),
    body('driver_id').optional().isUUID(),
    body('ogpl_id').optional().isUUID(),
    body('payment_mode').optional().isIn(['cash', 'online', 'credit']),
    body('reference_number').optional().isString(),
    body('bill_number').optional().isString(),
    body('attachment_url').optional().isURL()
  ],
  validateRequest,
  expenseController.updateExpense
);

router.delete('/:id',
  [param('id').isUUID()],
  validateRequest,
  expenseController.deleteExpense
);

// Reports
router.get('/trip-pl/:ogplId',
  [param('ogplId').isUUID()],
  validateRequest,
  expenseController.getTripPL
);

router.get('/vehicle-pl',
  [
    query('vehicle_id').isUUID(),
    query('from_date').isISO8601(),
    query('to_date').isISO8601()
  ],
  validateRequest,
  expenseController.getVehiclePL
);

router.get('/summary',
  [
    query('from_date').optional().isISO8601(),
    query('to_date').optional().isISO8601()
  ],
  validateRequest,
  expenseController.getExpenseSummary
);

// Recurring expenses
router.post('/recurring',
  [
    body('expense_name').isString().notEmpty(),
    body('category_id').isUUID(),
    body('amount').isNumeric().isFloat({ min: 0 }),
    body('frequency').isIn(['daily', 'weekly', 'monthly']),
    body('vehicle_id').optional().isUUID(),
    body('driver_id').optional().isUUID()
  ],
  validateRequest,
  expenseController.createRecurringExpense
);

router.post('/process-recurring',
  [body('frequency').isIn(['daily', 'weekly', 'monthly'])],
  validateRequest,
  expenseController.processRecurringExpenses
);

export default router;