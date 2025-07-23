import { Request, Response } from 'express';
import { queryWithTenant, withTenantTransaction } from '../config/database';
import { TenantAuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';
import { v4 as uuidv4 } from 'uuid';

// Get all branches (filtered by role)
export const getBranches = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user, branchId } = req;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    let query = `
      SELECT 
        b.id,
        b.branch_code,
        b.name,
        b.address,
        b.city,
        b.state,
        b.pincode,
        b.phone,
        b.email,
        b.is_head_office,
        b.is_active,
        b.created_at,
        COUNT(DISTINCT u.id) as user_count
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id AND u.is_active = true
      WHERE b.is_active = true
    `;
    
    const params: any[] = [];
    
    // Non-admin users can only see their own branch
    if (user?.role !== 'admin' && user?.role !== 'superadmin' && branchId) {
      query += ' AND b.id = $1';
      params.push(branchId);
    }
    
    query += ' GROUP BY b.id ORDER BY b.is_head_office DESC, b.name ASC';

    const result = await queryWithTenant(query, params, tenantId);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get branches error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch branches';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Get branch by ID
export const getBranchById = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user, branchId } = req;
    const { id } = req.params;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Non-admin users can only see their own branch
    if (user?.role !== 'admin' && user?.role !== 'superadmin' && id !== branchId) {
      throw new AppError('Access denied', 403);
    }

    const query = `
      SELECT 
        b.*,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.booking_date) = CURRENT_DATE) as today_bookings,
        COALESCE(SUM(c.total_amount) FILTER (WHERE DATE(c.booking_date) = CURRENT_DATE), 0) as today_revenue
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id AND u.is_active = true
      LEFT JOIN consignments c ON b.id = c.from_branch_id AND c.status != 'cancelled'
      WHERE b.id = $1
      GROUP BY b.id
    `;

    const result = await queryWithTenant(query, [id], tenantId);

    if (result.rows.length === 0) {
      throw new AppError('Branch not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get branch by ID error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch branch';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Create new branch (admin only)
export const createBranch = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    const { 
      branch_code,
      name,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      is_head_office
    } = req.body;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Only admins can create branches
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      throw new AppError('Access denied', 403);
    }

    const branchId = uuidv4();

    const result = await withTenantTransaction(tenantId, async (client) => {
      // Check if branch code already exists
      const existingBranch = await client.query(
        'SELECT id FROM branches WHERE branch_code = $1 AND tenant_id = $2',
        [branch_code, tenantId]
      );

      if (existingBranch.rows.length > 0) {
        throw new AppError('Branch code already exists', 400);
      }

      // If setting as head office, unset current head office
      if (is_head_office) {
        await client.query(
          'UPDATE branches SET is_head_office = false WHERE tenant_id = $1 AND is_head_office = true',
          [tenantId]
        );
      }

      // Create branch
      const insertResult = await client.query(
        `INSERT INTO branches (
          id, tenant_id, branch_code, name, address, city, state, 
          pincode, phone, email, is_head_office, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        RETURNING *`,
        [
          branchId, tenantId, branch_code, name, address, city, state,
          pincode, phone, email, is_head_office || false
        ]
      );

      return insertResult.rows[0];
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Create branch error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to create branch';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Update branch (admin only)
export const updateBranch = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    const { id } = req.params;
    const updates = req.body;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Only admins can update branches
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      throw new AppError('Access denied', 403);
    }

    const result = await withTenantTransaction(tenantId, async (client) => {
      // Check if branch exists
      const existingBranch = await client.query(
        'SELECT * FROM branches WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (existingBranch.rows.length === 0) {
        throw new AppError('Branch not found', 404);
      }

      // If updating branch code, check for duplicates
      if (updates.branch_code) {
        const duplicateCheck = await client.query(
          'SELECT id FROM branches WHERE branch_code = $1 AND tenant_id = $2 AND id != $3',
          [updates.branch_code, tenantId, id]
        );

        if (duplicateCheck.rows.length > 0) {
          throw new AppError('Branch code already exists', 400);
        }
      }

      // If setting as head office, unset current head office
      if (updates.is_head_office === true) {
        await client.query(
          'UPDATE branches SET is_head_office = false WHERE tenant_id = $1 AND is_head_office = true AND id != $2',
          [tenantId, id]
        );
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      const allowedFields = [
        'branch_code', 'name', 'address', 'city', 'state', 
        'pincode', 'phone', 'email', 'is_head_office', 'is_active'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = $${paramCount++}`);
          updateValues.push(updates[field]);
        }
      }

      if (updateFields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      const updateResult = await client.query(
        `UPDATE branches 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
         RETURNING *`,
        [...updateValues, id, tenantId]
      );

      return updateResult.rows[0];
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Update branch error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to update branch';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Get branch statistics
export const getBranchStats = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user, branchId } = req;
    const { id } = req.params;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Non-admin users can only see their own branch stats
    if (user?.role !== 'admin' && user?.role !== 'superadmin' && id !== branchId) {
      throw new AppError('Access denied', 403);
    }

    const stats = await queryWithTenant(
      `SELECT 
        -- Today's stats
        COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.booking_date) = CURRENT_DATE) as today_bookings,
        COALESCE(SUM(c.total_amount) FILTER (WHERE DATE(c.booking_date) = CURRENT_DATE), 0) as today_revenue,
        
        -- This month's stats
        COUNT(DISTINCT c.id) FILTER (WHERE DATE_TRUNC('month', c.booking_date) = DATE_TRUNC('month', CURRENT_DATE)) as month_bookings,
        COALESCE(SUM(c.total_amount) FILTER (WHERE DATE_TRUNC('month', c.booking_date) = DATE_TRUNC('month', CURRENT_DATE)), 0) as month_revenue,
        
        -- Pending deliveries
        COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('booked', 'in_transit', 'reached_destination')) as pending_deliveries,
        
        -- Active OGPL
        COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('loaded', 'in_transit')) as active_ogpl,
        
        -- Staff count
        COUNT(DISTINCT u.id) as total_staff,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'manager') as managers,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'operator') as operators
        
       FROM branches b
       LEFT JOIN consignments c ON (b.id = c.from_branch_id OR b.id = c.to_branch_id) AND c.status != 'cancelled'
       LEFT JOIN ogpl o ON (b.id = o.from_branch_id OR b.id = o.to_branch_id)
       LEFT JOIN users u ON b.id = u.branch_id AND u.is_active = true
       WHERE b.id = $1
       GROUP BY b.id`,
      [id],
      tenantId
    );

    res.json({
      success: true,
      data: stats.rows[0] || {}
    });
  } catch (error) {
    console.error('Get branch stats error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch branch statistics';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Delete branch (soft delete, admin only)
export const deleteBranch = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    const { id } = req.params;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Only admins can delete branches
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      throw new AppError('Access denied', 403);
    }

    const result = await withTenantTransaction(tenantId, async (client) => {
      // Check if branch exists
      const branchResult = await client.query(
        'SELECT * FROM branches WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (branchResult.rows.length === 0) {
        throw new AppError('Branch not found', 404);
      }

      const branch = branchResult.rows[0];

      // Cannot delete head office
      if (branch.is_head_office) {
        throw new AppError('Cannot delete head office branch', 400);
      }

      // Check if branch has active users
      const activeUsers = await client.query(
        'SELECT COUNT(*) as count FROM users WHERE branch_id = $1 AND is_active = true',
        [id]
      );

      if (parseInt(activeUsers.rows[0].count) > 0) {
        throw new AppError('Cannot delete branch with active users', 400);
      }

      // Soft delete
      await client.query(
        'UPDATE branches SET is_active = false WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return { id, deleted: true };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Delete branch error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to delete branch';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};