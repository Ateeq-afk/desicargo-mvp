import { Request, Response } from 'express';
import { RateService } from '../services/rate.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class RateController {
  // Get all rates
  static async getRates(req: AuthRequest, res: Response) {
    try {
      const { is_active } = req.query;
      const rates = await RateService.getRates(
        req.user!.companyId,
        is_active !== undefined ? is_active === 'true' : undefined
      );

      res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      console.error('Error fetching rates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rates'
      });
    }
  }

  // Get rate by route
  static async getRateByRoute(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { from_city, to_city, goods_type } = req.query;

      if (!from_city || !to_city || !goods_type) {
        return res.status(400).json({
          success: false,
          error: 'From city, to city, and goods type are required'
        });
      }

      const rate = await RateService.getRateByRoute(
        req.user!.companyId,
        from_city as string,
        to_city as string,
        goods_type as string
      );

      res.json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Error fetching rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rate'
      });
    }
  }

  // Get all rates for a route (all goods types)
  static async getRatesForRoute(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { from_city, to_city } = req.query;

      if (!from_city || !to_city) {
        return res.status(400).json({
          success: false,
          error: 'From city and to city are required'
        });
      }

      const rates = await RateService.getRatesForRoute(
        req.user!.companyId,
        from_city as string,
        to_city as string
      );

      res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      console.error('Error fetching rates for route:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rates for route'
      });
    }
  }

  // Get rate comparison for a route
  static async getRateComparison(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { from_city, to_city } = req.query;

      if (!from_city || !to_city) {
        return res.status(400).json({
          success: false,
          error: 'From city and to city are required'
        });
      }

      const comparison = await RateService.getRateComparison(
        req.user!.companyId,
        from_city as string,
        to_city as string
      );

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error fetching rate comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rate comparison'
      });
    }
  }

  // Create rate
  static async createRate(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { from_city, to_city, goods_type, rate_per_kg, min_charge } = req.body;

      if (!from_city || !to_city || !goods_type || !rate_per_kg) {
        return res.status(400).json({
          success: false,
          error: 'From city, to city, goods type, and rate per kg are required'
        });
      }

      const rate = await RateService.createRate(
        { from_city, to_city, goods_type, rate_per_kg, min_charge },
        req.user!.companyId,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Error creating rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create rate'
      });
    }
  }

  // Update rate
  static async updateRate(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { from_city, to_city, goods_type, rate_per_kg, min_charge } = req.body;

      const rate = await RateService.updateRate(
        id,
        { from_city, to_city, goods_type, rate_per_kg, min_charge },
        req.user!.companyId
      );

      if (!rate) {
        return res.status(404).json({
          success: false,
          error: 'Rate not found'
        });
      }

      res.json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Error updating rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update rate'
      });
    }
  }

  // Delete rate
  static async deleteRate(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const rate = await RateService.deleteRate(id, req.user!.companyId);

      if (!rate) {
        return res.status(404).json({
          success: false,
          error: 'Rate not found'
        });
      }

      res.json({
        success: true,
        message: 'Rate deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete rate'
      });
    }
  }

  // Get customer rates
  static async getCustomerRates(req: AuthRequest, res: Response) {
    try {
      const { customer_id } = req.params;
      const rates = await RateService.getCustomerRates(customer_id, req.user!.companyId);

      res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      console.error('Error fetching customer rates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer rates'
      });
    }
  }

  // Create customer rate
  static async createCustomerRate(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { customer_id, from_city, to_city, goods_type, special_rate, min_charge } = req.body;

      if (!customer_id || !from_city || !to_city || !goods_type || !special_rate) {
        return res.status(400).json({
          success: false,
          error: 'Customer ID, from city, to city, goods type, and special rate are required'
        });
      }

      const rate = await RateService.createCustomerRate(
        { customer_id, from_city, to_city, goods_type, special_rate, min_charge },
        req.user!.companyId,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Error creating customer rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create customer rate'
      });
    }
  }

  // Calculate rates
  static async calculateRates(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { from_city, to_city, goods_type, weight, customer_id } = req.body;

      if (!from_city || !to_city || !goods_type || !weight) {
        return res.status(400).json({
          success: false,
          error: 'From city, to city, goods type, and weight are required'
        });
      }

      const rates = await RateService.calculateRates(
        { from_city, to_city, goods_type, weight, customer_id },
        req.user!.companyId
      );

      res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      console.error('Error calculating rates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate rates'
      });
    }
  }

  // Save rate history
  static async saveRateHistory(req: AuthRequest, res: Response) {
    try {
      const {
        consignment_id,
        rate_type,
        from_city,
        to_city,
        goods_type,
        applied_rate,
        weight,
        total_amount
      } = req.body;

      const history = await RateService.saveRateHistory(
        consignment_id,
        rate_type,
        from_city,
        to_city,
        goods_type,
        applied_rate,
        weight,
        total_amount,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error saving rate history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save rate history'
      });
    }
  }

  // Get rate history
  static async getRateHistory(req: AuthRequest, res: Response) {
    try {
      const { consignment_id } = req.params;
      const history = await RateService.getRateHistory(consignment_id);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching rate history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rate history'
      });
    }
  }

  // Bulk upload rates
  static async bulkUploadRates(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { rates } = req.body;

      if (!rates || !Array.isArray(rates)) {
        return res.status(400).json({
          success: false,
          error: 'Rates array is required'
        });
      }

      const results = await RateService.bulkUploadRates(
        rates,
        req.user!.companyId,
        req.user!.userId
      );

      res.json({
        success: true,
        data: {
          uploaded: results.length,
          rates: results
        }
      });
    } catch (error) {
      console.error('Error uploading rates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload rates'
      });
    }
  }

  // Copy rate
  static async copyRate(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { source_from, source_to, source_goods_type, dest_from, dest_to } = req.body;

      if (!source_from || !source_to || !source_goods_type || !dest_from || !dest_to) {
        return res.status(400).json({
          success: false,
          error: 'All route parameters and goods type are required'
        });
      }

      const rate = await RateService.copyRate(
        source_from,
        source_to,
        source_goods_type,
        dest_from,
        dest_to,
        req.user!.companyId,
        req.user!.userId
      );

      res.json({
        success: true,
        data: rate
      });
    } catch (error) {
      console.error('Error copying rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to copy rate'
      });
    }
  }

  // Get pending approvals
  static async getPendingApprovals(req: AuthRequest, res: Response) {
    try {
      const approvals = await RateService.getPendingApprovals(req.user!.companyId);

      res.json({
        success: true,
        data: approvals
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending approvals'
      });
    }
  }

  // Approve/Reject rate
  static async updateApprovalStatus(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Valid status is required (approved/rejected)'
        });
      }

      const approval = await RateService.updateApprovalStatus(
        id,
        status,
        req.user!.userId
      );

      res.json({
        success: true,
        data: approval
      });
    } catch (error) {
      console.error('Error updating approval status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update approval status'
      });
    }
  }
}