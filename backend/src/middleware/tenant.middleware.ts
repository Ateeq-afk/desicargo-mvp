import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

interface TenantRequest extends Request {
  tenantId?: string;
  tenantCode?: string;
  userId?: string;
  userRole?: string;
}

interface JwtPayload {
  userId: string;
  tenantId: string;
  tenantCode?: string;
  role?: string;
}

export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    let tenantId: string | undefined;
    let tenantCode: string | undefined;

    // 1. Try to extract tenant from subdomain
    const host = req.get('host');
    if (host) {
      const subdomain = host.split('.')[0];
      // Check if this is a subdomain (not localhost, not IP)
      if (subdomain && subdomain !== 'localhost' && subdomain !== 'www' && !/^\d+\.\d+\.\d+\.\d+/.test(host)) {
        tenantCode = subdomain;
      }
    }

    // 2. Try to extract tenant from Authorization header (JWT)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JwtPayload;
        tenantId = decoded.tenantId;
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        
        // If we got tenantCode from subdomain, verify it matches the token
        if (tenantCode && decoded.tenantCode && tenantCode !== decoded.tenantCode) {
          return res.status(403).json({
            success: false,
            message: 'Tenant mismatch between subdomain and authentication'
          });
        }
      } catch (error) {
        // Invalid token, but continue - might be a public route
      }
    }

    // 3. Try to extract tenant from query parameter (for API testing)
    if (!tenantId && !tenantCode) {
      tenantCode = req.query.tenant as string;
    }

    // 4. Try to extract tenant from X-Tenant-Code header (for API clients)
    if (!tenantId && !tenantCode) {
      tenantCode = req.header('X-Tenant-Code');
    }

    // 5. If we have tenantCode but not tenantId, look it up
    if (tenantCode && !tenantId) {
      const result = await pool.query(
        'SELECT id, is_active FROM tenants WHERE tenant_code = $1',
        [tenantCode]
      );
      
      if (result.rows.length > 0) {
        const tenant = result.rows[0];
        if (!tenant.is_active) {
          return res.status(403).json({
            success: false,
            message: 'Tenant account is inactive'
          });
        }
        tenantId = tenant.id;
      }
    }

    // 6. For development/testing, use default tenant if no tenant found
    if (!tenantId && process.env.NODE_ENV === 'development') {
      // Use demo tenant for development
      const demoResult = await pool.query(
        'SELECT id FROM tenants WHERE tenant_code = $1',
        ['demo']
      );
      if (demoResult.rows.length > 0) {
        tenantId = demoResult.rows[0].id;
        tenantCode = 'demo';
      }
    }

    // 7. Validate tenant is required for this route
    const publicPaths = [
      '/api/tenants/register',
      '/api/auth/login',
      '/api/health',
      '/api/public',
      '/api/onboarding/send-otp',
      '/api/onboarding/verify-otp',
      '/api/onboarding/signup'
    ];
    
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    
    if (!tenantId && !isPublicPath) {
      return res.status(400).json({
        success: false,
        message: 'Tenant identification required. Please provide tenant via subdomain, header, or query parameter.'
      });
    }

    // 8. Set tenant context in PostgreSQL session for RLS
    if (tenantId) {
      const client = await pool.connect();
      try {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantId]);
        
        // Attach tenant info to request
        req.tenantId = tenantId;
        req.tenantCode = tenantCode;
        
        // Store client on request for use in controllers
        (req as any).dbClient = client;
      } catch (error) {
        client.release();
        throw error;
      }
    }

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing tenant information'
    });
  }
};

// Middleware to release database client after request
export const releaseTenantConnection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.on('finish', () => {
    const client = (req as any).dbClient;
    if (client) {
      client.release();
    }
  });
  next();
};

// Helper middleware for routes that require authenticated tenant
export const requireTenant = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.tenantId) {
    return res.status(401).json({
      success: false,
      message: 'Tenant authentication required'
    });
  }
  next();
};

// Helper middleware for routes that require specific roles
export const requireRole = (roles: string[]) => {
  return (req: TenantRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

export default tenantMiddleware;