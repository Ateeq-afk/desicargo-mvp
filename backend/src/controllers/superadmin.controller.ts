import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const superAdminController = {
  // Get all tenants with statistics
  async getAllTenants(req: AuthRequest, res: Response) {
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
  async getTenantDetails(req: AuthRequest, res: Response) {
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
        return res.status(404).json({ error: 'Tenant not found' });
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
  async updateTenant(req: AuthRequest, res: Response) {
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
        return res.status(404).json({ error: 'Tenant not found' });
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
  async deleteTenant(req: AuthRequest, res: Response) {
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
        return res.status(404).json({ error: 'Tenant not found' });
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
  async loginAsTenant(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      // Verify tenant exists and is active
      const tenantQuery = 'SELECT * FROM tenants WHERE id = $1 AND is_active = true';
      const tenantResult = await pool.query(tenantQuery, [id]);
      
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Active tenant not found' });
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
        return res.status(404).json({ error: 'No admin user found for tenant' });
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
  async getPlatformStats(req: AuthRequest, res: Response) {
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
  async getRevenueAnalytics(req: AuthRequest, res: Response) {
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
  async getAllUsers(req: AuthRequest, res: Response) {
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
  async sendAnnouncement(req: AuthRequest, res: Response) {
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
  async getActivityLogs(req: AuthRequest, res: Response) {
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

  // System health check
  async getSystemHealth(req: AuthRequest, res: Response) {
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