import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { query, withTransaction } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendBookingConfirmation, sendDeliveryNotification } from '../services/whatsapp.service';

// Generate consignment number format: BRN2025000001
const generateCNNumber = async (branchId: string): Promise<string> => {
  try {
    // Get branch code
    const branchResult = await query(
      'SELECT branch_code FROM branches WHERE id = $1',
      [branchId]
    );

    if (branchResult.rows.length === 0) {
      throw new AppError('Branch not found', 404);
    }

    const branchCode = branchResult.rows[0].branch_code;
    const year = new Date().getFullYear();

    // Get the last CN number for this branch and year
    const lastCNResult = await query(
      `SELECT cn_number FROM consignments 
       WHERE from_branch_id = $1 
       AND cn_number LIKE $2 
       ORDER BY cn_number DESC 
       LIMIT 1`,
      [branchId, `${branchCode}${year}%`]
    );

    let sequence = 1;
    if (lastCNResult.rows.length > 0) {
      const lastCN = lastCNResult.rows[0].cn_number;
      const lastSequence = parseInt(lastCN.slice(-6));
      sequence = lastSequence + 1;
    }

    // Format: BRN2025000001
    const cnNumber = `${branchCode}${year}${sequence.toString().padStart(6, '0')}`;
    return cnNumber;
  } catch (error) {
    throw error;
  }
};

// Calculate GST based on state
const calculateGST = (amount: number, fromState: string, toState: string) => {
  const gstRate = 0.18; // 18%
  const gstAmount = amount * gstRate;

  if (fromState === toState) {
    // Same state - split into CGST and SGST
    return {
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: 0,
      total: gstAmount
    };
  } else {
    // Different state - IGST only
    return {
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      total: gstAmount
    };
  }
};

