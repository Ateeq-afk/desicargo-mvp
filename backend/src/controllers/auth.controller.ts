import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { User, JwtPayload } from '../types';

interface TenantRequest extends Request {
  tenantId?: string;
  tenantCode?: string;
}

interface TenantJwtPayload extends JwtPayload {
  tenantId: string;
  tenantCode: string;
}

export const login = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { username, password, tenantCode } = req.body;
    console.log('Login attempt:', { username, tenantCode, passwordLength: password?.length });

    // Extract tenant from subdomain if not provided
    let resolvedTenantCode = tenantCode;
    if (!resolvedTenantCode) {
      const host = req.get('host');
      if (host) {
        const subdomain = host.split('.')[0];
        if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
          resolvedTenantCode = subdomain;
        }
      }
    }

    // Default to demo tenant in development
    if (!resolvedTenantCode && process.env.NODE_ENV === 'development') {
      resolvedTenantCode = 'demo';
    }

    if (!resolvedTenantCode) {
      throw new AppError('Tenant identification required', 400);
    }

    // Get tenant info first
    const tenantResult = await query(
      'SELECT id, is_active FROM tenants WHERE code = $1',
      [resolvedTenantCode]
    );

    if (tenantResult.rows.length === 0) {
      throw new AppError('Invalid tenant', 404);
    }

    const tenant = tenantResult.rows[0];
    if (!tenant.is_active) {
      throw new AppError('Tenant account is inactive', 403);
    }

    // Get user with company and branch info, filtered by tenant
    // SuperAdmins can login to any tenant
    const result = await query(
      `SELECT u.*, c.name as company_name, b.name as branch_name, t.code as tenant_code
       FROM users u
       JOIN companies c ON u.company_id = c.id
       JOIN branches b ON u.branch_id = b.id
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.username = $1 AND u.is_active = true AND (u.tenant_id = $2 OR u.is_superadmin = true)`,
      [username, tenant.id]
    );

    if (result.rows.length === 0) {
      console.log('User not found:', username);
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];
    console.log('Found user:', user.username, 'active:', user.is_active);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens with tenant info
    const payload: TenantJwtPayload = {
      userId: user.id,
      companyId: user.company_id,
      branchId: user.branch_id,
      role: user.role,
      username: user.username,
      tenantId: tenant.id,
      tenantCode: resolvedTenantCode
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' } as jwt.SignOptions
    );

    // Remove password from response
    delete user.password_hash;

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          company_name: user.company_name,
          branch_name: user.branch_name,
          is_superadmin: user.is_superadmin || false
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
    ) as TenantJwtPayload;

    // Verify tenant is still active
    const tenantResult = await query(
      'SELECT is_active FROM tenants WHERE id = $1',
      [decoded.tenantId]
    );

    if (tenantResult.rows.length === 0 || !tenantResult.rows[0].is_active) {
      throw new AppError('Tenant not found or inactive', 403);
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        companyId: decoded.companyId,
        branchId: decoded.branchId,
        role: decoded.role,
        username: decoded.username,
        tenantId: decoded.tenantId,
        tenantCode: decoded.tenantCode
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
    );

    res.json({
      success: true,
      data: { accessToken }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
};

export const me = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const result = await query(
      `SELECT u.*, c.name as company_name, b.name as branch_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       JOIN branches b ON u.branch_id = b.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = result.rows[0];
    delete user.password_hash;

    res.json({
      success: true,
      data: {
        ...user,
        company_name: user.company_name,
        branch_name: user.branch_name,
        is_superadmin: user.is_superadmin || false
      }
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user'
    });
  }
};

export const changePassword = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password'
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // In a production app, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};