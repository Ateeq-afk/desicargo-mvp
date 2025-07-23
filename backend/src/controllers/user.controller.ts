import { Request, Response } from 'express';
import { queryWithTenant, withTenantTransaction } from '../config/database';
import { TenantAuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Get all users (branch-aware)
export const getUsers = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Build query based on user role
    let query = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.branch_id,
        b.name as branch_name,
        u.is_active,
        u.created_at,
        u.last_login
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.is_active = true
    `;
    
    const params: any[] = [];
    
    // Non-admin users can only see users from their branch
    if (user?.role !== 'admin' && user?.role !== 'superadmin' && req.branchId) {
      query += ' AND u.branch_id = $1';
      params.push(req.branchId);
    }
    
    query += ' ORDER BY u.created_at DESC';

    const result = await queryWithTenant(query, params, tenantId);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Get user by ID
export const getUserById = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    const { id } = req.params;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    const query = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.branch_id,
        b.name as branch_name,
        u.is_active,
        u.created_at,
        u.last_login
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = $1
    `;

    const result = await queryWithTenant(query, [id], tenantId);

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const targetUser = result.rows[0];

    // Check if user can access this user's data
    if (user?.role !== 'admin' && user?.role !== 'superadmin' && 
        targetUser.branch_id !== req.branchId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: targetUser
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Create new user
export const createUser = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    const { 
      username, 
      password, 
      full_name, 
      email, 
      phone, 
      role, 
      branch_id
    } = req.body;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Only admins can create users
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      throw new AppError('Access denied', 403);
    }

    // Non-superadmins can only create users for their own branch
    if (user?.role !== 'superadmin' && branch_id !== req.branchId) {
      throw new AppError('Cannot create users for other branches', 403);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const result = await withTenantTransaction(tenantId, async (client) => {
      // Check if username already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1 AND tenant_id = $2',
        [username, tenantId]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('Username already exists', 400);
      }

      // Create user
      const insertResult = await client.query(
        `INSERT INTO users (
          id, username, password_hash, full_name, email, phone, 
          role, branch_id, tenant_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING id, username, full_name, email, phone, role, branch_id`,
        [
          userId, username, hashedPassword, full_name, email, phone,
          role, branch_id, tenantId
        ]
      );

      return insertResult.rows[0];
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Create user error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to create user';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Update user
export const updateUser = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    const { id } = req.params;
    const { 
      full_name, 
      email, 
      phone, 
      role, 
      branch_id,
      is_active 
    } = req.body;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Only admins can update users
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      throw new AppError('Access denied', 403);
    }

    const result = await withTenantTransaction(tenantId, async (client) => {
      // Get current user data
      const currentUserResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (currentUserResult.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const currentUser = currentUserResult.rows[0];

      // Non-superadmins can only update users in their branch
      if (user?.role !== 'superadmin' && currentUser.branch_id !== req.branchId) {
        throw new AppError('Cannot update users from other branches', 403);
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (full_name !== undefined) {
        updateFields.push(`full_name = $${paramCount++}`);
        updateValues.push(full_name);
      }
      if (email !== undefined) {
        updateFields.push(`email = $${paramCount++}`);
        updateValues.push(email);
      }
      if (phone !== undefined) {
        updateFields.push(`phone = $${paramCount++}`);
        updateValues.push(phone);
      }
      if (role !== undefined && user?.role === 'superadmin') {
        updateFields.push(`role = $${paramCount++}`);
        updateValues.push(role);
      }
      if (branch_id !== undefined && user?.role === 'superadmin') {
        updateFields.push(`branch_id = $${paramCount++}`);
        updateValues.push(branch_id);
      }
      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(is_active);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateResult = await client.query(
        `UPDATE users 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
         RETURNING id, username, full_name, email, phone, role, branch_id, is_active`,
        [...updateValues, id, tenantId]
      );

      return updateResult.rows[0];
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Update user error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to update user';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Delete user (soft delete)
export const deleteUser = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    const { id } = req.params;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Only admins can delete users
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      throw new AppError('Access denied', 403);
    }

    // Cannot delete self
    if (id === user?.userId) {
      throw new AppError('Cannot delete your own account', 400);
    }

    const result = await withTenantTransaction(tenantId, async (client) => {
      // Get user data
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const targetUser = userResult.rows[0];

      // Non-superadmins can only delete users in their branch
      if (user?.role !== 'superadmin' && targetUser.branch_id !== req.branchId) {
        throw new AppError('Cannot delete users from other branches', 403);
      }

      // Soft delete
      await client.query(
        'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      return { id, deleted: true };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Change user password
export const changePassword = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, user } = req;
    const { id } = req.params;
    const { current_password, new_password } = req.body;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Users can change their own password, admins can change others
    if (id !== user?.userId && user?.role !== 'admin' && user?.role !== 'superadmin') {
      throw new AppError('Access denied', 403);
    }

    const result = await withTenantTransaction(tenantId, async (client) => {
      // Get user data
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const targetUser = userResult.rows[0];

      // If changing own password, verify current password
      if (id === user?.userId) {
        const isValidPassword = await bcrypt.compare(current_password, targetUser.password_hash);
        if (!isValidPassword) {
          throw new AppError('Current password is incorrect', 400);
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3',
        [hashedPassword, id, tenantId]
      );

      return { id, password_changed: true };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Change password error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to change password';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};