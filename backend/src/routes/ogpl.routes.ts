import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import {
  createOGPL,
  loadConsignments,
  getOGPLList,
  getOGPLDetails,
  departOGPL,
  getPendingDeparture,
  getAvailableConsignments
} from '../controllers/ogpl.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get available consignments for loading
router.get('/available-consignments', 
  [
    query('to_branch_id').optional().isUUID()
  ],
  getAvailableConsignments
);

// Get pending departure OGPLs
router.get('/pending-departure', getPendingDeparture);

// Create new OGPL
router.post('/',
  [
    body('from_branch_id').isUUID().withMessage('Valid from branch ID required'),
    body('to_branch_id').isUUID().withMessage('Valid to branch ID required'),
    body('vehicle_number').notEmpty().withMessage('Vehicle number is required'),
    body('driver_name').notEmpty().withMessage('Driver name is required'),
    body('driver_phone').isMobilePhone('en-IN').withMessage('Valid driver phone required'),
    body('seal_number').optional()
  ],
  createOGPL
);

// Get OGPL list
router.get('/',
  [
    query('status').optional().isIn(['created', 'loading', 'ready', 'departed', 'intransit', 'reached']),
    query('branch_id').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  getOGPLList
);

// Get OGPL details by OGPL number
router.get('/:ogplNumber',
  [
    param('ogplNumber').notEmpty()
  ],
  getOGPLDetails
);

// Load consignments into OGPL
router.post('/:id/load',
  [
    param('id').isUUID(),
    body('consignment_ids').isArray({ min: 1 }).withMessage('At least one consignment required'),
    body('consignment_ids.*').isUUID().withMessage('Invalid consignment ID')
  ],
  loadConsignments
);

// Depart OGPL
router.put('/:id/depart',
  [
    param('id').isUUID()
  ],
  departOGPL
);

export default router;