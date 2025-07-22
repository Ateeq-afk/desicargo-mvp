import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

// Generate OGPL Number
const generateOGPLNumber = async (branchId: string): Promise<string> => {
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
    
    // Get the latest OGPL number for this branch and year
    const result = await client.query(
      `SELECT ogpl_number FROM ogpl 
       WHERE from_branch_id = $1 
       AND ogpl_number LIKE $2
       ORDER BY created_at DESC 
       LIMIT 1`,
      [branchId, `OGPL-${branchCode}-${year}%`]
    );
    
    let sequence = 1;
    if (result.rows[0]) {
      const lastNumber = result.rows[0].ogpl_number;
      const lastSequence = parseInt(lastNumber.split('-').pop());
      sequence = lastSequence + 1;
    }
    
    return `OGPL-${branchCode}-${year}${sequence.toString().padStart(4, '0')}`;
  } finally {
    client.release();
  }
};

// Create new OGPL
export const createOGPL = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      from_branch_id,
      to_branch_id,
      vehicle_number,
      driver_name,
      driver_phone,
      seal_number
    } = req.body;
    
    // Validate branches
    if (from_branch_id === to_branch_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'From and To branches cannot be same' 
      });
    }
    
    // Generate OGPL number
    const ogpl_number = await generateOGPLNumber(from_branch_id);
    
    // Create OGPL
    const result = await client.query(
      `INSERT INTO ogpl (
        ogpl_number, from_branch_id, to_branch_id, vehicle_number,
        driver_name, driver_phone, seal_number, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        ogpl_number, from_branch_id, to_branch_id, vehicle_number,
        driver_name, driver_phone, seal_number, 'created', req.user?.userId
      ]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'OGPL created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating OGPL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create OGPL',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Load consignments into OGPL
export const loadConsignments = async (req: AuthRequest, res: Response): Promise<Response | void> => {
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
    
    // Get OGPL details
    const ogplResult = await client.query(
      'SELECT * FROM ogpl WHERE id = $1',
      [id]
    );
    
    if (!ogplResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'OGPL not found' 
      });
    }
    
    const ogpl = ogplResult.rows[0];
    
    if (ogpl.status !== 'created' && ogpl.status !== 'loading') {
      return res.status(400).json({ 
        success: false, 
        message: 'OGPL cannot be modified in current status' 
      });
    }
    
    // Validate consignments
    const consignmentsResult = await client.query(
      `SELECT * FROM consignments 
       WHERE id = ANY($1::uuid[])`,
      [consignment_ids]
    );
    
    const consignments = consignmentsResult.rows;
    const errors = [];
    
    for (const consignment of consignments) {
      if (consignment.status !== 'booked') {
        errors.push(`CN ${consignment.cn_number} is not in booked status`);
      }
      if (consignment.to_branch_id !== ogpl.to_branch_id) {
        errors.push(`CN ${consignment.cn_number} has different destination`);
      }
      if (consignment.current_branch_id !== ogpl.from_branch_id) {
        errors.push(`CN ${consignment.cn_number} is not at current branch`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation errors',
        errors 
      });
    }
    
    // Load consignments
    for (const consignment of consignments) {
      // Add to OGPL consignments
      await client.query(
        `INSERT INTO ogpl_consignments (ogpl_id, consignment_id) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING`,
        [id, consignment.id]
      );
      
      // Update consignment status
      await client.query(
        `UPDATE consignments 
         SET status = 'loaded', 
             ogpl_id = $1,
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
          'loaded',
          ogpl.from_branch_id,
          `Loaded in OGPL ${ogpl.ogpl_number}`,
          req.user?.userId
        ]
      );
    }
    
    // Update OGPL totals
    const totalsResult = await client.query(
      `SELECT 
        COUNT(*) as total_consignments,
        SUM(packages) as total_packages,
        SUM(actual_weight) as total_weight
       FROM consignments 
       WHERE ogpl_id = $1`,
      [id]
    );
    
    const totals = totalsResult.rows[0];
    
    await client.query(
      `UPDATE ogpl 
       SET total_consignments = $1,
           total_packages = $2,
           total_weight = $3,
           status = 'loading',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        totals.total_consignments,
        totals.total_packages,
        totals.total_weight,
        id
      ]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `${consignments.length} consignments loaded successfully`,
      data: {
        loaded: consignments.length,
        totals
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error loading consignments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load consignments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Get OGPL list
export const getOGPLList = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { status, branch_id, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT o.*, 
             fb.name as from_branch_name,
             tb.name as to_branch_name,
             u.username as created_by_name
      FROM ogpl o
      LEFT JOIN branches fb ON o.from_branch_id = fb.id
      LEFT JOIN branches tb ON o.to_branch_id = tb.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (status) {
      query += ` AND o.status = $${++paramCount}`;
      params.push(status);
    }
    
    if (branch_id) {
      query += ` AND (o.from_branch_id = $${++paramCount} OR o.to_branch_id = $${paramCount})`;
      params.push(branch_id);
    }
    
    query += ` ORDER BY o.created_at DESC`;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM ogpl o WHERE 1=1`;
    const countParams: any[] = [];
    paramCount = 0;
    
    if (status) {
      countQuery += ` AND o.status = $${++paramCount}`;
      countParams.push(status);
    }
    
    if (branch_id) {
      countQuery += ` AND (o.from_branch_id = $${++paramCount} OR o.to_branch_id = $${paramCount})`;
      countParams.push(branch_id);
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
    console.error('Error fetching OGPL list:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch OGPL list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get OGPL details
export const getOGPLDetails = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { ogplNumber } = req.params;
    
    // Get OGPL details
    const ogplResult = await pool.query(
      `SELECT o.*, 
              fb.name as from_branch_name, fb.address as from_branch_address,
              tb.name as to_branch_name, tb.address as to_branch_address,
              u.username as created_by_name
       FROM ogpl o
       LEFT JOIN branches fb ON o.from_branch_id = fb.id
       LEFT JOIN branches tb ON o.to_branch_id = tb.id
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.ogpl_number = $1`,
      [ogplNumber]
    );
    
    if (!ogplResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'OGPL not found' 
      });
    }
    
    const ogpl = ogplResult.rows[0];
    
    // Get loaded consignments
    const consignmentsResult = await pool.query(
      `SELECT c.*, 
              fb.name as from_branch_name,
              tb.name as to_branch_name
       FROM consignments c
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       WHERE c.ogpl_id = $1
       ORDER BY c.cn_number`,
      [ogpl.id]
    );
    
    res.json({
      success: true,
      data: {
        ...ogpl,
        consignments: consignmentsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching OGPL details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch OGPL details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Depart OGPL
export const departOGPL = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get OGPL
    const ogplResult = await client.query(
      'SELECT * FROM ogpl WHERE id = $1',
      [id]
    );
    
    if (!ogplResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'OGPL not found' 
      });
    }
    
    const ogpl = ogplResult.rows[0];
    
    if (ogpl.status !== 'loading' && ogpl.status !== 'ready') {
      return res.status(400).json({ 
        success: false, 
        message: 'OGPL is not ready for departure' 
      });
    }
    
    if (ogpl.total_consignments === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No consignments loaded in OGPL' 
      });
    }
    
    // Update OGPL status
    await client.query(
      `UPDATE ogpl 
       SET status = 'departed',
           departure_time = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
    
    // Update consignments status
    await client.query(
      `UPDATE consignments 
       SET status = 'intransit',
           updated_at = CURRENT_TIMESTAMP
       WHERE ogpl_id = $1`,
      [id]
    );
    
    // Add tracking for all consignments
    await client.query(
      `INSERT INTO consignment_tracking (consignment_id, status, branch_id, description, created_by)
       SELECT c.id, 'intransit', $1, $2, $3
       FROM consignments c
       WHERE c.ogpl_id = $4`,
      [
        ogpl.from_branch_id,
        `Departed in OGPL ${ogpl.ogpl_number} to ${ogpl.to_branch_name || 'destination'}`,
        req.user?.userId,
        id
      ]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'OGPL departed successfully',
      data: {
        ogpl_number: ogpl.ogpl_number,
        departure_time: new Date()
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error departing OGPL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to depart OGPL',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Get pending departure OGPLs
export const getPendingDeparture = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
              fb.name as from_branch_name,
              tb.name as to_branch_name,
              u.username as created_by_name
       FROM ogpl o
       LEFT JOIN branches fb ON o.from_branch_id = fb.id
       LEFT JOIN branches tb ON o.to_branch_id = tb.id
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.status IN ('loading', 'ready')
       AND o.from_branch_id = $1
       ORDER BY o.created_at DESC`,
      [req.user?.branchId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching pending OGPLs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending OGPLs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get available consignments for loading
export const getAvailableConsignments = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { to_branch_id } = req.query;
    
    let query = `
      SELECT c.*, 
             fb.name as from_branch_name,
             tb.name as to_branch_name
      FROM consignments c
      LEFT JOIN branches fb ON c.from_branch_id = fb.id
      LEFT JOIN branches tb ON c.to_branch_id = tb.id
      WHERE c.status = 'booked'
      AND c.current_branch_id = $1
    `;
    
    const params: any[] = [req.user?.branchId];
    
    if (to_branch_id) {
      query += ` AND c.to_branch_id = $2`;
      params.push(to_branch_id);
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