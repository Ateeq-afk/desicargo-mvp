import { Request, Response } from 'express';
import { pool, queryWithTenant } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantAuthRequest } from '../types';
import { sendPaymentReminder } from '../services/whatsapp.service';

// Get Customers for Billing
export const getCustomersForBilling = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { search = '', limit = 20, payment_type = 'TBB' } = req.query;

    let whereClause = `WHERE c.tenant_id = $1 AND c.is_active = true`;
    const params: any[] = [req.tenantId!];
    let paramIndex = 2;

    // Filter by payment type if specified
    if (payment_type && payment_type !== 'ALL') {
      whereClause += ` AND (c.customer_type = $${paramIndex} OR c.payment_mode = $${paramIndex})`;
      params.push(String(payment_type).toLowerCase());
      paramIndex++;
    }

    // Add search functionality
    if (search && String(search).length >= 2) {
      whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR c.gstin ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const customers = await queryWithTenant(
      `SELECT 
        c.id, c.name, c.phone, c.email, c.address, c.city, c.state,
        c.gstin, c.customer_type, c.credit_limit, c.credit_days,
        c.current_outstanding, c.payment_mode,
        COALESCE(c.total_bookings, 0) as total_bookings,
        COALESCE(c.total_business_value, 0) as total_business_value,
        c.last_booking_date,
        -- Credit utilization percentage
        CASE 
          WHEN c.credit_limit > 0 THEN ROUND((c.current_outstanding / c.credit_limit * 100)::numeric, 2)
          ELSE 0 
        END as credit_utilization_pct,
        -- Available credit
        CASE 
          WHEN c.credit_limit > c.current_outstanding THEN c.credit_limit - c.current_outstanding
          ELSE 0 
        END as available_credit
      FROM customers c
      ${whereClause}
      ORDER BY 
        CASE WHEN c.name ILIKE $1 THEN 1
             WHEN c.phone ILIKE $1 THEN 2
             ELSE 3 END,
        c.total_bookings DESC, c.name
      LIMIT $${paramIndex}`,
      [...params, Number(limit)],
      req.tenantId!
    );

    res.json({
      success: true,
      data: customers.rows
    });
  } catch (error) {
    console.error('Error fetching customers for billing:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch customers for billing'
    });
  }
};

