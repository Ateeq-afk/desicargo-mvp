import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { JwtPayload } from '../types';

interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const superAdminOnly = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if user is superadmin
    const userQuery = 'SELECT is_superadmin FROM users WHERE id = $1';
    const result = await pool.query(userQuery, [req.user.userId]);

    if (result.rows.length === 0 || !result.rows[0].is_superadmin) {
      // Log unauthorized access attempt
      const logQuery = `
        INSERT INTO superadmin_logs (user_id, action, details, ip_address)
        VALUES ($1, $2, $3, $4)
      `;
      
      await pool.query(logQuery, [
        req.user.userId,
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        JSON.stringify({ 
          path: req.path, 
          method: req.method,
          user_role: req.user.role 
        }),
        req.ip
      ]);

      res.status(403).json({ 
        error: 'SuperAdmin access required',
        message: 'This action requires superadmin privileges'
      });
      return;
    }

    // Log superadmin access
    const accessLogQuery = `
      INSERT INTO superadmin_logs (user_id, action, details, ip_address)
      VALUES ($1, $2, $3, $4)
    `;
    
    await pool.query(accessLogQuery, [
      req.user.userId,
      'API_ACCESS',
      JSON.stringify({ 
        path: req.path, 
        method: req.method 
      }),
      req.ip
    ]);

    next();
  } catch (error) {
    console.error('SuperAdmin middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Middleware to check if current session is an impersonation
export const checkImpersonation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // If this is an impersonation session, add warning header
  if (req.user && (req.user as any).is_impersonation) {
    res.setHeader('X-Impersonation-Active', 'true');
    res.setHeader('X-SuperAdmin-Id', (req.user as any).superadmin_id || '');
  }
  next();
};

// Rate limiting for superadmin endpoints
export const superAdminRateLimit = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Implement rate limiting logic here if needed
  // For now, we'll just pass through
  next();
};