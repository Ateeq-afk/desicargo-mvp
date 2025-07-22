import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
      return;
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
      return;
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Token verification failed' 
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
      return;
    }

    next();
  };
};

export const checkCompanyAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const companyId = req.params.companyId || req.body.company_id;
  
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
    return;
  }

  if (req.user.role !== 'superadmin' && req.user.companyId !== companyId) {
    res.status(403).json({ 
      success: false, 
      error: 'Access denied to this company data' 
    });
    return;
  }

  next();
};

export const checkBranchAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const branchId = req.params.branchId || req.body.branch_id;
  
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
    return;
  }

  // Superadmin and admin can access all branches
  if (['superadmin', 'admin'].includes(req.user.role)) {
    next();
    return;
  }

  // Others can only access their own branch
  if (req.user.branchId !== branchId) {
    res.status(403).json({ 
      success: false, 
      error: 'Access denied to this branch data' 
    });
    return;
  }

  next();
};