import { Request, Response } from 'express';
import { GoodsService } from '../services/goods.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class GoodsController {
  // Get all goods
  static async getGoods(req: AuthRequest, res: Response) {
    try {
      const { is_active } = req.query;
      const goods = await GoodsService.getGoods(
        req.user!.companyId,
        is_active !== undefined ? is_active === 'true' : undefined
      );

      res.json({
        success: true,
        data: goods
      });
    } catch (error) {
      console.error('Error fetching goods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch goods'
      });
    }
  }

  // Get single goods
  static async getGoodsById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const goods = await GoodsService.getGoodsById(id, req.user!.companyId);

      if (!goods) {
        res.status(404).json({
          success: false,
          error: 'Goods not found'
        });
        return;
      }

      res.json({
        success: true,
        data: goods
      });
    } catch (error) {
      console.error('Error fetching goods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch goods'
      });
    }
  }

  // Create goods
  static async createGoods(req: AuthRequest, res: Response) {
    try {
      const { goods_name, goods_code, hsn_code, is_active } = req.body;

      if (!goods_name) {
        res.status(400).json({
          success: false,
          error: 'Goods name is required'
        });
        return;
      }

      const goods = await GoodsService.createGoods(
        { goods_name, goods_code, hsn_code, is_active },
        req.user!.companyId,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        data: goods
      });
    } catch (error) {
      console.error('Error creating goods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create goods'
      });
    }
  }

  // Update goods
  static async updateGoods(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { goods_name, goods_code, hsn_code, is_active } = req.body;

      const goods = await GoodsService.updateGoods(
        id,
        { goods_name, goods_code, hsn_code, is_active },
        req.user!.companyId
      );

      if (!goods) {
        res.status(404).json({
          success: false,
          error: 'Goods not found'
        });
        return;
      }

      res.json({
        success: true,
        data: goods
      });
    } catch (error) {
      console.error('Error updating goods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update goods'
      });
    }
  }

  // Delete goods
  static async deleteGoods(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const goods = await GoodsService.deleteGoods(id, req.user!.companyId);

      if (!goods) {
        res.status(404).json({
          success: false,
          error: 'Goods not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Goods deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting goods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete goods'
      });
    }
  }

  // Search goods
  static async searchGoods(req: AuthRequest, res: Response) {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      const goods = await GoodsService.searchGoods(req.user!.companyId, q);

      res.json({
        success: true,
        data: goods
      });
    } catch (error) {
      console.error('Error searching goods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search goods'
      });
    }
  }
}