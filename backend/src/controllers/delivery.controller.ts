import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

// Generate Delivery Run Number
const generateRunNumber = async (branchId: string): Promise<string> => {
  const client = await pool.connect();
  try {
    // Get branch code
    const branchResult = await client.query(
      'SELECT code FROM branches WHERE id = $1',
      [branchId]
    );
    
    if (!branchResult.rows[0]) {
      throw new Error('Branch not found');
    }
    
    const branchCode = branchResult.rows[0].code;
    const year = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];
    
    // Get the latest run number for this branch and date
    const result = await client.query(
      `SELECT run_number FROM delivery_runs 
       WHERE branch_id = $1 
       AND DATE(created_at) = $2
       AND run_number LIKE $3
       ORDER BY created_at DESC 
       LIMIT 1`,
      [branchId, today, `DLR-${branchCode}-${year}%`]
    );
    
    let sequence = 1;
    if (result.rows[0]) {
      const lastNumber = result.rows[0].run_number;
      const lastSequence = parseInt(lastNumber.split('-').pop());
      sequence = lastSequence + 1;
    }
    
    return `DLR-${branchCode}-${year}${sequence.toString().padStart(4, '0')}`;
  } finally {
    client.release();
  }
};

// Create new delivery run
export const createDeliveryRun = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      branch_id,
      delivery_boy_name,
      delivery_boy_phone,
      vehicle_number,
      area
    } = req.body;
    
    // Generate run number
    const run_number = await generateRunNumber(branch_id || req.user?.branchId);
    
    // Create delivery run
    const result = await client.query(
      `INSERT INTO delivery_runs (
        run_number, branch_id, delivery_boy_name, delivery_boy_phone,
        vehicle_number, area, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        run_number, 
        branch_id || req.user?.branchId,
        delivery_boy_name, 
        delivery_boy_phone,
        vehicle_number, 
        area, 
        'active', 
        req.user?.userId
      ]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Delivery run created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating delivery run:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create delivery run',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Assign consignments to delivery run
export const assignConsignments = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { consignment_ids } = req.body;
    
    if (!Array.isArray(consignment_ids) || consignment_ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No consignments provided' 
      });
    }
    
    // Get delivery run details
    const runResult = await client.query(
      'SELECT * FROM delivery_runs WHERE id = $1',
      [id]
    );
    
    if (!runResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Delivery run not found' 
      });
    }
    
    const deliveryRun = runResult.rows[0];
    
    // Validate consignments
    const consignmentsResult = await client.query(
      `SELECT * FROM consignments 
       WHERE id = ANY($1::uuid[])`,
      [consignment_ids]
    );
    
    const consignments = consignmentsResult.rows;
    const errors = [];
    
    for (const consignment of consignments) {
      if (consignment.status !== 'reached') {
        errors.push(`CN ${consignment.cn_number} has not reached destination branch`);
      }
      if (consignment.current_branch_id !== deliveryRun.branch_id) {
        errors.push(`CN ${consignment.cn_number} is not at delivery branch`);
      }
      if (consignment.delivery_status === 'delivered') {
        errors.push(`CN ${consignment.cn_number} is already delivered`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation errors',
        errors 
      });
    }
    
    // Assign consignments to delivery run
    for (const consignment of consignments) {
      // Add to delivery run consignments
      await client.query(
        `INSERT INTO delivery_run_consignments (delivery_run_id, consignment_id) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`,
        [id, consignment.id]
      );
      
      // Update consignment status
      await client.query(
        `UPDATE consignments 
         SET status = 'out_for_delivery', 
             delivery_run_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [id, consignment.id]
      );
      
      // Add tracking entry
      await client.query(
        `INSERT INTO consignment_tracking (
          consignment_id, status, branch_id, description, created_by
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          consignment.id,
          'out_for_delivery',
          deliveryRun.branch_id,
          `Out for delivery - ${deliveryRun.delivery_boy_name}`,
          req.user?.userId
        ]
      );
    }
    
    // Update delivery run totals
    const totalsResult = await client.query(
      `SELECT 
        COUNT(*) as total_consignments,
        SUM(packages) as total_packages,
        SUM(total_amount) as total_amount
       FROM consignments 
       WHERE delivery_run_id = $1`,
      [id]
    );
    
    const totals = totalsResult.rows[0];
    
    await client.query(
      `UPDATE delivery_runs 
       SET total_consignments = $1,
           total_packages = $2,
           total_amount = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        totals.total_consignments,
        totals.total_packages,
        totals.total_amount,
        id
      ]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `${consignments.length} consignments assigned successfully`,
      data: {
        assigned: consignments.length,
        totals
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning consignments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign consignments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Update delivery status
export const updateDeliveryStatus = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      consignment_id,
      delivery_status,
      delivered_to,
      receiver_phone,
      delivery_photo,
      signature_image,
      undelivered_reason,
      otp,
      latitude,
      longitude
    } = req.body;
    
    // Validate delivery status
    if (!['delivered', 'undelivered', 'partial'].includes(delivery_status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid delivery status' 
      });
    }
    
    // Get consignment details
    const consignmentResult = await client.query(
      'SELECT * FROM consignments WHERE id = $1 AND delivery_run_id = $2',
      [consignment_id, id]
    );
    
    if (!consignmentResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consignment not found in this delivery run' 
      });
    }
    
    const consignment = consignmentResult.rows[0];
    
    // Update consignment
    if (delivery_status === 'delivered') {
      await client.query(
        `UPDATE consignments 
         SET status = 'delivered',
             delivery_status = 'delivered',
             delivered_to = $1,
             receiver_phone = $2,
             delivery_photo = $3,
             signature_image = $4,
             delivery_date = CURRENT_TIMESTAMP,
             delivery_latitude = $5,
             delivery_longitude = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [
          delivered_to,
          receiver_phone,
          delivery_photo,
          signature_image,
          latitude,
          longitude,
          consignment_id
        ]
      );
    } else {
      await client.query(
        `UPDATE consignments 
         SET delivery_status = $1,
             undelivered_reason = $2,
             delivery_attempt_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          delivery_status,
          undelivered_reason,
          consignment_id
        ]
      );
    }
    
    // Add tracking entry
    await client.query(
      `INSERT INTO consignment_tracking (
        consignment_id, status, branch_id, description, created_by
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        consignment_id,
        delivery_status === 'delivered' ? 'delivered' : 'undelivered',
        consignment.to_branch_id,
        delivery_status === 'delivered' 
          ? `Delivered to ${delivered_to}` 
          : `Undelivered - ${undelivered_reason}`,
        req.user?.userId
      ]
    );
    
    // Update delivery run progress
    const progressResult = await client.query(
      `SELECT 
        COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered_count,
        COUNT(*) as total_count
       FROM consignments 
       WHERE delivery_run_id = $1`,
      [id]
    );
    
    const progress = progressResult.rows[0];
    const completionPercentage = (progress.delivered_count / progress.total_count) * 100;
    
    await client.query(
      `UPDATE delivery_runs 
       SET delivered_count = $1,
           completion_percentage = $2,
           status = CASE 
             WHEN $2 = 100 THEN 'completed'
             ELSE 'active'
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [progress.delivered_count, completionPercentage, id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Consignment ${delivery_status} successfully`,
      data: {
        consignment_id,
        delivery_status,
        progress: {
          delivered: progress.delivered_count,
          total: progress.total_count,
          percentage: completionPercentage
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating delivery status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update delivery status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Get delivery run list
export const getDeliveryRunList = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { status, date, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT dr.*, 
             b.name as branch_name,
             u.username as created_by_name
      FROM delivery_runs dr
      LEFT JOIN branches b ON dr.branch_id = b.id
      LEFT JOIN users u ON dr.created_by = u.id
      WHERE dr.branch_id = $1
    `;
    
    const params: any[] = [req.user?.branchId];
    let paramCount = 1;
    
    if (status) {
      query += ` AND dr.status = $${++paramCount}`;
      params.push(status);
    }
    
    if (date) {
      query += ` AND DATE(dr.created_at) = $${++paramCount}`;
      params.push(date);
    }
    
    query += ` ORDER BY dr.created_at DESC`;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM delivery_runs dr 
      WHERE dr.branch_id = $1
    `;
    const countParams: any[] = [req.user?.branchId];
    paramCount = 1;
    
    if (status) {
      countQuery += ` AND dr.status = $${++paramCount}`;
      countParams.push(status);
    }
    
    if (date) {
      countQuery += ` AND DATE(dr.created_at) = $${++paramCount}`;
      countParams.push(date);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching delivery runs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch delivery runs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get delivery run details
export const getDeliveryRunDetails = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    
    // Get delivery run details
    const runResult = await pool.query(
      `SELECT dr.*, 
              b.name as branch_name,
              u.username as created_by_name
       FROM delivery_runs dr
       LEFT JOIN branches b ON dr.branch_id = b.id
       LEFT JOIN users u ON dr.created_by = u.id
       WHERE dr.id = $1`,
      [id]
    );
    
    if (!runResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Delivery run not found' 
      });
    }
    
    const deliveryRun = runResult.rows[0];
    
    // Get assigned consignments
    const consignmentsResult = await pool.query(
      `SELECT c.*, 
              fb.name as from_branch_name,
              tb.name as to_branch_name
       FROM consignments c
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       WHERE c.delivery_run_id = $1
       ORDER BY c.cn_number`,
      [deliveryRun.id]
    );
    
    res.json({
      success: true,
      data: {
        ...deliveryRun,
        consignments: consignmentsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching delivery run details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch delivery run details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get active delivery runs
export const getActiveDeliveryRuns = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT dr.*, 
              b.name as branch_name,
              COUNT(c.id) FILTER (WHERE c.delivery_status = 'delivered') as delivered_count
       FROM delivery_runs dr
       LEFT JOIN branches b ON dr.branch_id = b.id
       LEFT JOIN consignments c ON c.delivery_run_id = dr.id
       WHERE dr.branch_id = $1
       AND dr.status = 'active'
       AND DATE(dr.created_at) = $2
       GROUP BY dr.id, b.name
       ORDER BY dr.created_at DESC`,
      [req.user?.branchId, today]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching active delivery runs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch active delivery runs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Verify OTP for delivery
export const verifyDeliveryOTP = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { consignment_id, otp } = req.body;
    
    // Get consignment details
    const result = await pool.query(
      'SELECT * FROM consignments WHERE id = $1',
      [consignment_id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consignment not found' 
      });
    }
    
    const consignment = result.rows[0];
    
    // Verify OTP (simplified - in production, use proper OTP service)
    const expectedOTP = consignment.consignee_phone?.slice(-6) || '123456';
    
    if (otp !== expectedOTP) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        consignment_id,
        verified: true
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get available consignments for delivery
export const getAvailableConsignments = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { area } = req.query;
    
    let query = `
      SELECT c.*, 
             fb.name as from_branch_name,
             tb.name as to_branch_name
      FROM consignments c
      LEFT JOIN branches fb ON c.from_branch_id = fb.id
      LEFT JOIN branches tb ON c.to_branch_id = tb.id
      WHERE c.status = 'reached'
      AND c.current_branch_id = $1
      AND (c.delivery_status IS NULL OR c.delivery_status != 'delivered')
    `;
    
    const params: any[] = [req.user?.branchId];
    
    if (area) {
      query += ` AND c.consignee_address ILIKE $2`;
      params.push(`%${area}%`);
    }
    
    query += ` ORDER BY c.booking_date ASC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching available consignments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch available consignments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};