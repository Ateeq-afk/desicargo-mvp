import { Request, Response } from 'express';
import { query, queryWithTenant } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantAuthRequest } from '../types';
import { AppError } from '../middleware/error.middleware';

// Get dashboard statistics with enhanced customer analytics
export const getDashboardStats = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const branchId = req.user?.branchId;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Build branch filter based on user role
    let branchFilter = '';
    const queryParams: any[] = [];
    
    if (branchId && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      branchFilter = ' AND c.from_branch_id = $1';
      queryParams.push(branchId);
    }

    // Get today's bookings with tenant isolation
    const todayBookingsResult = await queryWithTenant(
      `SELECT COUNT(*) as count 
       FROM consignments c
       WHERE DATE(c.booking_date) = CURRENT_DATE
       ${branchFilter}`,
      queryParams,
      tenantId
    );

    // Get active OGPL (vehicles in transit)
    const activeOGPLResult = await queryWithTenant(
      `SELECT COUNT(DISTINCT o.id) as count 
       FROM ogpl o
       WHERE o.status IN ('loaded', 'in_transit')
       ${branchFilter.replace('c.', 'o.')}`,
      queryParams,
      tenantId
    );

    // Get pending deliveries
    const pendingDeliveriesResult = await queryWithTenant(
      `SELECT COUNT(*) as count 
       FROM consignments c
       WHERE c.status IN ('booked', 'in_transit', 'reached_destination')
       ${branchFilter}`,
      queryParams,
      tenantId
    );

    // Get today's revenue
    const todayRevenueResult = await queryWithTenant(
      `SELECT COALESCE(SUM(c.total_amount), 0) as revenue 
       FROM consignments c
       WHERE DATE(c.booking_date) = CURRENT_DATE
       AND c.status != 'cancelled'
       ${branchFilter}`,
      queryParams,
      tenantId
    );

    // Get monthly growth percentage
    const currentMonthResult = await queryWithTenant(
      `SELECT COALESCE(SUM(c.total_amount), 0) as revenue 
       FROM consignments c
       WHERE DATE_TRUNC('month', c.booking_date) = DATE_TRUNC('month', CURRENT_DATE)
       AND c.status != 'cancelled'
       ${branchFilter}`,
      queryParams,
      tenantId
    );

    const lastMonthResult = await queryWithTenant(
      `SELECT COALESCE(SUM(c.total_amount), 0) as revenue 
       FROM consignments c
       WHERE DATE_TRUNC('month', c.booking_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
       AND c.status != 'cancelled'
       ${branchFilter}`,
      queryParams,
      tenantId
    );

    // Enhanced customer analytics with proper tenant isolation
    const customerAnalytics = await queryWithTenant(
      `SELECT 
         COUNT(DISTINCT cu.id) FILTER (WHERE cu.is_active = true) as total_customers,
         COUNT(DISTINCT cu.id) FILTER (WHERE cu.created_at >= CURRENT_DATE - INTERVAL '30 days') as new_customers_month,
         COUNT(DISTINCT c.consignor_id) FILTER (WHERE c.booking_date >= CURRENT_DATE - INTERVAL '30 days') as active_customers,
         COUNT(DISTINCT c.consignor_id) FILTER (WHERE c.booking_date >= CURRENT_DATE - INTERVAL '7 days') as active_customers_week,
         ROUND(AVG(cu.total_business_value), 2) as avg_customer_value,
         COUNT(DISTINCT cu.id) FILTER (WHERE cu.customer_type = 'corporate') as corporate_customers,
         COUNT(DISTINCT cu.id) FILTER (WHERE cu.customer_type = 'regular') as regular_customers
       FROM customers cu
       LEFT JOIN consignments c ON cu.id = c.consignor_id
       WHERE cu.is_active = true
       ${branchFilter.replace('c.', 'c.')}`,
      queryParams,
      tenantId
    );

    const customerStats = customerAnalytics.rows[0];

    // Calculate monthly growth percentage
    const currentMonthRevenue = parseFloat(currentMonthResult.rows[0].revenue);
    const lastMonthRevenue = parseFloat(lastMonthResult.rows[0].revenue);
    let monthlyGrowth = 0;
    
    if (lastMonthRevenue > 0) {
      monthlyGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
      monthlyGrowth = 100; // 100% growth if no revenue last month
    }

    res.json({
      success: true,
      data: {
        // Basic stats
        todayBookings: parseInt(todayBookingsResult.rows[0].count),
        activeOGPL: parseInt(activeOGPLResult.rows[0].count),
        pendingDeliveries: parseInt(pendingDeliveriesResult.rows[0].count),
        todayRevenue: parseFloat(todayRevenueResult.rows[0].revenue),
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(2)),
        
        // Enhanced customer analytics
        totalCustomers: parseInt(customerStats.total_customers || 0),
        activeCustomers: parseInt(customerStats.active_customers || 0),
        activeCustomersWeek: parseInt(customerStats.active_customers_week || 0),
        newCustomersMonth: parseInt(customerStats.new_customers_month || 0),
        avgCustomerValue: parseFloat(customerStats.avg_customer_value || 0),
        corporateCustomers: parseInt(customerStats.corporate_customers || 0),
        regularCustomers: parseInt(customerStats.regular_customers || 0)
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Get top customers by revenue
export const getTopCustomers = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const limit = parseInt(req.query.limit as string) || 10;
    const period = req.query.period as string || '30'; // days
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    const topCustomers = await queryWithTenant(
      `SELECT 
        cu.id,
        cu.name,
        cu.phone,
        cu.customer_type,
        COALESCE(cu.total_bookings, 0) as lifetime_bookings,
        COALESCE(cu.total_business_value, 0) as lifetime_value,
        COUNT(c.id) as recent_bookings,
        COALESCE(SUM(c.total_amount), 0) as recent_revenue,
        ROUND(AVG(c.total_amount), 2) as avg_booking_value,
        MAX(c.booking_date) as last_booking_date,
        cu.credit_limit,
        cu.current_outstanding
       FROM customers cu
       LEFT JOIN consignments c ON cu.id = c.consignor_id 
         AND c.booking_date >= CURRENT_DATE - INTERVAL '${period} days'
         AND c.status != 'cancelled'
       WHERE cu.is_active = true
       GROUP BY cu.id, cu.name, cu.phone, cu.customer_type, cu.total_bookings, 
                cu.total_business_value, cu.credit_limit, cu.current_outstanding
       HAVING COALESCE(cu.total_business_value, 0) > 0
       ORDER BY recent_revenue DESC, lifetime_value DESC
       LIMIT $1`,
      [limit],
      tenantId
    );

    res.json({
      success: true,
      data: topCustomers.rows.map((customer: any) => ({
        ...customer,
        recent_revenue: parseFloat(customer.recent_revenue),
        lifetime_value: parseFloat(customer.lifetime_value),
        avg_booking_value: parseFloat(customer.avg_booking_value),
        current_outstanding: parseFloat(customer.current_outstanding),
        credit_utilization: customer.credit_limit > 0 
          ? Math.round((customer.current_outstanding / customer.credit_limit) * 100)
          : 0
      }))
    });
  } catch (error) {
    console.error('Top customers error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch top customers';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Get customer growth analytics
export const getCustomerGrowth = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    // Get customer growth over last 12 months
    const growthData = await queryWithTenant(
      `SELECT 
        DATE_TRUNC('month', cu.created_at) as month,
        COUNT(*) as new_customers,
        COUNT(*) FILTER (WHERE cu.customer_type = 'corporate') as new_corporate,
        COUNT(*) FILTER (WHERE cu.customer_type = 'regular') as new_regular
       FROM customers cu
       WHERE cu.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
       GROUP BY DATE_TRUNC('month', cu.created_at)
       ORDER BY month`,
      [],
      tenantId
    );

    // Get customer retention metrics
    const retentionData = await queryWithTenant(
      `SELECT 
         COUNT(DISTINCT cu.id) as total_customers,
         COUNT(DISTINCT c.consignor_id) FILTER (WHERE c.booking_date >= CURRENT_DATE - INTERVAL '30 days') as active_30_days,
         COUNT(DISTINCT c.consignor_id) FILTER (WHERE c.booking_date >= CURRENT_DATE - INTERVAL '90 days') as active_90_days,
         COUNT(DISTINCT cu.id) FILTER (WHERE cu.total_bookings > 1) as repeat_customers
       FROM customers cu
       LEFT JOIN consignments c ON cu.id = c.consignor_id
       WHERE cu.is_active = true`,
      [],
      tenantId
    );

    const retention = retentionData.rows[0];
    const retentionRate30 = retention.total_customers > 0 
      ? Math.round((retention.active_30_days / retention.total_customers) * 100)
      : 0;
    const retentionRate90 = retention.total_customers > 0 
      ? Math.round((retention.active_90_days / retention.total_customers) * 100)
      : 0;
    const repeatCustomerRate = retention.total_customers > 0 
      ? Math.round((retention.repeat_customers / retention.total_customers) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        growth_chart: growthData.rows,
        retention_metrics: {
          retention_rate_30_days: retentionRate30,
          retention_rate_90_days: retentionRate90,
          repeat_customer_rate: repeatCustomerRate,
          total_customers: parseInt(retention.total_customers),
          active_customers_30_days: parseInt(retention.active_30_days),
          active_customers_90_days: parseInt(retention.active_90_days),
          repeat_customers: parseInt(retention.repeat_customers)
        }
      }
    });
  } catch (error) {
    console.error('Customer growth error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch customer growth data';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Get recent bookings with customer information
export const getRecentBookings = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const branchId = req.user?.branchId;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!tenantId) {
      throw new AppError('Tenant ID not found', 401);
    }

    let branchFilter = '';
    const queryParams: any[] = [limit];
    
    if (branchId && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      branchFilter = ' AND c.from_branch_id = $2';
      queryParams.push(branchId);
    }

    const result = await queryWithTenant(
      `SELECT 
        c.id,
        c.cn_number,
        c.booking_date,
        fb.name as from_branch,
        tb.name as to_branch,
        c.consignor_name,
        c.consignee_name,
        c.no_of_packages as total_packages,
        c.actual_weight,
        c.total_amount,
        c.status,
        c.payment_type,
        cu.customer_type,
        cu.phone as consignor_phone,
        CASE 
          WHEN c.consignor_id IS NOT NULL THEN 'existing_customer'
          ELSE 'walk_in'
        END as customer_status
       FROM consignments c
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       LEFT JOIN customers cu ON c.consignor_id = cu.id
       WHERE 1=1
       ${branchFilter}
       ORDER BY c.booking_date DESC, c.booking_time DESC
       LIMIT $${queryParams.length + 1}`,
      [...queryParams, limit],
      tenantId
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Recent bookings error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch recent bookings';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Get branch-wise summary
export const getBranchSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    
    if (!companyId) {
      throw new AppError('Company ID not found', 401);
    }

    // Only admins can see all branches
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      throw new AppError('Access denied', 403);
    }

    const result = await query(
      `SELECT 
        b.id,
        b.name as branch_name,
        b.city,
        COUNT(DISTINCT c.id) as total_bookings,
        COALESCE(SUM(c.total_amount), 0) as total_revenue,
        COUNT(DISTINCT c.id) FILTER (WHERE DATE(c.booking_date) = CURRENT_DATE) as today_bookings,
        COALESCE(SUM(c.total_amount) FILTER (WHERE DATE(c.booking_date) = CURRENT_DATE), 0) as today_revenue
       FROM branches b
       LEFT JOIN consignments c ON c.from_branch_id = b.id AND c.status != 'cancelled'
       WHERE b.company_id = $1
       GROUP BY b.id, b.name, b.city
       ORDER BY total_revenue DESC`,
      [companyId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Branch summary error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch branch summary';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};

// Get revenue chart data (last 7 days)
export const getRevenueChart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const branchId = req.user?.branchId;
    
    if (!companyId) {
      throw new AppError('Company ID not found', 401);
    }

    let branchFilter = '';
    const queryParams: any[] = [companyId];
    
    if (branchId && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      branchFilter = ' AND c.from_branch_id = $2';
      queryParams.push(branchId);
    }

    const result = await query(
      `SELECT 
        d.date::date as date,
        COALESCE(SUM(c.total_amount), 0) as revenue,
        COUNT(c.id) as bookings
       FROM generate_series(
         CURRENT_DATE - INTERVAL '6 days',
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       LEFT JOIN consignments c ON DATE(c.booking_date) = d.date::date 
         AND c.company_id = $1 
         AND c.status != 'cancelled'
         ${branchFilter}
       GROUP BY d.date
       ORDER BY d.date`,
      queryParams
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Revenue chart error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch revenue chart data';
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
};