// Create new consignment
export const createConsignment = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array()
    });
    return;
  }

  try {
    const consignmentData = req.body;
    const userId = req.user?.userId;
    const companyId = req.user?.companyId;

    // Get from and to branch states for GST calculation
    const branchStatesResult = await query(
      `SELECT 
        fb.state as from_state,
        tb.state as to_state
       FROM branches fb, branches tb
       WHERE fb.id = $1 AND tb.id = $2`,
      [consignmentData.from_branch_id, consignmentData.to_branch_id]
    );

    if (branchStatesResult.rows.length === 0) {
      throw new AppError('Invalid branch IDs', 400);
    }

    const { from_state, to_state } = branchStatesResult.rows[0];

    // Calculate total charges
    const subtotal = 
      parseFloat(consignmentData.freight_amount || 0) +
      parseFloat(consignmentData.hamali_charges || 0) +
      parseFloat(consignmentData.door_delivery_charges || 0) +
      parseFloat(consignmentData.loading_charges || 0) +
      parseFloat(consignmentData.unloading_charges || 0) +
      parseFloat(consignmentData.other_charges || 0) +
      parseFloat(consignmentData.statistical_charges || 0);

    // Calculate GST
    const gst = calculateGST(subtotal, from_state, to_state);
    const totalAmount = subtotal + gst.total;

    // Generate CN number
    const cnNumber = await generateCNNumber(consignmentData.from_branch_id);

    // Insert consignment
    const insertResult = await query(
      `INSERT INTO consignments (
        company_id, cn_number, booking_date, booking_time,
        from_branch_id, to_branch_id,
        consignor_id, consignor_name, consignor_phone, consignor_address, consignor_gstin,
        consignee_name, consignee_phone, consignee_address, consignee_pincode,
        goods_description, goods_value, eway_bill_number, invoice_number,
        no_of_packages, actual_weight, charged_weight,
        freight_amount, hamali_charges, door_delivery_charges,
        loading_charges, unloading_charges, other_charges, statistical_charges,
        gst_percentage, cgst, sgst, igst, total_amount,
        payment_type, delivery_type, status, current_branch_id,
        created_by
      ) VALUES (
        $1, $2, CURRENT_DATE, CURRENT_TIME,
        $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26, $27,
        $28, $29, $30, $31, $32,
        $33, $34, $35, $36,
        $37
      ) RETURNING *`,
      [
        companyId,
        cnNumber,
        consignmentData.from_branch_id,
        consignmentData.to_branch_id,
        consignmentData.consignor_id || null,
        consignmentData.consignor_name,
        consignmentData.consignor_phone,
        consignmentData.consignor_address || null,
        consignmentData.consignor_gstin || null,
        consignmentData.consignee_name,
        consignmentData.consignee_phone,
        consignmentData.consignee_address || null,
        consignmentData.consignee_pincode || null,
        consignmentData.goods_description || null,
        consignmentData.goods_value || null,
        consignmentData.eway_bill_number || null,
        consignmentData.invoice_number || null,
        consignmentData.no_of_packages,
        consignmentData.actual_weight || null,
        consignmentData.charged_weight || consignmentData.actual_weight,
        consignmentData.freight_amount,
        consignmentData.hamali_charges || 0,
        consignmentData.door_delivery_charges || 0,
        consignmentData.loading_charges || 0,
        consignmentData.unloading_charges || 0,
        consignmentData.other_charges || 0,
        consignmentData.statistical_charges || 0,
        18, // GST percentage
        gst.cgst,
        gst.sgst,
        gst.igst,
        totalAmount,
        consignmentData.payment_type,
        consignmentData.delivery_type || 'godown',
        'booked',
        consignmentData.from_branch_id,
        userId
      ]
    );

    // Add to tracking history
    await query(
      `INSERT INTO tracking_history (
        consignment_id, status, location, branch_id, created_by
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        insertResult.rows[0].id,
        'booked',
        'Consignment booked',
        consignmentData.from_branch_id,
        userId
      ]
    );

    // Send WhatsApp booking confirmation
    const insertedConsignment = insertResult.rows[0];
    try {
      // Get branch details for city names
      const branchDetailsResult = await query(
        `SELECT 
          fb.city as from_city,
          tb.city as to_city
         FROM branches fb, branches tb
         WHERE fb.id = $1 AND tb.id = $2`,
        [insertedConsignment.from_branch_id, insertedConsignment.to_branch_id]
      );

      if (branchDetailsResult.rows.length > 0) {
        const { from_city, to_city } = branchDetailsResult.rows[0];
        
        await sendBookingConfirmation(insertedConsignment.consignor_phone, {
          cnNumber: insertedConsignment.cn_number,
          consignorName: insertedConsignment.consignor_name,
          consigneeName: insertedConsignment.consignee_name,
          fromCity: from_city,
          toCity: to_city,
          packages: insertedConsignment.no_of_packages,
          totalAmount: insertedConsignment.total_amount,
          bookingDate: new Date(insertedConsignment.booking_date).toLocaleDateString('en-IN')
        });
      }
    } catch (whatsappError) {
      console.error('WhatsApp booking notification failed:', whatsappError);
      // Don't fail the booking if WhatsApp fails
    }

    res.status(201).json({
      success: true,
      data: insertResult.rows[0],
      message: 'Consignment booked successfully'
    });
  } catch (error) {
    console.error('Create consignment error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create consignment'
    });
  }
};

// Get consignment by CN number
export const getConsignmentByCN = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cnNumber } = req.params;

    const result = await query(
      `SELECT 
        c.*,
        fb.name as from_branch_name,
        fb.city as from_city,
        tb.name as to_branch_name,
        tb.city as to_city,
        cb.name as current_branch_name,
        u.full_name as booked_by
       FROM consignments c
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       LEFT JOIN branches cb ON c.current_branch_id = cb.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.cn_number = $1 AND c.company_id = $2`,
      [cnNumber, req.user?.companyId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Consignment not found'
      });
      return;
    }

    // Get tracking history
    const trackingResult = await query(
      `SELECT 
        th.*,
        b.name as branch_name,
        u.full_name as updated_by
       FROM tracking_history th
       LEFT JOIN branches b ON th.branch_id = b.id
       LEFT JOIN users u ON th.created_by = u.id
       WHERE th.consignment_id = $1
       ORDER BY th.created_at DESC`,
      [result.rows[0].id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        tracking_history: trackingResult.rows
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch consignment'
    });
  }
};

// List consignments with filters and pagination
export const listConsignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 50,
      from_date,
      to_date,
      branch_id,
      status,
      payment_type,
      search
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereConditions = ['c.company_id = $1'];
    let queryParams: any[] = [req.user?.companyId];
    let paramCount = 1;

    // Add filters
    if (from_date) {
      paramCount++;
      whereConditions.push(`c.booking_date >= $${paramCount}`);
      queryParams.push(from_date);
    }

    if (to_date) {
      paramCount++;
      whereConditions.push(`c.booking_date <= $${paramCount}`);
      queryParams.push(to_date);
    }

    if (branch_id) {
      paramCount++;
      whereConditions.push(`(c.from_branch_id = $${paramCount} OR c.to_branch_id = $${paramCount})`);
      queryParams.push(branch_id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`c.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (payment_type) {
      paramCount++;
      whereConditions.push(`c.payment_type = $${paramCount}`);
      queryParams.push(payment_type);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(
        c.cn_number ILIKE $${paramCount} OR
        c.consignor_name ILIKE $${paramCount} OR
        c.consignee_name ILIKE $${paramCount} OR
        c.consignor_phone ILIKE $${paramCount} OR
        c.consignee_phone ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM consignments c WHERE ${whereClause}`,
      queryParams
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get consignments
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const result = await query(
      `SELECT 
        c.*,
        fb.name as from_branch_name,
        fb.city as from_city,
        tb.name as to_branch_name,
        tb.city as to_city,
        cb.name as current_branch_name
       FROM consignments c
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       LEFT JOIN branches cb ON c.current_branch_id = cb.id
       WHERE ${whereClause}
       ORDER BY c.booking_date DESC, c.booking_time DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      queryParams
    );

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
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch consignments'
    });
  }
};

