import { pool } from '../config/database';
import { 
  RateMaster, 
  CustomerRateMaster, 
  CreateRateRequest, 
  CreateCustomerRateRequest,
  RateCalculationRequest,
  RateCalculationResponse,
  RateHistory,
  RateApproval
} from '../models/rate.model';
import { v4 as uuidv4 } from 'uuid';

export class RateService {
  // Get all rates for a company
  static async getRates(company_id: string, is_active?: boolean, goods_type?: string) {
    let query = `
      SELECT * FROM rate_master 
      WHERE company_id = $1
    `;
    const params: any[] = [company_id];

    if (is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(is_active);
    }

    if (goods_type) {
      query += ` AND LOWER(goods_type) = LOWER($${params.length + 1})`;
      params.push(goods_type);
    }

    query += ` ORDER BY from_city, to_city, goods_type ASC`;

    const result = await pool.query<RateMaster>(query, params);
    return result.rows;
  }

  // Get rate for specific route and goods type
  static async getRateByRoute(company_id: string, from_city: string, to_city: string, goods_type: string) {
    const query = `
      SELECT * FROM rate_master 
      WHERE company_id = $1 
      AND LOWER(from_city) = LOWER($2)
      AND LOWER(to_city) = LOWER($3)
      AND LOWER(goods_type) = LOWER($4)
      AND is_active = true
    `;
    const result = await pool.query<RateMaster>(query, [company_id, from_city, to_city, goods_type]);
    return result.rows[0];
  }

  // Get all rates for a specific route (all goods types)
  static async getRatesForRoute(company_id: string, from_city: string, to_city: string) {
    const query = `
      SELECT * FROM rate_master 
      WHERE company_id = $1 
      AND LOWER(from_city) = LOWER($2)
      AND LOWER(to_city) = LOWER($3)
      AND is_active = true
      ORDER BY goods_type ASC
    `;
    const result = await pool.query<RateMaster>(query, [company_id, from_city, to_city]);
    return result.rows;
  }

  // Create new rate
  static async createRate(data: CreateRateRequest, company_id: string, user_id: string) {
    const query = `
      INSERT INTO rate_master (
        id, company_id, from_city, to_city, goods_type, rate_per_kg, 
        min_charge, is_active, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      uuidv4(),
      company_id,
      data.from_city,
      data.to_city,
      data.goods_type,
      data.rate_per_kg,
      data.min_charge || 0,
      true,
      user_id
    ];

    const result = await pool.query<RateMaster>(query, values);
    return result.rows[0];
  }

  // Update rate
  static async updateRate(id: string, data: Partial<CreateRateRequest>, company_id: string) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.from_city !== undefined) {
      updateFields.push(`from_city = $${paramCount++}`);
      values.push(data.from_city);
    }

    if (data.to_city !== undefined) {
      updateFields.push(`to_city = $${paramCount++}`);
      values.push(data.to_city);
    }

    if (data.goods_type !== undefined) {
      updateFields.push(`goods_type = $${paramCount++}`);
      values.push(data.goods_type);
    }

    if (data.rate_per_kg !== undefined) {
      updateFields.push(`rate_per_kg = $${paramCount++}`);
      values.push(data.rate_per_kg);
    }

    if (data.min_charge !== undefined) {
      updateFields.push(`min_charge = $${paramCount++}`);
      values.push(data.min_charge);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, company_id);

    const query = `
      UPDATE rate_master 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query<RateMaster>(query, values);
    return result.rows[0];
  }

