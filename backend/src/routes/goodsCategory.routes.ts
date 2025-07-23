import { Router } from 'express';
import { GoodsCategoryController } from '../controllers/goodsCategory.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

// Category CRUD routes
router.get('/', GoodsCategoryController.getCategories);
router.get('/stats', GoodsCategoryController.getCategoriesWithStats);
router.get('/:id', GoodsCategoryController.getCategoryById);
router.get('/:id/path', GoodsCategoryController.getCategoryPath);
router.post('/', GoodsCategoryController.createCategory);
router.put('/:id', GoodsCategoryController.updateCategory);
router.delete('/:id', GoodsCategoryController.deleteCategory);

export default router;