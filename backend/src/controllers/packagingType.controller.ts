import { Request, Response } from 'express';
import { PackagingTypeService } from '../services/packagingType.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { CreatePackagingTypeRequest } from '../types/goods.types';

export class PackagingTypeController {
  // Get all packaging types
  static async getPackagingTypes(req: AuthRequest, res: Response) {
    try {
      const { include_inactive } = req.query;
      
      const packagingTypes = await PackagingTypeService.getPackagingTypes(
        req.user!.companyId,
        include_inactive === 'true'
      );

      res.json({
        success: true,
        data: packagingTypes
      });
    } catch (error) {
      console.error('Error fetching packaging types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch packaging types'
      });
    }
  }

  // Get single packaging type
  static async getPackagingTypeById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const packagingType = await PackagingTypeService.getPackagingTypeById(
        id,
        req.user!.companyId
      );

      if (!packagingType) {
        res.status(404).json({
          success: false,
          error: 'Packaging type not found'
        });
        return;
      }

      res.json({
        success: true,
        data: packagingType
      });
    } catch (error) {
      console.error('Error fetching packaging type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch packaging type'
      });
    }
  }

  // Get packaging type by code
  static async getPackagingTypeByCode(req: AuthRequest, res: Response) {
    try {
      const { code } = req.params;
      
      const packagingType = await PackagingTypeService.getPackagingTypeByCode(
        code,
        req.user!.companyId
      );

      if (!packagingType) {
        res.status(404).json({
          success: false,
          error: 'Packaging type not found'
        });
        return;
      }

      res.json({
        success: true,
        data: packagingType
      });
    } catch (error) {
      console.error('Error fetching packaging type by code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch packaging type'
      });
    }
  }

  // Create packaging type
  static async createPackagingType(req: AuthRequest, res: Response) {
    try {
      const data: CreatePackagingTypeRequest = req.body;

      // Validate required fields
      if (!data.name || !data.code) {
        res.status(400).json({
          success: false,
          error: 'Name and code are required'
        });
        return;
      }

      // Validate dimensions if provided
      if (data.dimensions) {
        if (!data.dimensions.length || !data.dimensions.width || !data.dimensions.height) {
          res.status(400).json({
            success: false,
            error: 'All dimension values (length, width, height) are required'
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

      const packagingType = await PackagingTypeService.createPackagingType(
        data,
        req.user!.companyId,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        data: packagingType
      });
    } catch (error: any) {
      console.error('Error creating packaging type:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create packaging type'
        });
      }
    }
  }

  // Update packaging type
  static async updatePackagingType(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const data: Partial<CreatePackagingTypeRequest> = req.body;

      // Validate dimensions if provided
      if (data.dimensions) {
        if (!data.dimensions.length || !data.dimensions.width || !data.dimensions.height) {
          res.status(400).json({
            success: false,
            error: 'All dimension values (length, width, height) are required'
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

      const packagingType = await PackagingTypeService.updatePackagingType(
        id,
        data,
        req.user!.companyId
      );

      if (!packagingType) {
        res.status(404).json({
          success: false,
          error: 'Packaging type not found'
        });
        return;
      }

      res.json({
        success: true,
        data: packagingType
      });
    } catch (error: any) {
      console.error('Error updating packaging type:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update packaging type'
        });
      }
    }
  }

  // Delete packaging type
  static async deletePackagingType(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await PackagingTypeService.deletePackagingType(
        id,
        req.user!.companyId
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Packaging type not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Packaging type deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting packaging type:', error);
      
      if (error.message.includes('being used')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete packaging type'
        });
      }
    }
  }

  // Calculate volumetric weight
  static async calculateVolumetricWeight(req: Request, res: Response) {
    try {
      const { dimensions, divisor } = req.body;

      if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
        res.status(400).json({
          success: false,
          error: 'Dimensions (length, width, height) are required'
        });
        return;
      }

      if (!['cm', 'inch'].includes(dimensions.unit)) {
        res.status(400).json({
          success: false,
          error: 'Dimension unit must be either "cm" or "inch"'
        });
        return;
      }

      const volumetricWeight = PackagingTypeService.calculateVolumetricWeight(
        dimensions,
        divisor || 5000
      );

      res.json({
        success: true,
        data: {
          volumetric_weight: volumetricWeight,
          unit: 'kg',
          divisor_used: divisor || 5000
        }
      });
    } catch (error) {
      console.error('Error calculating volumetric weight:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate volumetric weight'
      });
    }
  }

  // Suggest packaging
  static async suggestPackaging(req: AuthRequest, res: Response) {
    try {
      const { dimensions, weight, quantity } = req.body;

      if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
        res.status(400).json({
          success: false,
          error: 'Item dimensions (length, width, height) are required'
        });
        return;
      }

      if (!weight || weight <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid item weight is required'
        });
        return;
      }

      const suggestions = await PackagingTypeService.suggestPackaging(
        req.user!.companyId,
        dimensions,
        weight,
        quantity || 1
      );

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Error suggesting packaging:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suggest packaging'
      });
    }
  }

  // Get packaging statistics
  static async getPackagingStats(req: AuthRequest, res: Response) {
    try {
      const stats = await PackagingTypeService.getPackagingStats(
        req.user!.companyId
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching packaging statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch packaging statistics'
      });
    }
  }
}