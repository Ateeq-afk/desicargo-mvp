import { Request, Response } from 'express';
import { query, queryWithTenant } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { JwtPayload, TenantAuthRequest } from '../types';

// Use TenantAuthRequest instead of local TenantRequest
type TenantRequest = TenantAuthRequest;

// Create new customer
export const createCustomer = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      phone,
      alternate_phone,
      email,
      address,
      city,
      state,
      pincode,
      gstin,
      customer_type = 'regular',
      credit_limit = 0,
      credit_days = 0,
      special_instructions
    } = req.body;

    // Debug logging
    console.log('Create customer request:', {
      tenantId: req.tenantId,
      userId: req.user?.userId,
      companyId: req.user?.companyId,
      body: req.body
    });

    // Validate required fields
    if (!name || !phone) {
      throw new AppError('Name and phone are required', 400);
    }

    // Validate phone number format
    if (!/^[0-9]{10}$/.test(phone)) {
      throw new AppError('Phone number must be 10 digits', 400);
    }

    // Check if customer with same phone exists
    const existingCustomer = await queryWithTenant(
      'SELECT id, name FROM customers WHERE tenant_id = $1 AND phone = $2',
      [req.tenantId!, phone],
      req.tenantId!,
      req.user?.userId
    );

    if (existingCustomer.rows.length > 0) {
      throw new AppError(`Customer already exists with phone ${phone}`, 400);
    }

    // Log for debugging
    console.log('Creating customer with tenant_id:', req.tenantId);
    console.log('User info:', { userId: req.user?.userId, companyId: req.user?.companyId });
    
    const result = await queryWithTenant(
      `INSERT INTO customers (
        company_id, tenant_id, name, phone, alternate_phone, email, 
        address, city, state, pincode, gstin, customer_type,
        credit_limit, credit_days, special_instructions, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        req.user!.companyId, req.tenantId, name, phone, alternate_phone, email,
        address, city, state, pincode, gstin, customer_type,
        credit_limit, credit_days, special_instructions, req.user!.userId
      ],
      req.tenantId!,
      req.user?.userId
    );

    console.log('Customer created successfully:', result.rows[0].id);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create customer error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create customer'
    });
  }
};

// Update customer
export const updateCustomer = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      alternate_phone,
      email,
      address,
      city,
      state,
      pincode,
      gstin,
      customer_type,
      credit_limit,
      credit_days,
      special_instructions,
      is_active
    } = req.body;

    const result = await queryWithTenant(
      `UPDATE customers SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        alternate_phone = COALESCE($3, alternate_phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        pincode = COALESCE($8, pincode),
        gstin = COALESCE($9, gstin),
        customer_type = COALESCE($10, customer_type),
        credit_limit = COALESCE($11, credit_limit),
        credit_days = COALESCE($12, credit_days),
        special_instructions = COALESCE($13, special_instructions),
        is_active = COALESCE($14, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15 AND tenant_id = $16
      RETURNING *`,
      [
        name, phone, alternate_phone, email, address, city, state,
        pincode, gstin, customer_type, credit_limit, credit_days,
        special_instructions, is_active, id, req.tenantId!
      ],
      req.tenantId!,
      req.user?.userId
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update customer'
    });
  }
};

// Get customers with pagination and search
export const getCustomers = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search = '', customer_type, is_active } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE c.tenant_id = $1';
    const params: any[] = [req.tenantId!];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (customer_type) {
      whereClause += ` AND c.customer_type = $${paramIndex}`;
      params.push(customer_type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereClause += ` AND c.is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    // Get total count
    const countResult = await queryWithTenant(
      `SELECT COUNT(*) FROM customers c ${whereClause}`,
      params,
      req.tenantId!
    );

    // Get customers
    params.push(Number(limit), offset);
    const result = await queryWithTenant(
      `SELECT c.*, 
        COALESCE(c.total_bookings, 0) as total_bookings,
        COALESCE(c.total_business_value, 0) as total_business_value,
        c.last_booking_date
      FROM customers c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
      req.tenantId!
    );

    res.json({
      success: true,
      data: {
        customers: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
        }
      }
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get customers'
    });
  }
};

// Search customers for autocomplete
export const searchCustomers = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { q = '', limit = 10 } = req.query;

    console.log('Search customers request:', { 
      query: q, 
      limit, 
      tenantId: req.tenantId,
      userId: req.user?.userId 
    });

    if (String(q).length < 2) {
      res.json({
        success: true,
        data: {
          customers: [],
          recent: []
        }
      });
      return;
    }

    // Search customers - try trigram similarity first, fallback to basic search
    let searchResult;
    try {
      // Try trigram similarity search first
      searchResult = await queryWithTenant(
        `SELECT 
          id, name, phone, alternate_phone, email, address, 
          city, state, pincode, gstin, customer_type,
          credit_limit, credit_days, is_active,
          similarity(name, $2) AS name_similarity,
          similarity(phone, $2) AS phone_similarity
        FROM customers
        WHERE tenant_id = $1 
          AND is_active = true
          AND (
            name % $2 OR 
            phone % $2 OR
            name ILIKE $3 OR 
            phone ILIKE $3
          )
        ORDER BY 
          GREATEST(name_similarity, phone_similarity) DESC,
          total_bookings DESC
        LIMIT $4`,
        [req.tenantId!, String(q), `%${q}%`, Number(limit)],
        req.tenantId!
      );
    } catch (trigramError) {
      console.warn('Trigram search failed, falling back to basic search:', trigramError);
      // Fallback to basic ILIKE search
      searchResult = await queryWithTenant(
        `SELECT 
          id, name, phone, alternate_phone, email, address, 
          city, state, pincode, gstin, customer_type,
          credit_limit, credit_days, is_active,
          CASE WHEN name ILIKE $2 THEN 3
               WHEN name ILIKE $3 THEN 2
               WHEN phone ILIKE $3 THEN 1
               ELSE 0 END AS search_score
        FROM customers
        WHERE tenant_id = $1 
          AND is_active = true
          AND (
            name ILIKE $3 OR 
            phone ILIKE $3 OR
            email ILIKE $3
          )
        ORDER BY search_score DESC, total_bookings DESC, name
        LIMIT $4`,
        [req.tenantId!, String(q), `%${q}%`, Number(limit)],
        req.tenantId!
      );
    }

    // Get recent customers (last 5 used)
    const recentResult = await queryWithTenant(
      `SELECT DISTINCT ON (c.id)
        c.id, c.name, c.phone, c.alternate_phone, c.email, 
        c.address, c.city, c.state, c.pincode, c.gstin, 
        c.customer_type, c.credit_limit, c.credit_days
      FROM customers c
      JOIN consignments cn ON (c.phone = cn.consignor_phone OR c.phone = cn.consignee_phone)
        AND cn.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1 AND c.is_active = true
      ORDER BY c.id, cn.booking_date DESC, cn.booking_time DESC
      LIMIT 5`,
      [req.tenantId!],
      req.tenantId!
    );

    console.log('Search results:', {
      customersFound: searchResult.rows.length,
      recentFound: recentResult.rows.length
    });

    res.json({
      success: true,
      data: {
        customers: searchResult.rows,
        recent: recentResult.rows
      }
    });
  } catch (error) {
    console.error('Search customers error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search customers'
    });
  }
};

// Get customer by ID
export const getCustomerById = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await queryWithTenant(
      `SELECT c.*,
        COUNT(DISTINCT cn.id) as total_bookings,
        COALESCE(SUM(cn.freight_amount), 0) as total_business_value,
        MAX(cn.booking_date) as last_booking_date,
        COALESCE(c.current_outstanding, 0) as current_outstanding
      FROM customers c
      LEFT JOIN consignments cn ON (c.phone = cn.consignor_phone OR c.phone = cn.consignee_phone)
        AND cn.tenant_id = c.tenant_id
      WHERE c.id = $1 AND c.tenant_id = $2
      GROUP BY c.id`,
      [id, req.tenantId!],
      req.tenantId!
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    // Get recent bookings
    const bookingsResult = await queryWithTenant(
      `SELECT 
        cn_number, booking_date, 
        fb.name as from_branch, tb.name as to_branch,
        freight_amount, payment_type, status as delivery_status
      FROM consignments c
      LEFT JOIN branches fb ON c.from_branch_id = fb.id
      LEFT JOIN branches tb ON c.to_branch_id = tb.id
      WHERE c.tenant_id = $1 
        AND (c.consignor_phone = $2 OR c.consignee_phone = $2)
      ORDER BY c.booking_date DESC, c.booking_time DESC
      LIMIT 10`,
      [req.tenantId!, result.rows[0].phone],
      req.tenantId!
    );

    res.json({
      success: true,
      data: {
        customer: result.rows[0],
        recentBookings: bookingsResult.rows
      }
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get customer'
    });
  }
};

// Get frequent customers
export const getFrequentCustomers = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const result = await queryWithTenant(
      `SELECT 
        c.*,
        COUNT(DISTINCT cn.id) as booking_count,
        COALESCE(SUM(cn.freight_amount), 0) as total_value
      FROM customers c
      JOIN consignments cn ON (c.phone = cn.consignor_phone OR c.phone = cn.consignee_phone)
        AND cn.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1 
        AND c.is_active = true
        AND cn.booking_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY c.id
      ORDER BY booking_count DESC
      LIMIT 10`,
      [req.tenantId!],
      req.tenantId!
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get frequent customers'
    });
  }
};

// Delete customer (soft delete)
export const deleteCustomer = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await queryWithTenant(
      `UPDATE customers 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, name`,
      [id, req.tenantId!],
      req.tenantId!
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    res.json({
      success: true,
      message: `Customer ${result.rows[0].name} has been deactivated`
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete customer'
    });
  }
};

// Reactivate a customer
export const reactivateCustomer = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('Reactivating customer:', id, 'Tenant:', req.tenantId);

    const result = await queryWithTenant(
      `UPDATE customers 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, req.tenantId!],
      req.tenantId!
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    res.json({
      success: true,
      message: `Customer ${result.rows[0].name} has been reactivated`,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate customer'
    });
  }
};

// Import customers from CSV/Excel
export const importCustomers = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { customers } = req.body;

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new AppError('No customers provided for import', 400);
    }

    let successCount = 0;
    const errors: any[] = [];

    for (const customer of customers) {
      try {
        // Check if customer exists
        const existing = await queryWithTenant(
          'SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2',
          [req.tenantId!, customer.phone],
          req.tenantId!
        );

        if (existing.rows.length > 0) {
          // Update existing customer
          await queryWithTenant(
            `UPDATE customers SET
              name = $1, email = $2, address = $3, city = $4,
              state = $5, pincode = $6, gstin = $7,
              customer_type = COALESCE($8, customer_type),
              updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = $9 AND phone = $10`,
            [
              customer.name, customer.email, customer.address,
              customer.city, customer.state, customer.pincode,
              customer.gstin, customer.customer_type || 'regular',
              req.tenantId!, customer.phone
            ],
            req.tenantId!
          );
        } else {
          // Insert new customer
          await queryWithTenant(
            `INSERT INTO customers (
              company_id, tenant_id, name, phone, email, address, city,
              state, pincode, gstin, customer_type, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              req.user!.companyId, req.tenantId, customer.name, customer.phone,
              customer.email, customer.address, customer.city,
              customer.state, customer.pincode, customer.gstin,
              customer.customer_type || 'regular', req.user!.userId
            ],
            req.tenantId!
          );
        }
        successCount++;
      } catch (err: any) {
        errors.push({
          phone: customer.phone,
          name: customer.name,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `Import completed. ${successCount} customers imported successfully`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import customers'
    });
  }
};