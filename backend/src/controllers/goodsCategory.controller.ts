import { Request, Response } from 'express';
import { GoodsCategoryService } from '../services/goodsCategory.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { CreateGoodsCategoryRequest } from '../types/goods.types';

export class GoodsCategoryController {
  // Get all categories
  static async getCategories(req: AuthRequest, res: Response) {
    try {
      const { include_inactive, flat } = req.query;
      
      const categories = await GoodsCategoryService.getCategories(
        req.user!.companyId,
        include_inactive === 'true',
        flat !== 'true' // Build hierarchy by default
      );

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      });
    }
  }

  // Get single category
  static async getCategoryById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { include_children } = req.query;
      
      const category = await GoodsCategoryService.getCategoryById(
        id,
        req.user!.companyId,
        include_children !== 'false'
      );

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch category'
      });
    }
  }

  // Create category
  static async createCategory(req: AuthRequest, res: Response) {
    try {
      const data: CreateGoodsCategoryRequest = req.body;

      // Validate required fields
      if (!data.name) {
        res.status(400).json({
          success: false,
          error: 'Category name is required'
        });
        return;
      }

      const category = await GoodsCategoryService.createCategory(
        data,
        req.user!.companyId,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error: any) {
      console.error('Error creating category:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else if (error.message.includes('Parent category not found')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create category'
        });
      }
    }
  }

  // Update category
  static async updateCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data: Partial<CreateGoodsCategoryRequest> = req.body;

      const category = await GoodsCategoryService.updateCategory(
        id,
        data,
        req.user!.companyId
      );

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error: any) {
      console.error('Error updating category:', error);
      
      if (error.message.includes('Parent category not found') ||
          error.message.includes('cannot be its own parent') ||
          error.message.includes('descendant')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update category'
        });
      }
    }
  }

  // Delete category
  static async deleteCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { cascade } = req.query;

      const deleted = await GoodsCategoryService.deleteCategory(
        id,
        req.user!.companyId,
        cascade === 'true'
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      
      if (error.message.includes('child categories') ||
          error.message.includes('being used by goods')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete category'
        });
      }
    }
  }

  // Get category path (breadcrumb)
  static async getCategoryPath(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const path = await GoodsCategoryService.getCategoryPath(
        id,
        req.user!.companyId
      );

      res.json({
        success: true,
        data: path
      });
    } catch (error) {
      console.error('Error fetching category path:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch category path'
      });
    }
  }

  // Get categories with goods count
  static async getCategoriesWithStats(req: AuthRequest, res: Response) {
    try {
      const categories = await GoodsCategoryService.getCategoriesWithGoodsCount(
        req.user!.companyId
      );

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching categories with stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories statistics'
      });
    }
  }
}