// Update consignment status
export const updateConsignmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, remarks, branch_id } = req.body;

    const validStatuses = ['booked', 'picked', 'in_transit', 'reached', 'out_for_delivery', 'delivered', 'undelivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
      return;
    }

    await withTransaction(async (client) => {
      // Update consignment status
      const updateResult = await client.query(
        `UPDATE consignments 
         SET status = $1, 
             current_branch_id = COALESCE($2, current_branch_id),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND company_id = $4
         RETURNING *`,
        [status, branch_id || null, id, req.user?.companyId]
      );

      if (updateResult.rows.length === 0) {
        throw new AppError('Consignment not found', 404);
      }

      // Add to tracking history
      await client.query(
        `INSERT INTO tracking_history (
          consignment_id, status, location, branch_id, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          status,
          `Status updated to ${status}`,
          branch_id || updateResult.rows[0].current_branch_id,
          remarks || null,
          req.user?.userId
        ]
      );

      return updateResult.rows[0];
    });

    // Send WhatsApp delivery notification for significant status changes
    const consignmentData = await query(
      `SELECT 
        c.*,
        cb.city as current_city,
        cb.name as current_branch_name
       FROM consignments c
       LEFT JOIN branches cb ON c.current_branch_id = cb.id
       WHERE c.id = $1`,
      [id]
    );

    if (consignmentData.rows.length > 0) {
      const consignment = consignmentData.rows[0];
      const significantStatuses = ['picked', 'in_transit', 'reached', 'out_for_delivery', 'delivered'];
      
      if (significantStatuses.includes(status)) {
        try {
          // Determine which phone to send to based on status
          const phoneToNotify = ['delivered', 'out_for_delivery'].includes(status) 
            ? consignment.consignee_phone 
            : consignment.consignor_phone;

          if (phoneToNotify) {
            await sendDeliveryNotification(phoneToNotify, {
              cnNumber: consignment.cn_number,
              status: status,
              currentLocation: consignment.current_city || consignment.current_branch_name || 'In Transit',
              estimatedDelivery: status === 'reached' ? 'Within 24 hours' : undefined,
              deliveryType: consignment.delivery_type
            });
          }
        } catch (whatsappError) {
          console.error('WhatsApp delivery notification failed:', whatsappError);
          // Don't fail the status update if WhatsApp fails
        }
      }
    }

    res.json({
      success: true,
      message: 'Consignment status updated successfully'
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status'
    });
  }
};

// Get pending consignments for OGPL
export const getPendingForOGPL = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id, to_branch_id } = req.query;

    let whereConditions = [
      'c.company_id = $1',
      "c.status IN ('booked', 'picked')",
      'c.id NOT IN (SELECT consignment_id FROM ogpl_details)'
    ];
    let queryParams: any[] = [req.user?.companyId];
    let paramCount = 1;

    if (branch_id) {
      paramCount++;
      whereConditions.push(`c.current_branch_id = $${paramCount}`);
      queryParams.push(branch_id);
    }

    if (to_branch_id) {
      paramCount++;
      whereConditions.push(`c.to_branch_id = $${paramCount}`);
      queryParams.push(to_branch_id);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await query(
      `SELECT 
        c.*,
        fb.name as from_branch_name,
        tb.name as to_branch_name,
        tb.city as to_city
       FROM consignments c
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       WHERE ${whereClause}
       ORDER BY c.booking_date, c.booking_time`,
      queryParams
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending consignments'
    });
  }
};

// Track consignment (public endpoint)
export const trackConsignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cnNumber } = req.params;

    const result = await query(
      `SELECT 
        c.cn_number,
        c.booking_date,
        c.consignor_name,
        c.consignee_name,
        c.no_of_packages,
        c.status,
        c.delivery_type,
        fb.city as from_city,
        tb.city as to_city,
        cb.city as current_location
       FROM consignments c
       LEFT JOIN branches fb ON c.from_branch_id = fb.id
       LEFT JOIN branches tb ON c.to_branch_id = tb.id
       LEFT JOIN branches cb ON c.current_branch_id = cb.id
       WHERE c.cn_number = $1`,
      [cnNumber]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Consignment not found'
      });
      return;
    }

    // Get tracking history
    const trackingResult = await query(
      `SELECT 
        th.status,
        th.location,
        th.created_at,
        b.city as branch_city
       FROM tracking_history th
       LEFT JOIN branches b ON th.branch_id = b.id
       WHERE th.consignment_id = (SELECT id FROM consignments WHERE cn_number = $1)
       ORDER BY th.created_at DESC`,
      [cnNumber]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        tracking_history: trackingResult.rows
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to track consignment'
    });
  }
};