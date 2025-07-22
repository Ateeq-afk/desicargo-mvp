import { Router } from 'express';
import { GoodsController } from '../controllers/goods.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Goods routes
router.get('/', GoodsController.getGoods);
router.get('/search', GoodsController.searchGoods);
router.get('/:id', GoodsController.getGoodsById);
router.post('/', GoodsController.createGoods);
router.put('/:id', GoodsController.updateGoods);
router.delete('/:id', GoodsController.deleteGoods);

export default router;