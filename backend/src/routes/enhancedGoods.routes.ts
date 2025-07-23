import { Router } from 'express';
import { EnhancedGoodsController } from '../controllers/enhancedGoods.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Enhanced goods routes
router.get('/', EnhancedGoodsController.getGoods);
router.get('/analytics', EnhancedGoodsController.getAnalytics);
router.get('/search', EnhancedGoodsController.searchGoods); // Legacy compatibility
router.get('/barcode/:barcode', EnhancedGoodsController.searchByBarcode);
router.get('/:id', EnhancedGoodsController.getGoodsById);

router.post('/', EnhancedGoodsController.createGoods);
router.post('/advanced-search', EnhancedGoodsController.advancedSearch);
router.post('/bulk-import', EnhancedGoodsController.bulkImportGoods);

export default router;