import { Router } from 'express';
import { PackagingTypeController } from '../controllers/packagingType.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Packaging type CRUD routes
router.get('/', PackagingTypeController.getPackagingTypes);
router.get('/stats', PackagingTypeController.getPackagingStats);
router.get('/suggest', PackagingTypeController.suggestPackaging);
router.get('/:id', PackagingTypeController.getPackagingTypeById);
router.get('/code/:code', PackagingTypeController.getPackagingTypeByCode);
router.post('/', PackagingTypeController.createPackagingType);
router.post('/calculate-volumetric-weight', PackagingTypeController.calculateVolumetricWeight);
router.put('/:id', PackagingTypeController.updatePackagingType);
router.delete('/:id', PackagingTypeController.deletePackagingType);

export default router;