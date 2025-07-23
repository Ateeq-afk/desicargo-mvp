import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool, query, withTransaction, initializeTenantSequences } from '../config/database';
import { AppError } from '../middleware/error.middleware';

interface TenantRequest extends Request {
  tenantId?: string;
  tenantCode?: string;
}

// Create new tenant - self-service registration
export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tenantCode,
      companyName,
      contactEmail,
      contactPhone,
      adminUsername,
      adminPassword,
      adminFullName,
      adminEmail,
      adminPhone,
      branchName,
      branchCity,
      branchState,
      branchAddress,
      planType = 'trial'
    } = req.body;

    // Validate required fields
    if (!tenantCode || !companyName || !contactEmail || !adminUsername || !adminPassword) {
      throw new AppError('Missing required fields', 400);
    }

    // Validate tenant code format (alphanumeric, lowercase, no spaces)
    if (!/^[a-z0-9-]+$/.test(tenantCode)) {
      throw new AppError('Tenant code must be lowercase alphanumeric with hyphens only', 400);
    }

    // Check if tenant code already exists
    const existingTenant = await query(
      'SELECT id FROM tenants WHERE code = $1',
      [tenantCode]
    );

    if (existingTenant.rows.length > 0) {
      throw new AppError('Tenant code already exists', 409);
    }

    // Check if username already exists across all tenants
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1',
      [adminUsername]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Username already exists', 409);
    }

    // Create tenant, company, branch, and admin user in a transaction
    const result = await withTransaction(async (client) => {
      // 1. Create tenant
      const tenantId = uuidv4();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30-day trial

      await client.query(
        `INSERT INTO tenants (
          id, code, name, email, phone,
          subscription_plan, subscription_ends_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tenantId, tenantCode, companyName, contactEmail, contactPhone,
          planType, planType === 'trial' ? trialEndsAt : null
        ]
      );

      // 2. Create company
      const companyId = uuidv4();
      await client.query(
        `INSERT INTO companies (
          id, tenant_id, name, email, phone, subscription_plan
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [companyId, tenantId, companyName, contactEmail, contactPhone, planType]
      );

      // 3. Create default branch
      const branchId = uuidv4();
      const branchCode = tenantCode.toUpperCase().substring(0, 3) + '001';
      
      await client.query(
        `INSERT INTO branches (
          id, tenant_id, company_id, branch_code, name, 
          address, city, state, phone, email, is_head_office
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          branchId, tenantId, companyId, branchCode,
          branchName || 'Head Office',
          branchAddress || '',
          branchCity || '',
          branchState || '',
          contactPhone,
          contactEmail,
          true
        ]
      );

      // 4. Create admin user
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await client.query(
        `INSERT INTO users (
          id, tenant_id, company_id, branch_id, username, password_hash,
          full_name, role, phone, email, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId, tenantId, companyId, branchId, adminUsername, hashedPassword,
          adminFullName || 'Admin User', 'admin',
          adminPhone || contactPhone,
          adminEmail || contactEmail,
          true
        ]
      );

      // 5. Initialize tenant sequences
      await initializeTenantSequences(tenantId, tenantCode);

      // 6. Create default data (optional)
      // Add default goods types, expense categories, etc.

      return {
        tenantId,
        tenantCode,
        companyId,
        branchId,
        userId
      };
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: {
        tenantId: result.tenantId,
        tenantCode: result.tenantCode,
        loginUrl: `https://${tenantCode}.desicargo.in`,
        credentials: {
          username: adminUsername,
          note: 'Please save these credentials securely'
        }
      }
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tenant'
    });
  }
};

// Get tenant information by code
export const getTenantInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const result = await query(
      `SELECT 
        id, code as tenant_code, name as company_name, email as contact_email,
        subscription_plan as plan_type, subscription_ends_at as trial_ends_at, is_active, created_at
       FROM tenants 
       WHERE code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      throw new AppError('Tenant not found', 404);
    }

    const tenant = result.rows[0];

    // Don't expose sensitive info
    res.json({
      success: true,
      data: {
        tenantCode: tenant.tenant_code,
        companyName: tenant.company_name,
        isActive: tenant.is_active,
        branding: {
          logoUrl: tenant.logo_url,
          primaryColor: tenant.primary_color,
          secondaryColor: tenant.secondary_color
        }
      }
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tenant info'
    });
  }
};

// Update tenant settings (admin only)
export const updateTenant = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantId) {
      throw new AppError('Tenant authentication required', 401);
    }

    const {
      companyName,
      contactEmail,
      contactPhone,
      logoUrl,
      primaryColor,
      secondaryColor
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (companyName) {
      updates.push(`company_name = $${paramCount++}`);
      values.push(companyName);
    }
    if (contactEmail) {
      updates.push(`contact_email = $${paramCount++}`);
      values.push(contactEmail);
    }
    if (contactPhone) {
      updates.push(`contact_phone = $${paramCount++}`);
      values.push(contactPhone);
    }
    if (logoUrl !== undefined) {
      updates.push(`logo_url = $${paramCount++}`);
      values.push(logoUrl);
    }
    if (primaryColor) {
      updates.push(`primary_color = $${paramCount++}`);
      values.push(primaryColor);
    }
    if (secondaryColor) {
      updates.push(`secondary_color = $${paramCount++}`);
      values.push(secondaryColor);
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.tenantId);

    await query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.json({
      success: true,
      message: 'Tenant settings updated successfully'
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tenant'
    });
  }
};

// Get tenant usage statistics
export const getTenantStats = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenantId) {
      throw new AppError('Tenant authentication required', 401);
    }

    // Get tenant limits
    const tenantResult = await query(
      `SELECT plan_type, max_users, max_branches, max_consignments_per_month, trial_ends_at
       FROM tenants WHERE id = $1`,
      [req.tenantId]
    );

    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant not found', 404);
    }

    const tenant = tenantResult.rows[0];

    // Get current usage
    const [users, branches, consignments, customers, vehicles] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1', [req.tenantId]),
      query('SELECT COUNT(*) as count FROM branches WHERE tenant_id = $1', [req.tenantId]),
      query(
        `SELECT COUNT(*) as count FROM consignments 
         WHERE tenant_id = $1 AND booking_date >= DATE_TRUNC('month', CURRENT_DATE)`,
        [req.tenantId]
      ),
      query('SELECT COUNT(*) as count FROM customers WHERE tenant_id = $1', [req.tenantId]),
      query('SELECT COUNT(*) as count FROM vehicles WHERE tenant_id = $1', [req.tenantId])
    ]);

    // Calculate monthly revenue
    const revenueResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue
       FROM consignments
       WHERE tenant_id = $1 
       AND booking_date >= DATE_TRUNC('month', CURRENT_DATE)
       AND status != 'cancelled'`,
      [req.tenantId]
    );

    res.json({
      success: true,
      data: {
        plan: {
          type: tenant.plan_type,
          trialEndsAt: tenant.trial_ends_at,
          limits: {
            users: tenant.max_users,
            branches: tenant.max_branches,
            consignmentsPerMonth: tenant.max_consignments_per_month
          }
        },
        usage: {
          users: parseInt(users.rows[0].count),
          branches: parseInt(branches.rows[0].count),
          consignmentsThisMonth: parseInt(consignments.rows[0].count),
          totalCustomers: parseInt(customers.rows[0].count),
          totalVehicles: parseInt(vehicles.rows[0].count),
          revenueThisMonth: parseFloat(revenueResult.rows[0].revenue)
        }
      }
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tenant stats'
    });
  }
};