  // Delete rate
  static async deleteRate(id: string, company_id: string) {
    const query = `
      UPDATE rate_master 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query<RateMaster>(query, [id, company_id]);
    return result.rows[0];
  }

  // Get customer specific rates
  static async getCustomerRates(customer_id: string, company_id: string) {
    const query = `
      SELECT * FROM customer_rate_master 
      WHERE customer_id = $1 AND company_id = $2 AND is_active = true
      ORDER BY from_city, to_city, goods_type ASC
    `;
    const result = await pool.query<CustomerRateMaster>(query, [customer_id, company_id]);
    return result.rows;
  }

  // Get customer rate for specific route and goods
  static async getCustomerRateByRoute(customer_id: string, from_city: string, to_city: string, goods_type: string) {
    const query = `
      SELECT * FROM customer_rate_master 
      WHERE customer_id = $1 
      AND LOWER(from_city) = LOWER($2)
      AND LOWER(to_city) = LOWER($3)
      AND LOWER(goods_type) = LOWER($4)
      AND is_active = true
    `;
    const result = await pool.query<CustomerRateMaster>(query, [customer_id, from_city, to_city, goods_type]);
    return result.rows[0];
  }

  // Create customer specific rate
  static async createCustomerRate(data: CreateCustomerRateRequest, company_id: string, user_id: string) {
    const query = `
      INSERT INTO customer_rate_master (
        id, customer_id, company_id, from_city, to_city, goods_type,
        special_rate, min_charge, is_active, created_by, 
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      uuidv4(),
      data.customer_id,
      company_id,
      data.from_city,
      data.to_city,
      data.goods_type,
      data.special_rate,
      data.min_charge || 0,
      true,
      user_id
    ];

    const result = await pool.query<CustomerRateMaster>(query, values);
    return result.rows[0];
  }

  // Calculate rates for a route (returns all available rates)
  static async calculateRates(data: RateCalculationRequest, company_id: string): Promise<RateCalculationResponse> {
    const response: RateCalculationResponse = {};

    // Get default rate
    const defaultRate = await this.getRateByRoute(company_id, data.from_city, data.to_city, data.goods_type);
    if (defaultRate) {
      const total = Math.max(
        data.weight * defaultRate.rate_per_kg,
        defaultRate.min_charge
      );
      response.default_rate = {
        rate_per_kg: defaultRate.rate_per_kg,
        min_charge: defaultRate.min_charge,
        total: total
      };
    }

    // Get customer specific rate if customer_id provided
    if (data.customer_id) {
      const customerRate = await this.getCustomerRateByRoute(
        data.customer_id, 
        data.from_city, 
        data.to_city,
        data.goods_type
      );
      if (customerRate) {
        const total = Math.max(
          data.weight * customerRate.special_rate,
          customerRate.min_charge
        );
        response.customer_rate = {
          rate_per_kg: customerRate.special_rate,
          min_charge: customerRate.min_charge,
          total: total
        };
      }
    }

    // Manual rate calculation is handled on frontend
    return response;
  }

