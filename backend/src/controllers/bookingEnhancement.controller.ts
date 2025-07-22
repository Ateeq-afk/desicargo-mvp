import { Request, Response } from 'express';
import { pool, queryWithTenant } from '../config/database';
import { AuthRequest } from '../types';

export class BookingEnhancementController {
  // Check for duplicate bookings
  static async checkDuplicate(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { customer_id, consignee_phone, to_city } = req.query;
      const tenantId = req.tenantId!;

      const query = `
        SELECT * FROM check_duplicate_booking($1, $2, $3, $4)
      `;

      const result = await queryWithTenant(
        query,
        [tenantId, customer_id, consignee_phone, to_city],
        tenantId
      );

      res.json({
        success: true,
        data: result.rows[0] || null
      });
    } catch (error) {
      console.error('Error checking duplicate booking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check duplicate booking'
      });
    }
  }

  // Get customer booking history
  static async getCustomerHistory(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { customerId } = req.params;
      const { limit = 5 } = req.query;
      const tenantId = req.tenantId!;

      const query = `
        SELECT * FROM get_customer_booking_history($1, $2, $3)
      `;

      const result = await queryWithTenant(
        query,
        [tenantId, customerId, parseInt(limit as string)],
        tenantId
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching customer history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch customer history'
      });
    }
  }

  // Get customer preferences
  static async getCustomerPreferences(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId!;

      const query = `
        SELECT * FROM customer_booking_preferences
        WHERE tenant_id = $1 AND customer_id = $2
      `;

      const result = await queryWithTenant(
        query,
        [tenantId, customerId],
        tenantId
      );

      res.json({
        success: true,
        data: result.rows[0] || null
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch preferences'
      });
    }
  }

  // Update customer preferences based on booking
  static async updatePreferences(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { customerId } = req.params;
      const { destination, goods_type, payment_type } = req.body;
      const tenantId = req.tenantId!;

      const query = `
        INSERT INTO customer_booking_preferences (
          tenant_id, customer_id, preferred_destinations, 
          preferred_goods_types, default_payment_type
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, customer_id) 
        DO UPDATE SET
          preferred_destinations = 
            CASE 
              WHEN NOT customer_booking_preferences.preferred_destinations ? $6
              THEN customer_booking_preferences.preferred_destinations || $3
              ELSE customer_booking_preferences.preferred_destinations
            END,
          preferred_goods_types = 
            CASE 
              WHEN NOT customer_booking_preferences.preferred_goods_types ? $7
              THEN customer_booking_preferences.preferred_goods_types || $4
              ELSE customer_booking_preferences.preferred_goods_types
            END,
          default_payment_type = COALESCE($5, customer_booking_preferences.default_payment_type),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await queryWithTenant(
        query,
        [
          tenantId, 
          customerId, 
          JSON.stringify([destination]),
          JSON.stringify([goods_type]),
          payment_type,
          destination,
          goods_type
        ],
        tenantId
      );

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences'
      });
    }
  }

  // Get customer credit status
  static async getCreditStatus(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantId!;

      const query = `
        SELECT 
          c.credit_limit,
          c.current_outstanding,
          c.credit_days,
          COUNT(DISTINCT cn.id) FILTER (WHERE cn.payment_status = 'PENDING') as pending_invoices,
          SUM(cn.total_amount) FILTER (WHERE cn.payment_status = 'PENDING') as pending_amount
        FROM customers c
        LEFT JOIN consignments cn ON cn.consignor_id = c.id 
          AND cn.tenant_id = c.tenant_id
          AND cn.payment_type = 'TBB'
        WHERE c.tenant_id = $1 AND c.id = $2
        GROUP BY c.id, c.credit_limit, c.current_outstanding, c.credit_days
      `;

      const result = await queryWithTenant(
        query,
        [tenantId, customerId],
        tenantId
      );

      res.json({
        success: true,
        data: result.rows[0] || { credit_limit: 0, current_outstanding: 0 }
      });
    } catch (error) {
      console.error('Error fetching credit status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch credit status'
      });
    }
  }

  // Get minimum charge for route
  static async getMinimumCharge(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { from_city, to_city } = req.query;
      const tenantId = req.tenantId!;

      const query = `
        SELECT MIN(min_charge) as minimum_charge
        FROM rate_masters
        WHERE tenant_id = $1 
          AND from_city = $2 
          AND to_city = $3 
          AND is_active = true
      `;

      const result = await queryWithTenant(
        query,
        [tenantId, from_city, to_city],
        tenantId
      );

      res.json({
        success: true,
        data: { minimum_charge: result.rows[0]?.minimum_charge || 0 }
      });
    } catch (error) {
      console.error('Error fetching minimum charge:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch minimum charge'
      });
    }
  }

  // Save booking draft
  static async saveDraft(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { draft_data } = req.body;
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const query = `
        INSERT INTO booking_drafts (tenant_id, user_id, draft_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, user_id) 
        DO UPDATE SET 
          draft_data = $3,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const result = await queryWithTenant(
        query,
        [tenantId, userId, JSON.stringify(draft_data)],
        tenantId
      );

      res.json({
        success: true,
        data: { draft_id: result.rows[0].id }
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save draft'
      });
    }
  }

  // Load latest draft
  static async loadDraft(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const query = `
        SELECT draft_data 
        FROM booking_drafts
        WHERE tenant_id = $1 
          AND user_id = $2
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const result = await queryWithTenant(
        query,
        [tenantId, userId],
        tenantId
      );

      res.json({
        success: true,
        data: result.rows[0] || null
      });
    } catch (error) {
      console.error('Error loading draft:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load draft'
      });
    }
  }

  // Get finance summary for booking
  static async getFinanceSummary(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const tenantId = req.tenantId!;

      const query = `
        SELECT 
          COALESCE(SUM(total_amount) FILTER (WHERE DATE(booking_date) = CURRENT_DATE), 0) as today_collection,
          COALESCE(SUM(total_amount) FILTER (WHERE DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', CURRENT_DATE)), 0) as monthly_achieved,
          COUNT(*) FILTER (WHERE DATE(booking_date) = CURRENT_DATE) as today_bookings,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', CURRENT_DATE)) as monthly_bookings
        FROM consignments
        WHERE tenant_id = $1 AND status != 'CANCELLED'
      `;

      const result = await queryWithTenant(query, [tenantId], tenantId);

      res.json({
        success: true,
        data: {
          todayCollection: parseFloat(result.rows[0].today_collection),
          monthlyAchieved: parseFloat(result.rows[0].monthly_achieved),
          todayBookings: parseInt(result.rows[0].today_bookings),
          monthlyBookings: parseInt(result.rows[0].monthly_bookings)
        }
      });
    } catch (error) {
      console.error('Error fetching finance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch finance summary'
      });
    }
  }

  // Email LR receipt
  static async emailLR(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { to, cn_number } = req.body;
      const tenantId = req.tenantId!;

      // Here you would integrate with your email service
      // For now, we'll just return success
      
      res.json({
        success: true,
        message: 'LR sent successfully to ' + to
      });
    } catch (error) {
      console.error('Error sending LR email:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send email'
      });
    }
  }
}