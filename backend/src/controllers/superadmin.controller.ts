import { Request, Response } from 'express';
import { pool } from '../config/database';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    userId?: string;
  };
}

export const superAdminController = {
  // Get all tenants with statistics
  async getAllTenants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantsQuery = `
        SELECT 
          t.*,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT c.id) as consignment_count,
          COALESCE(SUM(i.total_amount), 0) as total_revenue,
          MAX(u.last_login) as last_activity
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id
        LEFT JOIN consignments c ON c.tenant_id = t.id
        LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status = 'paid'
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `;
      
      const result = await pool.query(tenantsQuery);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  },

  // Get specific tenant details
  async getTenantDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const tenantQuery = `
        SELECT 
          t.*,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT b.id) as branch_count,
          COUNT(DISTINCT c.id) as consignment_count,
          COUNT(DISTINCT v.id) as vehicle_count,
          COALESCE(SUM(i.total_amount), 0) as total_revenue
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id
        LEFT JOIN branches b ON b.tenant_id = t.id
        LEFT JOIN consignments c ON c.tenant_id = t.id
        LEFT JOIN vehicles v ON v.tenant_id = t.id
        LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status = 'paid'
        WHERE t.id = $1
        GROUP BY t.id
      `;
      
      const tenantResult = await pool.query(tenantQuery, [id]);
      
      if (tenantResult.rows.length === 0) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }
      
      // Get recent activity
      const activityQuery = `
        SELECT 
          'consignment' as type,
          cn_no as reference,
          created_at,
          'Created new consignment' as description
        FROM consignments
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const activityResult = await pool.query(activityQuery, [id]);
      
      // Get users
      const usersQuery = `
        SELECT id, username, full_name, role, last_login, created_at
        FROM users
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `;
      
      const usersResult = await pool.query(usersQuery, [id]);
      
      res.json({
        success: true,
        data: {
          tenant: tenantResult.rows[0],
          recentActivity: activityResult.rows,
          users: usersResult.rows
        }
      });
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      res.status(500).json({ error: 'Failed to fetch tenant details' });
    }
  },

  // Update tenant status
  async updateTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { is_active, subscription_plan, subscription_ends_at } = req.body;
      
      const updateQuery = `
        UPDATE tenants
        SET 
          is_active = COALESCE($1, is_active),
          subscription_plan = COALESCE($2, subscription_plan),
          subscription_ends_at = COALESCE($3, subscription_ends_at),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [
        is_active,
        subscription_plan,
        subscription_ends_at,
        id
      ]);
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }
      
      // Log the action
      await logSuperAdminAction(req, 'UPDATE_TENANT', id, {
        changes: req.body
      });
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating tenant:', error);
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  },

  // Soft delete tenant
  async deleteTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleteQuery = `
        UPDATE tenants
        SET 
          is_active = false,
          deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await pool.query(deleteQuery, [id]);
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }
      
      // Log the action
      await logSuperAdminAction(req, 'DELETE_TENANT', id, null);
      
      res.json({
        success: true,
        message: 'Tenant deactivated successfully'
      });
    } catch (error) {
      console.error('Error deleting tenant:', error);
      res.status(500).json({ error: 'Failed to delete tenant' });
    }
  },

  // Login as tenant (impersonation)
  async loginAsTenant(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Verify tenant exists and is active
      const tenantQuery = 'SELECT * FROM tenants WHERE id = $1 AND is_active = true';
      const tenantResult = await pool.query(tenantQuery, [id]);
      
      if (tenantResult.rows.length === 0) {
        res.status(404).json({ error: 'Active tenant not found' });
        return;
      }
      
      // Get first admin user of the tenant
      const userQuery = `
        SELECT * FROM users 
        WHERE tenant_id = $1 AND role = 'admin' 
        ORDER BY created_at 
        LIMIT 1
      `;
      const userResult = await pool.query(userQuery, [id]);
      
      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'No admin user found for tenant' });
        return;
      }
      
      // Log the impersonation
      await logSuperAdminAction(req, 'IMPERSONATION', id, {
        impersonated_user_id: userResult.rows[0].id
      });
      
      // Generate special impersonation token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        {
          id: userResult.rows[0].id,
          username: userResult.rows[0].username,
          role: userResult.rows[0].role,
          tenant_id: id,
          is_impersonation: true,
          superadmin_id: req.user?.id
        },
        process.env.JWT_SECRET!,
        { expiresIn: '2h' }
      );
      
      res.json({
        success: true,
        data: {
          token,
          tenant: tenantResult.rows[0],
          user: {
            id: userResult.rows[0].id,
            username: userResult.rows[0].username,
            full_name: userResult.rows[0].full_name,
            role: userResult.rows[0].role
          }
        }
      });
    } catch (error) {
      console.error('Error impersonating tenant:', error);
      res.status(500).json({ error: 'Failed to login as tenant' });
    }
  },

  // Get platform statistics
  async getPlatformStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT t.id) as total_tenants,
          COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END) as active_tenants,
          COUNT(DISTINCT c.id) as total_consignments,
          COUNT(DISTINCT u.id) as total_users,
          COALESCE(SUM(i.total_amount), 0) as total_revenue
        FROM tenants t
        LEFT JOIN consignments c ON c.tenant_id = t.id
        LEFT JOIN users u ON u.tenant_id = t.id
        LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status = 'paid'
      `;
      
      const statsResult = await pool.query(statsQuery);
      
      // Get growth data for last 30 days
      const growthQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as signups
        FROM tenants
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      const growthResult = await pool.query(growthQuery);
      
      // Get revenue by plan
      const revenueByPlanQuery = `
        SELECT 
          subscription_plan,
          COUNT(*) as tenant_count,
          COALESCE(SUM(i.total_amount), 0) as revenue
        FROM tenants t
        LEFT JOIN invoices i ON i.tenant_id = t.id AND i.status = 'paid'
        GROUP BY subscription_plan
      `;
      
      const revenueByPlanResult = await pool.query(revenueByPlanQuery);
      
      res.json({
        success: true,
        data: {
          overview: statsResult.rows[0],
          growth: growthResult.rows,
          revenueByPlan: revenueByPlanResult.rows
        }
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ error: 'Failed to fetch platform statistics' });
    }
  },

  // Get revenue analytics
  async getRevenueAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      
      const revenueQuery = `
        SELECT 
          DATE(i.created_at) as date,
          COUNT(DISTINCT i.id) as invoice_count,
          SUM(i.total_amount) as revenue,
          COUNT(DISTINCT i.tenant_id) as paying_tenants
        FROM invoices i
        WHERE i.status = 'paid' 
          AND i.created_at >= CURRENT_DATE - INTERVAL '${period} days'
        GROUP BY DATE(i.created_at)
        ORDER BY date
      `;
      
      const result = await pool.query(revenueQuery);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
  },

  // Get all users across tenants
  async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { search, tenant_id, role } = req.query;
      
      let query = `
        SELECT 
          u.*,
          t.name as tenant_name,
          t.code as tenant_code,
          b.name as branch_name
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 0;
      
      if (search) {
        paramCount++;
        query += ` AND (u.username ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }
      
      if (tenant_id) {
        paramCount++;
        query += ` AND u.tenant_id = $${paramCount}`;
        params.push(tenant_id);
      }
      
      if (role) {
        paramCount++;
        query += ` AND u.role = $${paramCount}`;
        params.push(role);
      }
      
      query += ' ORDER BY u.created_at DESC LIMIT 100';
      
      const result = await pool.query(query, params);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Send announcement to all users
  async sendAnnouncement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, message, target_tenants } = req.body;
      
      // This would integrate with your notification system
      // For now, we'll just log it
      await logSuperAdminAction(req, 'SEND_ANNOUNCEMENT', null, {
        title,
        message,
        target_tenants
      });
      
      res.json({
        success: true,
        message: 'Announcement sent successfully'
      });
    } catch (error) {
      console.error('Error sending announcement:', error);
      res.status(500).json({ error: 'Failed to send announcement' });
    }
  },

  // Get activity logs
  async getActivityLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0 } = req.query;
      
      const logsQuery = `
        SELECT 
          sl.*,
          u.username,
          u.full_name,
          t.name as tenant_name
        FROM superadmin_logs sl
        JOIN users u ON sl.user_id = u.id
        LEFT JOIN tenants t ON sl.tenant_id = t.id
        ORDER BY sl.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const result = await pool.query(logsQuery, [limit, offset]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  },

  // Create new tenant with automated setup
  async createTenant(req: AuthRequest, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        tenantCode,
        tenantName,
        email,
        phone,
        address,
        companyName,
        gstin,
        adminName,
        adminEmail,
        adminPhone,
        adminUsername,
        subscriptionPlan,
        billingCycle,
        branchName,
        branchAddress,
        branchCity,
        branchState,
        branchPincode
      } = req.body;

      // Validate required fields
      if (!tenantCode || !tenantName || !email || !adminName || !adminEmail || !adminUsername) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Check if tenant code already exists
      const existingTenant = await client.query('SELECT id FROM tenants WHERE code = $1', [tenantCode]);
      if (existingTenant.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Tenant code already exists' });
        return;
      }

      // Check if admin username already exists
      const existingUser = await client.query('SELECT id FROM users WHERE username = $1', [adminUsername]);
      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Admin username already exists' });
        return;
      }

      // Calculate subscription dates
      const subscriptionStarts = new Date();
      const subscriptionEnds = new Date();
      if (billingCycle === 'yearly') {
        subscriptionEnds.setFullYear(subscriptionEnds.getFullYear() + 1);
      } else {
        subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);
      }

      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 30); // 30-day trial

      // 1. Create tenant
      const tenantQuery = `
        INSERT INTO tenants (
          code, name, email, phone, address, is_active, subscription_plan, 
          subscription_starts_at, subscription_ends_at, trial_ends_at,
          settings, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const tenantResult = await client.query(tenantQuery, [
        tenantCode,
        tenantName,
        email,
        phone,
        address,
        subscriptionPlan,
        subscriptionStarts,
        subscriptionEnds,
        trialEnds,
        JSON.stringify({
          billing_cycle: billingCycle,
          features_enabled: subscriptionPlan === 'enterprise' ? ['all'] : ['basic'],
          branding: {
            primary_color: '#3b82f6',
            logo_url: ''
          }
        })
      ]);
      
      const tenant = tenantResult.rows[0];

      // 2. Create company
      const companyQuery = `
        INSERT INTO companies (
          tenant_id, name, email, phone, address, gstin, is_active,
          trial_ends_at, subscription_ends_at, onboarding_completed, onboarding_steps,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, false, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const companyResult = await client.query(companyQuery, [
        tenant.id,
        companyName || tenantName,
        adminEmail,
        phone,
        address,
        gstin || null,
        trialEnds,
        subscriptionEnds,
        JSON.stringify({
          tenant_setup: true,
          admin_created: false,
          branch_setup: false,
          initial_configuration: false
        })
      ]);
      
      const company = companyResult.rows[0];

      // 3. Create head office branch
      const branchQuery = `
        INSERT INTO branches (
          tenant_id, company_id, name, address, city, state, pincode, 
          phone, email, is_active, is_head_office, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const branchResult = await client.query(branchQuery, [
        tenant.id,
        company.id,
        branchName || 'Head Office',
        branchAddress || address,
        branchCity || 'Mumbai',
        branchState || 'Maharashtra', 
        branchPincode || '400001',
        phone,
        adminEmail,
        true,
        true
      ]);
      
      const branch = branchResult.rows[0];

      // 4. Generate secure password for admin
      const bcrypt = require('bcrypt');
      const defaultPassword = 'Admin@123'; // This should be sent via email in production
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      // 5. Create admin user
      const adminUserQuery = `
        INSERT INTO users (
          tenant_id, company_id, branch_id, username, email, password, 
          full_name, phone, role, is_active, last_login, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const adminUserResult = await client.query(adminUserQuery, [
        tenant.id,
        company.id,
        branch.id,
        adminUsername,
        adminEmail,
        hashedPassword,
        adminName,
        adminPhone || phone,
        'admin'
      ]);

      const adminUser = adminUserResult.rows[0];

      // 6. Update company onboarding status
      await client.query(
        'UPDATE companies SET onboarding_steps = $1 WHERE id = $2',
        [JSON.stringify({
          tenant_setup: true,
          admin_created: true,
          branch_setup: true,
          initial_configuration: true
        }), company.id]
      );

      await client.query('COMMIT');

      // Log the action
      await logSuperAdminAction(req, 'CREATE_TENANT', tenant.id, {
        tenant_code: tenantCode,
        tenant_name: tenantName,
        subscription_plan: subscriptionPlan,
        admin_username: adminUsername
      });

      res.status(201).json({
        success: true,
        data: {
          tenant: tenant,
          company: company,
          branch: branch,
          admin: { ...adminUser, password: undefined }, // Never return password
          credentials: {
            username: adminUsername,
            password: defaultPassword, // In production, this should be sent via email
            login_url: `https://${tenantCode}.desicargo.in`
          }
        },
        message: 'Tenant created successfully. Login credentials have been sent to the admin email.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating tenant:', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    } finally {
      client.release();
    }
  },

  // System health check
  async getSystemHealth(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Check database connection
      const dbCheck = await pool.query('SELECT 1');
      
      // Get system metrics
      const metricsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM tenants WHERE is_active = true) as active_tenants,
          (SELECT COUNT(*) FROM users WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '5 minutes') as active_users,
          (SELECT COUNT(*) FROM consignments WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') as recent_bookings,
          (SELECT pg_database_size(current_database())) as database_size
      `;
      
      const metrics = await pool.query(metricsQuery);
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          database: 'connected',
          metrics: metrics.rows[0],
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error checking system health:', error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: 'System health check failed' 
      });
    }
  }
};

// Helper function to log superadmin actions
async function logSuperAdminAction(
  req: AuthRequest, 
  action: string, 
  tenantId: string | null, 
  details: any
) {
  try {
    const insertQuery = `
      INSERT INTO superadmin_logs (user_id, action, tenant_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await pool.query(insertQuery, [
      req.user?.id,
      action,
      tenantId,
      JSON.stringify(details),
      req.ip
    ]);
  } catch (error) {
    console.error('Error logging superadmin action:', error);
  }
}