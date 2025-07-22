import { Request, Response } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { JwtPayload } from '../types';

// Create new customer
export const createCustomer = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
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

    // Check if customer with same phone exists
    const existingCustomer = await query(
      'SELECT id, name FROM customers WHERE company_id = $1 AND phone = $2',
      [req.user!.companyId, phone]
    );

    if (existingCustomer.rows.length > 0) {
      throw new AppError(`Customer already exists with phone ${phone}`, 400);
    }

    const result = await query(
      `INSERT INTO customers (
        company_id, name, phone, alternate_phone, email, 
        address, city, state, pincode, gstin, customer_type,
        credit_limit, credit_days, special_instructions, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        req.user!.companyId, name, phone, alternate_phone, email,
        address, city, state, pincode, gstin, customer_type,
        credit_limit, credit_days, special_instructions, req.user!.userId
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create customer'
    });
  }
};

// Update customer
export const updateCustomer = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
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

    const result = await query(
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
      WHERE id = $15 AND company_id = $16
      RETURNING *`,
      [
        name, phone, alternate_phone, email, address, city, state,
        pincode, gstin, customer_type, credit_limit, credit_days,
        special_instructions, is_active, id, req.user!.companyId
      ]
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
export const getCustomers = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search = '', customer_type, is_active } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE c.company_id = $1';
    const params: any[] = [req.user!.companyId];
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
    const countResult = await query(
      `SELECT COUNT(*) FROM customers c ${whereClause}`,
      params
    );

    // Get customers
    params.push(Number(limit), offset);
    const result = await query(
      `SELECT c.*, 
        COALESCE(c.total_bookings, 0) as total_bookings,
        COALESCE(c.total_business_value, 0) as total_business_value,
        c.last_booking_date
      FROM customers c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
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
export const searchCustomers = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
  try {
    const { q = '', limit = 10 } = req.query;

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

    // Search customers using trigram similarity
    const searchResult = await query(
      `SELECT 
        id, name, phone, alternate_phone, email, address, 
        city, state, pincode, gstin, customer_type,
        credit_limit, credit_days, is_active,
        similarity(name, $2) AS name_similarity,
        similarity(phone, $2) AS phone_similarity
      FROM customers
      WHERE company_id = $1 
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
      [req.user!.companyId, String(q), `%${q}%`, Number(limit)]
    );

    // Get recent customers (last 5 used)
    const recentResult = await query(
      `SELECT DISTINCT ON (c.id)
        c.id, c.name, c.phone, c.alternate_phone, c.email, 
        c.address, c.city, c.state, c.pincode, c.gstin, 
        c.customer_type, c.credit_limit, c.credit_days
      FROM customers c
      JOIN consignments cn ON (c.phone = cn.consignor_phone OR c.phone = cn.consignee_phone)
      WHERE c.company_id = $1 AND c.is_active = true
      ORDER BY c.id, cn.booking_date DESC, cn.booking_time DESC
      LIMIT 5`,
      [req.user!.companyId]
    );

    res.json({
      success: true,
      data: {
        customers: searchResult.rows,
        recent: recentResult.rows
      }
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search customers'
    });
  }
};

// Get customer by ID
export const getCustomerById = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*,
        COUNT(DISTINCT cn.id) as total_bookings,
        COALESCE(SUM(cn.freight_amount), 0) as total_business_value,
        MAX(cn.booking_date) as last_booking_date,
        COALESCE(c.current_outstanding, 0) as current_outstanding
      FROM customers c
      LEFT JOIN consignments cn ON (c.phone = cn.consignor_phone OR c.phone = cn.consignee_phone)
        AND cn.company_id = c.company_id
      WHERE c.id = $1 AND c.company_id = $2
      GROUP BY c.id`,
      [id, req.user!.companyId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    // Get recent bookings
    const bookingsResult = await query(
      `SELECT 
        cn_number, booking_date, from_city, to_city,
        freight_amount, payment_status, delivery_status
      FROM consignments
      WHERE company_id = $1 
        AND (consignor_phone = $2 OR consignee_phone = $2)
      ORDER BY booking_date DESC, booking_time DESC
      LIMIT 10`,
      [req.user!.companyId, result.rows[0].phone]
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
export const getFrequentCustomers = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT 
        c.*,
        COUNT(DISTINCT cn.id) as booking_count,
        COALESCE(SUM(cn.freight_amount), 0) as total_value
      FROM customers c
      JOIN consignments cn ON (c.phone = cn.consignor_phone OR c.phone = cn.consignee_phone)
        AND cn.company_id = c.company_id
      WHERE c.company_id = $1 
        AND c.is_active = true
        AND cn.booking_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY c.id
      ORDER BY booking_count DESC
      LIMIT 10`,
      [req.user!.companyId]
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
export const deleteCustomer = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE customers 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
      RETURNING id, name`,
      [id, req.user!.companyId]
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

// Import customers from CSV/Excel
export const importCustomers = async (req: Request & { user?: JwtPayload }, res: Response): Promise<void> => {
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
        const existing = await query(
          'SELECT id FROM customers WHERE company_id = $1 AND phone = $2',
          [req.user!.companyId, customer.phone]
        );

        if (existing.rows.length > 0) {
          // Update existing customer
          await query(
            `UPDATE customers SET
              name = $1, email = $2, address = $3, city = $4,
              state = $5, pincode = $6, gstin = $7,
              customer_type = COALESCE($8, customer_type),
              updated_at = CURRENT_TIMESTAMP
            WHERE company_id = $9 AND phone = $10`,
            [
              customer.name, customer.email, customer.address,
              customer.city, customer.state, customer.pincode,
              customer.gstin, customer.customer_type || 'regular',
              req.user!.companyId, customer.phone
            ]
          );
        } else {
          // Insert new customer
          await query(
            `INSERT INTO customers (
              company_id, name, phone, email, address, city,
              state, pincode, gstin, customer_type, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              req.user!.companyId, customer.name, customer.phone,
              customer.email, customer.address, customer.city,
              customer.state, customer.pincode, customer.gstin,
              customer.customer_type || 'regular', req.user!.userId
            ]
          );
        }
        successCount++;
      } catch (error) {
        errors.push({
          row: customers.indexOf(customer) + 1,
          name: customer.name,
          phone: customer.phone,
          error: error instanceof Error ? error.message : 'Import failed'
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalRecords: customers.length,
        successCount,
        failedCount: errors.length,
        errors: errors.slice(0, 10) // Return first 10 errors
      }
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import customers'
    });
  }
};