  // Save rate history
  static async saveRateHistory(
    consignment_id: string,
    rate_type: 'default' | 'customer' | 'manual',
    from_city: string,
    to_city: string,
    goods_type: string,
    applied_rate: number,
    weight: number,
    total_amount: number,
    user_id: string
  ) {
    const query = `
      INSERT INTO rate_history (
        id, consignment_id, rate_type, from_city, to_city, goods_type,
        applied_rate, weight, total_amount, entered_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      uuidv4(),
      consignment_id,
      rate_type,
      from_city,
      to_city,
      goods_type,
      applied_rate,
      weight,
      total_amount,
      user_id
    ];

    const result = await pool.query<RateHistory>(query, values);
    return result.rows[0];
  }

  // Get rate history for consignment
  static async getRateHistory(consignment_id: string) {
    const query = `
      SELECT rh.*, u.name as entered_by_name
      FROM rate_history rh
      LEFT JOIN users u ON rh.entered_by = u.id
      WHERE rh.consignment_id = $1
      ORDER BY rh.created_at DESC
    `;
    const result = await pool.query(query, [consignment_id]);
    return result.rows;
  }

  // Get rate comparison for a route
  static async getRateComparison(company_id: string, from_city: string, to_city: string) {
    const query = `
      SELECT 
        rm.goods_type,
        rm.rate_per_kg as standard_rate,
        rm.min_charge as standard_min_charge,
        COUNT(DISTINCT crm.customer_id) as customer_rates_count,
        MIN(crm.special_rate) as lowest_customer_rate,
        MAX(crm.special_rate) as highest_customer_rate
      FROM rate_master rm
      LEFT JOIN customer_rate_master crm 
        ON rm.from_city = crm.from_city 
        AND rm.to_city = crm.to_city 
        AND rm.goods_type = crm.goods_type
        AND crm.is_active = true
      WHERE rm.company_id = $1
        AND LOWER(rm.from_city) = LOWER($2)
        AND LOWER(rm.to_city) = LOWER($3)
        AND rm.is_active = true
      GROUP BY rm.goods_type, rm.rate_per_kg, rm.min_charge
      ORDER BY rm.goods_type
    `;
    
    const result = await pool.query(query, [company_id, from_city, to_city]);
    return result.rows;
  }

  // Bulk upload rates
  static async bulkUploadRates(rates: CreateRateRequest[], company_id: string, user_id: string) {
    const client = await pool.connect();
    const results: RateMaster[] = [];

    try {
      await client.query('BEGIN');

      for (const rate of rates) {
        const query = `
          INSERT INTO rate_master (
            id, company_id, from_city, to_city, goods_type, rate_per_kg, 
            min_charge, is_active, created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          ) ON CONFLICT (company_id, from_city, to_city, goods_type) 
          DO UPDATE SET 
            rate_per_kg = EXCLUDED.rate_per_kg,
            min_charge = EXCLUDED.min_charge,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const values = [
          uuidv4(),
          company_id,
          rate.from_city,
          rate.to_city,
          rate.goods_type,
          rate.rate_per_kg,
          rate.min_charge || 0,
          true,
          user_id
        ];

        const result = await client.query<RateMaster>(query, values);
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Copy rates from one route to another
  static async copyRate(
    sourceFromCity: string,
    sourceToCity: string,
    sourceGoodsType: string,
    destFromCity: string,
    destToCity: string,
    company_id: string,
    user_id: string
  ) {
    const sourceRate = await this.getRateByRoute(company_id, sourceFromCity, sourceToCity, sourceGoodsType);
    if (!sourceRate) {
      throw new Error('Source rate not found');
    }

    return this.createRate({
      from_city: destFromCity,
      to_city: destToCity,
      goods_type: sourceGoodsType,
      rate_per_kg: sourceRate.rate_per_kg,
      min_charge: sourceRate.min_charge
    }, company_id, user_id);
  }

  // Create rate approval request
  static async createRateApproval(
    consignment_id: string,
    requested_rate: number,
    standard_rate: number | null,
    reason: string | null,
    user_id: string
  ) {
    const query = `
      INSERT INTO rate_approvals (
        id, consignment_id, requested_rate, standard_rate, 
        reason, requested_by, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'pending', 
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      uuidv4(),
      consignment_id,
      requested_rate,
      standard_rate,
      reason,
      user_id
    ];

    const result = await pool.query<RateApproval>(query, values);
    return result.rows[0];
  }

  // Get pending rate approvals
  static async getPendingApprovals(company_id: string) {
    const query = `
      SELECT ra.*, c.cn_no, u1.name as requested_by_name
      FROM rate_approvals ra
      JOIN consignments c ON ra.consignment_id = c.id
      JOIN users u1 ON ra.requested_by = u1.id
      WHERE c.company_id = $1 AND ra.status = 'pending'
      ORDER BY ra.created_at DESC
    `;
    const result = await pool.query(query, [company_id]);
    return result.rows;
  }

  // Approve/Reject rate
  static async updateApprovalStatus(
    approval_id: string,
    status: 'approved' | 'rejected',
    approved_by: string
  ) {
    const query = `
      UPDATE rate_approvals 
      SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query<RateApproval>(query, [status, approved_by, approval_id]);
    return result.rows[0];
  }
}