// Check Customer Credit Limit
export const checkCustomerCreditLimit = async (req: TenantAuthRequest, res: Response): Promise<Response> => {
  try {
    const { customer_id } = req.params;
    const { booking_amount = 0 } = req.query;

    const customer = await queryWithTenant(
      `SELECT 
        id, name, credit_limit, current_outstanding, credit_days,
        CASE 
          WHEN credit_limit > 0 THEN credit_limit - current_outstanding
          ELSE 999999 
        END as available_credit,
        CASE 
          WHEN credit_limit > 0 THEN ROUND((current_outstanding / credit_limit * 100)::numeric, 2)
          ELSE 0 
        END as credit_utilization_pct
      FROM customers 
      WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
      [customer_id, req.tenantId!],
      req.tenantId!
    );

    if (!customer.rows[0]) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const customerData = customer.rows[0];
    const requestedAmount = Number(booking_amount);
    const availableCredit = Number(customerData.available_credit);
    const isWithinLimit = availableCredit >= requestedAmount;

    return res.json({
      success: true,
      data: {
        customer: customerData,
        requested_amount: requestedAmount,
        available_credit: availableCredit,
        is_within_limit: isWithinLimit,
        credit_check: {
          status: isWithinLimit ? 'approved' : 'exceeded',
          message: isWithinLimit 
            ? 'Credit limit check passed'
            : `Credit limit exceeded. Available: ₹${availableCredit.toFixed(2)}, Requested: ₹${requestedAmount.toFixed(2)}`,
          exceeds_by: isWithinLimit ? 0 : requestedAmount - availableCredit
        }
      }
    });
  } catch (error) {
    console.error('Error checking customer credit limit:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check customer credit limit'
    });
  }
};

// Generate Invoice Number
const generateInvoiceNumber = async (branchId: string): Promise<string> => {
  const client = await pool.connect();
  try {
    // Get branch code
    const branchResult = await client.query(
      'SELECT code FROM branches WHERE id = $1',
      [branchId]
    );
    
    if (!branchResult.rows[0]) {
      throw new Error('Branch not found');
    }
    
    const branchCode = branchResult.rows[0].code;
    const year = new Date().getFullYear();
    const financialYear = new Date().getMonth() >= 3 ? year : year - 1; // April to March
    
    // Get the latest invoice number for this branch and financial year
    const result = await client.query(
      `SELECT invoice_number FROM invoices 
       WHERE branch_id = $1 
       AND invoice_number LIKE $2
       ORDER BY created_at DESC 
       LIMIT 1`,
      [branchId, `INV/${branchCode}/${financialYear}/%`]
    );
    
    let sequence = 1;
    if (result.rows[0]) {
      const lastNumber = result.rows[0].invoice_number;
      const lastSequence = parseInt(lastNumber.split('/').pop());
      sequence = lastSequence + 1;
    }
    
    return `INV/${branchCode}/${financialYear}/${sequence.toString().padStart(4, '0')}`;
  } finally {
    client.release();
  }
};

// Generate Invoice
export const generateInvoice = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      customer_id,
      from_date,
      to_date,
      branch_id,
      include_delivered_only = true
    } = req.body;
    
    if (!customer_id || !from_date || !to_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer ID, from date and to date are required' 
      });
    }
    
    const effectiveBranchId = branch_id || req.user?.branchId;
    
    // Get customer details with tenant isolation
    const customerResult = await queryWithTenant(
      'SELECT * FROM customers WHERE id = $1 AND (customer_type = $2 OR payment_type = $2) AND tenant_id = $3',
      [customer_id, 'tbb', (req as TenantAuthRequest).tenantId!],
      (req as TenantAuthRequest).tenantId!,
      req.user?.userId
    );
    
    if (!customerResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'TBB customer not found' 
      });
    }
    
    const customer = customerResult.rows[0];
    
    // Fetch TBB consignments for the customer in date range
    let consignmentQuery = `
      SELECT c.*, 
             fb.name as from_branch_name,
             tb.name as to_branch_name
      FROM consignments c
      LEFT JOIN branches fb ON c.from_branch_id = fb.id
      LEFT JOIN branches tb ON c.to_branch_id = tb.id
      WHERE c.consignor_id = $1
      AND c.booking_date >= $2
      AND c.booking_date <= $3
      AND c.payment_type = 'tbb'
      AND c.invoice_id IS NULL
    `;
    
    const queryParams: any[] = [customer_id, from_date, to_date];
    let paramCount = 3;
    
    if (include_delivered_only) {
      consignmentQuery += ' AND c.delivery_status = $' + (++paramCount);
      queryParams.push('delivered');
    }
    
    if (branch_id) {
      consignmentQuery += ' AND c.from_branch_id = $' + (++paramCount);
      queryParams.push(branch_id);
    }
    
    consignmentQuery += ' ORDER BY c.booking_date, c.cn_number';
    
    const consignmentsResult = await client.query(consignmentQuery, queryParams);
    const consignments = consignmentsResult.rows;
    
    if (consignments.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No unbilled consignments found for the specified period' 
      });
    }
    
    // Calculate totals and tax breakdown
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalPackages = 0;
    let totalWeight = 0;
    
    // Group by tax rate for proper calculation
    const taxGroups: { [key: string]: number } = {};
    
    consignments.forEach(consignment => {
      const basicAmount = consignment.basic_freight + (consignment.other_charges || 0);
      subtotal += basicAmount;
      totalPackages += consignment.packages || 0;
      totalWeight += consignment.actual_weight || 0;
      
      if (consignment.cgst_amount) {
        totalCgst += consignment.cgst_amount;
        totalSgst += consignment.sgst_amount || 0;
        const taxRate = `${consignment.cgst_percent + (consignment.sgst_percent || 0)}%_CGST_SGST`;
        taxGroups[taxRate] = (taxGroups[taxRate] || 0) + basicAmount;
      } else if (consignment.igst_amount) {
        totalIgst += consignment.igst_amount;
        const taxRate = `${consignment.igst_percent}%_IGST`;
        taxGroups[taxRate] = (taxGroups[taxRate] || 0) + basicAmount;
      }
    });
    
    const totalAmount = subtotal + totalCgst + totalSgst + totalIgst;
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(effectiveBranchId);
    
    // Create invoice record
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
        invoice_number, customer_id, branch_id, from_date, to_date,
        subtotal, cgst_amount, sgst_amount, igst_amount, total_amount,
        total_consignments, total_packages, total_weight,
        payment_status, outstanding_amount, created_by, tax_breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      RETURNING *`,
      [
        invoiceNumber,
        customer_id,
        effectiveBranchId,
        from_date,
        to_date,
        subtotal,
        totalCgst,
        totalSgst,
        totalIgst,
        totalAmount,
        consignments.length,
        totalPackages,
        totalWeight,
        'unpaid',
        totalAmount,
        req.user?.userId,
        JSON.stringify(taxGroups)
      ]
    );
    
    const invoice = invoiceResult.rows[0];
    
    // Update consignments with invoice_id
    await client.query(
      `UPDATE consignments 
       SET invoice_id = $1, 
           invoiced_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($2::uuid[])`,
      [invoice.id, consignments.map(c => c.id)]
    );
    
    // Create invoice_consignments mapping
    for (const consignment of consignments) {
      await client.query(
        `INSERT INTO invoice_consignments (invoice_id, consignment_id) 
         VALUES ($1, $2)`,
        [invoice.id, consignment.id]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        ...invoice,
        customer,
        consignments_count: consignments.length
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Get Invoice Details
export const getInvoiceDetails = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    
    // Get invoice with customer and branch details
    const invoiceResult = await pool.query(
      `SELECT i.*, 
              c.name as customer_name, c.address as customer_address, 
              c.gstin as customer_gstin, c.phone as customer_phone,
              c.email as customer_email, c.credit_limit,
              b.name as branch_name, b.address as branch_address,
              b.gstin as branch_gstin, b.phone as branch_phone,
              u.username as created_by_name
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN branches b ON i.branch_id = b.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = $1`,
      [id]
    );
    
    if (!invoiceResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Get included consignments
    const consignmentsResult = await pool.query(
      `SELECT c.*, 
              fb.name as from_branch_name,
              tb.name as to_branch_name
       FROM consignments c
       JOIN invoice_consignments ic ON c.id = ic.consignment_id
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       WHERE ic.invoice_id = $1
       ORDER BY c.booking_date, c.cn_number`,
      [id]
    );
    
    // Get payment history
    const paymentsResult = await pool.query(
      `SELECT p.*, u.username as received_by_name
       FROM payments p
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.invoice_id = $1
       ORDER BY p.payment_date DESC`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...invoice,
        consignments: consignmentsResult.rows,
        payments: paymentsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch invoice details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Record Payment
export const recordPayment = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { invoice_id } = req.params;
    const {
      payment_amount,
      payment_mode,
      payment_reference,
      payment_date,
      cheque_number,
      cheque_date,
      bank_name,
      remarks
    } = req.body;
    
    if (!payment_amount || !payment_mode || !payment_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment amount, mode and date are required' 
      });
    }
    
    // Get invoice details
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1',
      [invoice_id]
    );
    
    if (!invoiceResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Validate payment amount
    if (payment_amount > invoice.outstanding_amount) {
      return res.status(400).json({ 
        success: false, 
        message: `Payment amount cannot exceed outstanding amount of ₹${invoice.outstanding_amount}` 
      });
    }
    
    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (
        invoice_id, payment_amount, payment_mode, payment_reference,
        payment_date, cheque_number, cheque_date, bank_name,
        remarks, received_by, branch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *`,
      [
        invoice_id,
        payment_amount,
        payment_mode,
        payment_reference,
        payment_date,
        cheque_number,
        cheque_date,
        bank_name,
        remarks,
        req.user?.userId,
        req.user?.branchId
      ]
    );
    
    const payment = paymentResult.rows[0];
    
    // Update invoice outstanding amount and status
    const newOutstanding = invoice.outstanding_amount - payment_amount;
    const newStatus = newOutstanding === 0 ? 'paid' : 'partial';
    
    await client.query(
      `UPDATE invoices 
       SET outstanding_amount = $1,
           payment_status = $2,
           last_payment_date = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newOutstanding, newStatus, payment_date, invoice_id]
    );
    
    // Update customer last payment date
    await client.query(
      `UPDATE customers 
       SET last_payment_date = $1
       WHERE id = $2`,
      [payment_date, invoice.customer_id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        ...payment,
        invoice_number: invoice.invoice_number,
        outstanding_amount: newOutstanding,
        payment_status: newStatus
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to record payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Get Outstanding Report
export const getOutstandingReport = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { customer_id, aging_as_on } = req.query;
    const asOnDate = aging_as_on || new Date().toISOString().split('T')[0];
    
    let query = `
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.credit_limit,
        COUNT(i.id) as total_invoices,
        SUM(CASE WHEN i.outstanding_amount > 0 THEN 1 ELSE 0 END) as unpaid_invoices,
        COALESCE(SUM(i.outstanding_amount), 0) as total_outstanding,
        COALESCE(SUM(CASE 
          WHEN i.outstanding_amount > 0 AND 
               DATE_PART('day', $1::date - i.invoice_date) <= 30 
          THEN i.outstanding_amount ELSE 0 END), 0) as age_0_30,
        COALESCE(SUM(CASE 
          WHEN i.outstanding_amount > 0 AND 
               DATE_PART('day', $1::date - i.invoice_date) BETWEEN 31 AND 60 
          THEN i.outstanding_amount ELSE 0 END), 0) as age_31_60,
        COALESCE(SUM(CASE 
          WHEN i.outstanding_amount > 0 AND 
               DATE_PART('day', $1::date - i.invoice_date) BETWEEN 61 AND 90 
          THEN i.outstanding_amount ELSE 0 END), 0) as age_61_90,
        COALESCE(SUM(CASE 
          WHEN i.outstanding_amount > 0 AND 
               DATE_PART('day', $1::date - i.invoice_date) > 90 
          THEN i.outstanding_amount ELSE 0 END), 0) as age_90_plus,
        MAX(i.invoice_date) as last_invoice_date,
        MAX(i.last_payment_date) as last_payment_date
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      WHERE c.customer_type = 'tbb'
    `;
    
    const params: any[] = [asOnDate];
    
    if (customer_id) {
      query += ' AND c.id = $2';
      params.push(customer_id);
    }
    
    if (req.user?.branchId) {
      query += params.length === 1 ? ' AND i.branch_id = $2' : ' AND i.branch_id = $3';
      params.push(req.user.branchId);
    }
    
    query += ` GROUP BY c.id, c.name, c.phone, c.credit_limit
               HAVING COALESCE(SUM(i.outstanding_amount), 0) > 0
               ORDER BY total_outstanding DESC`;
    
    const result = await pool.query(query, params);
    
    // Calculate summary
    const summary = result.rows.reduce((acc, row) => ({
      total_customers: acc.total_customers + 1,
      total_outstanding: acc.total_outstanding + parseFloat(row.total_outstanding),
      age_0_30: acc.age_0_30 + parseFloat(row.age_0_30),
      age_31_60: acc.age_31_60 + parseFloat(row.age_31_60),
      age_61_90: acc.age_61_90 + parseFloat(row.age_61_90),
      age_90_plus: acc.age_90_plus + parseFloat(row.age_90_plus)
    }), {
      total_customers: 0,
      total_outstanding: 0,
      age_0_30: 0,
      age_31_60: 0,
      age_61_90: 0,
      age_90_plus: 0
    });
    
    res.json({
      success: true,
      data: {
        as_on_date: asOnDate,
        summary,
        customers: result.rows.map(row => ({
          ...row,
          credit_utilization: row.credit_limit > 0 
            ? ((row.total_outstanding / row.credit_limit) * 100).toFixed(2) + '%'
            : 'N/A'
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching outstanding report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch outstanding report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get Invoice List
export const getInvoiceList = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { 
      customer_id, 
      from_date, 
      to_date, 
      payment_status,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = `
      SELECT i.*, 
             c.name as customer_name,
             b.name as branch_name,
             u.username as created_by_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN branches b ON i.branch_id = b.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    if (req.user?.branchId) {
      query += ` AND i.branch_id = $${++paramCount}`;
      params.push(req.user.branchId);
    }
    
    if (customer_id) {
      query += ` AND i.customer_id = $${++paramCount}`;
      params.push(customer_id);
    }
    
    if (from_date) {
      query += ` AND i.invoice_date >= $${++paramCount}`;
      params.push(from_date);
    }
    
    if (to_date) {
      query += ` AND i.invoice_date <= $${++paramCount}`;
      params.push(to_date);
    }
    
    if (payment_status) {
      query += ` AND i.payment_status = $${++paramCount}`;
      params.push(payment_status);
    }
    
    // Get total count
    const countResult = await pool.query(
      query.replace('SELECT i.*,', 'SELECT COUNT(*)').split('FROM')[0] + 
      ' FROM' + query.split('FROM')[1],
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Add pagination
    query += ` ORDER BY i.invoice_date DESC, i.created_at DESC`;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching invoice list:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch invoice list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get Customer Invoices
export const getCustomerInvoices = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { payment_status, limit = 10 } = req.query;
    
    let query = `
      SELECT i.*, 
             b.name as branch_name
      FROM invoices i
      LEFT JOIN branches b ON i.branch_id = b.id
      WHERE i.customer_id = $1
    `;
    
    const params: any[] = [id];
    
    if (payment_status) {
      query += ' AND i.payment_status = $2';
      params.push(payment_status);
    }
    
    query += ' ORDER BY i.invoice_date DESC';
    
    if (limit !== 'all') {
      query += ` LIMIT ${parseInt(limit as string)}`;
    }
    
    const result = await pool.query(query, params);
    
    // Get customer details
    const customerResult = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );
    
    if (!customerResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        customer: customerResult.rows[0],
        invoices: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch customer invoices',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get Daily Collection Report
export const getDailyCollection = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    // Get payments for the day
    const paymentsQuery = `
      SELECT p.*, 
             i.invoice_number,
             c.name as customer_name,
             u.username as received_by_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON p.received_by = u.id
      WHERE DATE(p.payment_date) = $1
    `;
    
    const params: any[] = [date];
    
    if (req.user?.branchId) {
      paymentsQuery.replace('WHERE', 'WHERE p.branch_id = $2 AND');
      params.unshift(req.user.branchId);
    }
    
    const paymentsResult = await pool.query(
      paymentsQuery + ' ORDER BY p.created_at DESC',
      params
    );
    
    // Calculate mode-wise summary
    const modeSummary = paymentsResult.rows.reduce((acc, payment) => {
      if (!acc[payment.payment_mode]) {
        acc[payment.payment_mode] = {
          count: 0,
          amount: 0
        };
      }
      acc[payment.payment_mode].count++;
      acc[payment.payment_mode].amount += parseFloat(payment.payment_amount);
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);
    
    // Calculate user-wise summary
    const userSummary = paymentsResult.rows.reduce((acc, payment) => {
      const userName = payment.received_by_name || 'Unknown';
      if (!acc[userName]) {
        acc[userName] = {
          count: 0,
          amount: 0
        };
      }
      acc[userName].count++;
      acc[userName].amount += parseFloat(payment.payment_amount);
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);
    
    const totalCollection = paymentsResult.rows.reduce(
      (sum, payment) => sum + parseFloat(payment.payment_amount), 
      0
    );
    
    res.json({
      success: true,
      data: {
        date,
        total_collection: totalCollection,
        total_payments: paymentsResult.rows.length,
        mode_summary: modeSummary,
        user_summary: userSummary,
        payments: paymentsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching daily collection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch daily collection report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Cancel Invoice
export const cancelInvoice = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { cancellation_reason } = req.body;
    
    if (!cancellation_reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cancellation reason is required' 
      });
    }
    
    // Get invoice details
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (!invoiceResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }
    
    const invoice = invoiceResult.rows[0];
    
    // Check if invoice has any payments
    if (invoice.payment_status !== 'unpaid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel invoice with payments. Please create a credit note instead.' 
      });
    }
    
    // Update invoice status
    await client.query(
      `UPDATE invoices 
       SET status = 'cancelled',
           cancellation_reason = $1,
           cancelled_by = $2,
           cancelled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [cancellation_reason, req.user?.userId, id]
    );
    
    // Remove invoice_id from consignments
    await client.query(
      `UPDATE consignments 
       SET invoice_id = NULL,
           invoiced_date = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE invoice_id = $1`,
      [id]
    );
    
    // Delete invoice_consignments mapping
    await client.query(
      'DELETE FROM invoice_consignments WHERE invoice_id = $1',
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: {
        invoice_number: invoice.invoice_number,
        cancellation_reason
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// Generate Customer Statement
export const generateCustomerStatement = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { from_date, to_date } = req.query;
    
    if (!from_date || !to_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'From date and to date are required' 
      });
    }
    
    // Get customer details
    const customerResult = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );
    
    if (!customerResult.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Customer not found' 
      });
    }
    
    const customer = customerResult.rows[0];
    
    // Get opening balance (outstanding amount before from_date)
    const openingBalanceResult = await pool.query(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as opening_balance
       FROM invoices
       WHERE customer_id = $1
       AND invoice_date < $2
       AND status != 'cancelled'`,
      [id, from_date]
    );
    
    const openingBalance = parseFloat(openingBalanceResult.rows[0].opening_balance);
    
    // Get transactions during period
    const transactionsQuery = `
      WITH transactions AS (
        -- Invoices
        SELECT 
          invoice_date as transaction_date,
          'Invoice' as transaction_type,
          invoice_number as reference,
          total_amount as debit,
          0 as credit,
          total_consignments || ' consignments' as particulars
        FROM invoices
        WHERE customer_id = $1
        AND invoice_date BETWEEN $2 AND $3
        AND status != 'cancelled'
        
        UNION ALL
        
        -- Payments
        SELECT 
          p.payment_date as transaction_date,
          'Payment' as transaction_type,
          p.payment_mode || ' - ' || COALESCE(p.payment_reference, '') as reference,
          0 as debit,
          p.payment_amount as credit,
          'Payment received' as particulars
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        WHERE i.customer_id = $1
        AND p.payment_date BETWEEN $2 AND $3
      )
      SELECT * FROM transactions
      ORDER BY transaction_date, transaction_type DESC
    `;
    
    const transactionsResult = await pool.query(
      transactionsQuery,
      [id, from_date, to_date]
    );
    
    // Calculate running balance
    let runningBalance = openingBalance;
    const transactions = transactionsResult.rows.map(transaction => {
      runningBalance += parseFloat(transaction.debit) - parseFloat(transaction.credit);
      return {
        ...transaction,
        balance: runningBalance
      };
    });
    
    // Get current outstanding
    const outstandingResult = await pool.query(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as current_outstanding
       FROM invoices
       WHERE customer_id = $1
       AND status != 'cancelled'`,
      [id]
    );
    
    const currentOutstanding = parseFloat(outstandingResult.rows[0].current_outstanding);
    
    res.json({
      success: true,
      data: {
        customer,
        statement_period: {
          from_date,
          to_date
        },
        opening_balance: openingBalance,
        transactions,
        closing_balance: runningBalance,
        current_outstanding: currentOutstanding
      }
    });
  } catch (error) {
    console.error('Error generating customer statement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate customer statement',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Send Payment Reminders
export const sendPaymentReminders = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { customer_ids, overdue_days = 7 } = req.body;
    
    // Build query to get overdue invoices
    let query = `
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.outstanding_amount,
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        DATE_PART('day', CURRENT_DATE - i.invoice_date) as days_overdue
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.outstanding_amount > 0
      AND i.status != 'cancelled'
      AND DATE_PART('day', CURRENT_DATE - i.invoice_date) >= $1
    `;
    
    const params: any[] = [overdue_days];
    let paramCount = 1;
    
    if (customer_ids && customer_ids.length > 0) {
      paramCount++;
      query += ` AND c.id = ANY($${paramCount}::uuid[])`;
      params.push(customer_ids);
    }
    
    if (req.user?.branchId) {
      paramCount++;
      query += ` AND i.branch_id = $${paramCount}`;
      params.push(req.user.branchId);
    }
    
    query += ` ORDER BY c.name, i.invoice_date DESC`;
    
    const result = await pool.query(query, params);
    
    let successCount = 0;
    let failureCount = 0;
    const results: any[] = [];
    
    // Group by customer to avoid multiple messages to same customer
    const customerGroups = result.rows.reduce((acc, invoice) => {
      const customerId = invoice.customer_id;
      if (!acc[customerId]) {
        acc[customerId] = {
          customer_name: invoice.customer_name,
          customer_phone: invoice.customer_phone,
          invoices: [],
          total_outstanding: 0
        };
      }
      acc[customerId].invoices.push(invoice);
      acc[customerId].total_outstanding += parseFloat(invoice.outstanding_amount);
      return acc;
    }, {} as Record<string, any>);
    
    // Send WhatsApp reminders
    for (const customerId in customerGroups) {
      const group = customerGroups[customerId];
      
      if (!group.customer_phone) {
        failureCount++;
        results.push({
          customer_name: group.customer_name,
          status: 'failed',
          reason: 'No phone number'
        });
        continue;
      }
      
      try {
        // Calculate due date (typically 30 days from invoice date)
        const oldestInvoice = group.invoices[group.invoices.length - 1];
        const dueDate = new Date(oldestInvoice.invoice_date);
        dueDate.setDate(dueDate.getDate() + 30);
        
        // Get oldest CN number for reference
        const oldestCn = await pool.query(
          `SELECT c.cn_number 
           FROM consignments c
           JOIN invoice_consignments ic ON c.id = ic.consignment_id
           WHERE ic.invoice_id = $1
           ORDER BY c.booking_date
           LIMIT 1`,
          [oldestInvoice.id]
        );
        
        const cnReference = oldestCn.rows[0]?.cn_number || 'Multiple';
        
        // Create payment link (placeholder - integrate with payment gateway)
        const paymentLink = `https://app.desicargo.com/payment/${customerId}?amount=${group.total_outstanding}`;
        
        await sendPaymentReminder(group.customer_phone, {
          cnNumber: cnReference,
          consigneeName: group.customer_name,
          pendingAmount: group.total_outstanding,
          dueDate: dueDate.toLocaleDateString('en-IN'),
          paymentLink: paymentLink
        });
        
        successCount++;
        results.push({
          customer_name: group.customer_name,
          customer_phone: group.customer_phone,
          pending_amount: group.total_outstanding,
          invoices_count: group.invoices.length,
          status: 'sent'
        });
        
        // Log reminder activity (assuming you have this table)
        try {
          await pool.query(
            `INSERT INTO payment_reminders (
              customer_id, total_outstanding, invoices_count, 
              reminder_type, sent_to, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              customerId,
              group.total_outstanding,
              group.invoices.length,
              'whatsapp',
              group.customer_phone,
              req.user?.userId
            ]
          );
        } catch (logError) {
          // Table might not exist, ignore logging error
          console.warn('Payment reminder logging failed:', logError);
        }
        
      } catch (error) {
        failureCount++;
        results.push({
          customer_name: group.customer_name,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      message: `Payment reminders sent. Success: ${successCount}, Failed: ${failureCount}`,
      data: {
        success_count: successCount,
        failure_count: failureCount,
        total_customers: Object.keys(customerGroups).length,
        results: results
      }
    });
  } catch (error) {
    console.error('Error sending payment reminders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send payment reminders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};