import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { User, JwtPayload } from '../types';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, passwordLength: password?.length });

    // Get user with company and branch info
    const result = await query(
      `SELECT u.*, c.name as company_name, b.name as branch_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       JOIN branches b ON u.branch_id = b.id
       WHERE u.username = $1 AND u.is_active = true`,
      [username]
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

    // Generate tokens
    const payload: JwtPayload = {
      userId: user.id,
      companyId: user.company_id,
      branchId: user.branch_id,
      role: user.role,
      username: user.username
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
          branch_name: user.branch_name
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
    ) as JwtPayload;

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        companyId: decoded.companyId,
        branchId: decoded.branchId,
        role: decoded.role,
        username: decoded.username
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
        branch_name: user.branch_name
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