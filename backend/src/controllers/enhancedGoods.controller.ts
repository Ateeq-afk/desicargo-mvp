import { Request, Response } from 'express';
import { EnhancedGoodsService } from '../services/enhancedGoods.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { CreateEnhancedGoodsRequest, GoodsSearchParams } from '../types/goods.types';

export class EnhancedGoodsController {
  // Get all goods with enhanced search
  static async getGoods(req: AuthRequest, res: Response) {
    try {
      const searchParams: Partial<GoodsSearchParams> = {
        query: req.query.q as string,
        category_id: req.query.category_id as string,
        is_hazardous: req.query.is_hazardous === 'true' ? true : req.query.is_hazardous === 'false' ? false : undefined,
        is_fragile: req.query.is_fragile === 'true' ? true : req.query.is_fragile === 'false' ? false : undefined,
        is_perishable: req.query.is_perishable === 'true' ? true : req.query.is_perishable === 'false' ? false : undefined,
        packaging_type_id: req.query.packaging_type_id as string,
        barcode: req.query.barcode as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        sort_by: req.query.sort_by as any || 'goods_name',
        sort_order: req.query.sort_order as any || 'asc'
      };

      // Parse weight range if provided
      if (req.query.weight_min && req.query.weight_max) {
        searchParams.weight_range = {
          min: parseFloat(req.query.weight_min as string),
          max: parseFloat(req.query.weight_max as string)
        };
      }

      const result = await EnhancedGoodsService.getGoods(
        req.user!.companyId,
        searchParams
      );

      res.json({
        success: true,
        data: result.goods,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error fetching enhanced goods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch goods'
      });
    }
  }

  // Get single goods with all relations
  static async getGoodsById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { include_relations = 'true' } = req.query;
      
      const goods = await EnhancedGoodsService.getGoodsById(
        id,
        req.user!.companyId,
        include_relations === 'true'
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
      console.error('Error fetching goods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch goods'
      });
    }
  }

  // Create enhanced goods
  static async createGoods(req: AuthRequest, res: Response) {
    try {
      const data: CreateEnhancedGoodsRequest = req.body;

      // Validate required fields
      if (!data.goods_name) {
        res.status(400).json({
          success: false,
          error: 'Goods name is required'
        });
        return;
      }

      // Validate dimensions if provided
      if (data.dimensions) {
        if (!data.dimensions.length || !data.dimensions.width || !data.dimensions.height) {
          res.status(400).json({
            success: false,
            error: 'All dimension values (length, width, height) are required when dimensions are specified'
          });
          return;
        }
        if (!['cm', 'inch'].includes(data.dimensions.unit)) {
          res.status(400).json({
            success: false,
            error: 'Dimension unit must be either "cm" or "inch"'
          });
          return;
        }
      }

      // Validate temperature requirements if provided
      if (data.temperature_requirements) {
        if (!['C', 'F'].includes(data.temperature_requirements.unit)) {
          res.status(400).json({
            success: false,
            error: 'Temperature unit must be either "C" or "F"'
          });
          return;
        }
      }

      const goods = await EnhancedGoodsService.createGoods(
        data,
        req.user!.companyId,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        data: goods
      });
    } catch (error: any) {
      console.error('Error creating enhanced goods:', error);
      
      if (error.message.includes('Invalid category') || error.message.includes('Invalid packaging')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create goods'
        });
      }
    }
  }

  // Advanced search
  static async advancedSearch(req: AuthRequest, res: Response) {
    try {
      const searchParams: GoodsSearchParams = req.body;
      
      const goods = await EnhancedGoodsService.advancedSearch(
        req.user!.companyId,
        searchParams
      );

      res.json({
        success: true,
        data: goods
      });
    } catch (error) {
      console.error('Error in advanced search:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform advanced search'
      });
    }
  }

  // Search by barcode/QR code
  static async searchByBarcode(req: AuthRequest, res: Response) {
    try {
      const { barcode } = req.params;
      
      if (!barcode) {
        res.status(400).json({
          success: false,
          error: 'Barcode is required'
        });
        return;
      }

      const goods = await EnhancedGoodsService.searchByBarcode(
        barcode,
        req.user!.companyId
      );

      if (!goods) {
        res.status(404).json({
          success: false,
          error: 'No goods found with this barcode'
        });
        return;
      }

      res.json({
        success: true,
        data: goods
      });
    } catch (error) {
      console.error('Error searching by barcode:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search by barcode'
      });
    }
  }

  // Bulk import goods
  static async bulkImportGoods(req: AuthRequest, res: Response) {
    try {
      const importData = req.body;
      
      const result = await EnhancedGoodsService.bulkImportGoods(
        importData,
        req.user!.companyId,
        req.user!.userId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in bulk import:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import goods'
      });
    }
  }

  // Get goods analytics
  static async getAnalytics(req: AuthRequest, res: Response) {
    try {
      const analytics = await EnhancedGoodsService.getGoodsAnalytics(
        req.user!.companyId
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching goods analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch goods analytics'
      });
    }
  }

  // Legacy compatibility methods (delegate to original goods service)
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

      const result = await EnhancedGoodsService.getGoods(
        req.user!.companyId,
        { query: q, limit: 20 }
      );

      res.json({
        success: true,
        data: result.goods
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