import { Request, Response } from 'express';
import { RateService } from '../services/rate.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantAuthRequest } from '../types';
import { queryWithTenant } from '../config/database';

export class RateController {
  // Get customer-specific rates with fallback to base rates
  static async getCustomerRatesWithFallback(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      const { customer_id } = req.params;
      const { from_city, to_city, goods_type } = req.query;

      if (!customer_id || !from_city || !to_city || !goods_type) {
        res.status(400).json({
          success: false,
          error: 'Customer ID, from city, to city, and goods type are required'
        });
        return;
      }

      // First, check for customer-specific rates
      const customerRates = await queryWithTenant(
        `SELECT 
          r.id, r.customer_id, r.from_city, r.to_city, r.goods_type,
          r.special_rate as rate_per_kg, r.min_charge, r.effective_from, r.effective_to,
          'customer_specific' as rate_type,
          c.name as customer_name
        FROM customer_rates r
        JOIN customers c ON r.customer_id = c.id
        WHERE r.customer_id = $2
          AND r.tenant_id = $1
          AND LOWER(r.from_city) = LOWER($3)
          AND LOWER(r.to_city) = LOWER($4) 
          AND LOWER(r.goods_type) = LOWER($5)
          AND r.is_active = true
          AND (r.effective_from IS NULL OR r.effective_from <= CURRENT_DATE)
          AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
        ORDER BY r.created_at DESC
        LIMIT 1`,
        [req.tenantId!, customer_id, from_city, to_city, goods_type],
        req.tenantId!
      );

      let selectedRate = customerRates.rows[0];
      let rateSource = 'customer_specific';

      // If no customer-specific rate, fall back to base rates
      if (!selectedRate) {
        const baseRates = await queryWithTenant(
          `SELECT 
            r.id, r.from_city, r.to_city, r.goods_type,
            r.rate_per_kg, r.min_charge,
            'base' as rate_type,
            'Standard Rate' as customer_name
          FROM rate_master r
          WHERE r.tenant_id = $1
            AND LOWER(r.from_city) = LOWER($2)
            AND LOWER(r.to_city) = LOWER($3)
            AND LOWER(r.goods_type) = LOWER($4)
            AND r.is_active = true
          ORDER BY r.created_at DESC
          LIMIT 1`,
          [req.tenantId!, from_city, to_city, goods_type],
          req.tenantId!
        );

        selectedRate = baseRates.rows[0];
        rateSource = 'base';
      }

      if (!selectedRate) {
        res.status(404).json({
          success: false,
          error: 'No rates found for this route and goods type'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ...selectedRate,
          rate_source: rateSource,
          has_customer_rate: rateSource === 'customer_specific'
        }
      });
    } catch (error) {
      console.error('Error fetching customer rates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customer rates'
      });
    }
  }

  // Calculate freight with customer-specific or base rates
  static async calculateFreightForCustomer(req: TenantAuthRequest, res: Response): Promise<void> {
    try {
      const { customer_id, from_city, to_city, goods_type, weight, packages = 1 } = req.body;

      if (!customer_id || !from_city || !to_city || !goods_type || !weight) {
        res.status(400).json({
          success: false,
          error: 'Customer ID, from city, to city, goods type, and weight are required'
        });
        return;
      }

      // Get the best rate for this customer
      const rateQuery = await queryWithTenant(
        `-- First, try to get customer-specific rate
        SELECT 
          r.special_rate as rate_per_kg, r.min_charge, 'customer_specific' as rate_type,
          c.name as customer_name, r.effective_from, r.effective_to
        FROM customer_rates r
        JOIN customers c ON r.customer_id = c.id
        WHERE r.customer_id = $2 
          AND r.tenant_id = $1
          AND LOWER(r.from_city) = LOWER($3)
          AND LOWER(r.to_city) = LOWER($4) 
          AND LOWER(r.goods_type) = LOWER($5)
          AND r.is_active = true
          AND (r.effective_from IS NULL OR r.effective_from <= CURRENT_DATE)
          AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE)
        
        UNION ALL
        
        -- Fallback to base rate if no customer rate
        SELECT 
          r.rate_per_kg, r.min_charge, 'base' as rate_type,
          'Standard Rate' as customer_name, NULL as effective_from, NULL as effective_to
        FROM rate_master r
        WHERE r.tenant_id = $1
          AND LOWER(r.from_city) = LOWER($3)
          AND LOWER(r.to_city) = LOWER($4)
          AND LOWER(r.goods_type) = LOWER($5)
          AND r.is_active = true
        
        ORDER BY 
          CASE WHEN rate_type = 'customer_specific' THEN 1 ELSE 2 END,
          effective_from DESC
        LIMIT 1`,
        [req.tenantId!, customer_id, from_city, to_city, goods_type],
        req.tenantId!
      );

      if (!rateQuery.rows[0]) {
        res.status(404).json({
          success: false,
          error: 'No rates found for this route and goods type'
        });
        return;
      }

      const rate = rateQuery.rows[0];
      const weightBased = parseFloat(weight) * parseFloat(rate.rate_per_kg);
      const minCharge = parseFloat(rate.min_charge || 0);
      const freightAmount = Math.max(weightBased, minCharge);

      // Calculate potential savings if using customer rate
      let savings = 0;
      let savingsPercentage = 0;
      
      if (rate.rate_type === 'customer_specific') {
        // Get base rate to calculate savings
        const baseRateQuery = await queryWithTenant(
          `SELECT rate_per_kg, min_charge FROM rate_master
           WHERE tenant_id = $1
             AND LOWER(from_city) = LOWER($2)
             AND LOWER(to_city) = LOWER($3)
             AND LOWER(goods_type) = LOWER($4)
             AND is_active = true
           LIMIT 1`,
          [req.tenantId!, from_city, to_city, goods_type],
          req.tenantId!
        );

        if (baseRateQuery.rows[0]) {
          const baseRate = baseRateQuery.rows[0];
          const baseAmount = Math.max(
            parseFloat(weight) * parseFloat(baseRate.rate_per_kg),
            parseFloat(baseRate.min_charge || 0)
          );
          savings = baseAmount - freightAmount;
          savingsPercentage = baseAmount > 0 ? (savings / baseAmount) * 100 : 0;
        }
      }

      res.json({
        success: true,
        data: {
          rate: {
            rate_per_kg: parseFloat(rate.rate_per_kg),
            min_charge: parseFloat(rate.min_charge || 0),
            rate_type: rate.rate_type,
            customer_name: rate.customer_name
          },
          calculation: {
            weight: parseFloat(weight),
            packages: parseInt(packages),
            weight_based_amount: weightBased,
            min_charge: minCharge,
            freight_amount: freightAmount,
            savings: Math.max(0, savings),
            savings_percentage: Math.max(0, savingsPercentage)
          },
          route: {
            from_city,
            to_city,
            goods_type
          }
        }
      });
    } catch (error) {
      console.error('Error calculating freight for customer:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate freight'
      });
    }
  }

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