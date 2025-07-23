// Branch-aware updates for consignment controller

// Updated getConsignmentByCN with branch access control
export const getConsignmentByCN = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { cnNumber } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant context required', 401);
    }

    const result = await queryWithTenant(
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
       WHERE c.cn_number = $1`,
      [cnNumber],
      tenantId
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Consignment not found'
      });
      return;
    }

    const consignment = result.rows[0];
    
    // Check branch access for non-admin users
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin' && req.branchId) {
      if (consignment.from_branch_id !== req.branchId && consignment.to_branch_id !== req.branchId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }
    }

    // Get tracking history
    const trackingResult = await queryWithTenant(
      `SELECT 
        th.*,
        b.name as branch_name,
        u.full_name as updated_by
       FROM tracking_history th
       LEFT JOIN branches b ON th.branch_id = b.id
       LEFT JOIN users u ON th.created_by = u.id
       WHERE th.consignment_id = $1
       ORDER BY th.created_at DESC`,
      [consignment.id],
      tenantId
    );

    res.json({
      success: true,
      data: {
        ...consignment,
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

// Updated listConsignments with branch filtering
export const listConsignments = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant context required', 401);
    }

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
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramCount = 0;
    
    // Apply branch filtering for non-admin users
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin' && req.branchId) {
      paramCount++;
      whereConditions.push(`(c.from_branch_id = $${paramCount} OR c.to_branch_id = $${paramCount})`);
      queryParams.push(req.branchId);
    }

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

    // If specific branch_id is requested, add it as additional filter
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

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countResult = await queryWithTenant(
      `SELECT COUNT(*) FROM consignments c ${whereClause}`,
      queryParams,
      tenantId
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get consignments
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const result = await queryWithTenant(
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
       ${whereClause}
       ORDER BY c.booking_date DESC, c.booking_time DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      queryParams,
      tenantId
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

// Updated getPendingForOGPL with branch filtering
export const getPendingForOGPL = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id, to_branch_id } = req.query;
    const tenantId = req.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant context required', 401);
    }
    
    let whereConditions = [
      "c.status IN ('booked', 'picked')",
      'c.id NOT IN (SELECT consignment_id FROM ogpl_details od)'
    ];
    let queryParams: any[] = [];
    let paramCount = 0;
    
    // Apply branch filtering for non-admin users
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin' && req.branchId) {
      paramCount++;
      whereConditions.push(`(c.from_branch_id = $${paramCount} OR c.current_branch_id = $${paramCount})`);
      queryParams.push(req.branchId);
    }

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

    const result = await queryWithTenant(
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
      queryParams,
      tenantId
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

// Updated updateConsignmentStatus with branch validation
export const updateConsignmentStatus = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, remarks, branch_id } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant context required', 401);
    }

    const validStatuses = ['booked', 'picked', 'in_transit', 'reached', 'out_for_delivery', 'delivered', 'undelivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // First, fetch the consignment to check access
    const consignmentResult = await queryWithTenant(
      'SELECT * FROM consignments WHERE id = $1',
      [id],
      tenantId
    );

    if (consignmentResult.rows.length === 0) {
      throw new AppError('Consignment not found', 404);
    }

    const consignment = consignmentResult.rows[0];

    // Check branch access for non-admin users
    if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin' && req.branchId) {
      // Check if user has access to the consignment based on branch
      const hasAccess = 
        consignment.from_branch_id === req.branchId ||
        consignment.to_branch_id === req.branchId ||
        consignment.current_branch_id === req.branchId;
      
      if (!hasAccess) {
        throw new AppError('Access denied', 403);
      }
    }

    // Update the status
    const updateBranchId = branch_id || req.branchId;
    await withTenantTransaction(tenantId, async (client) => {
      // Update consignment status
      await client.query(
        `UPDATE consignments 
         SET status = $1, current_branch_id = COALESCE($2, current_branch_id)
         WHERE id = $3`,
        [status, updateBranchId, id]
      );

      // Add to tracking history
      await client.query(
        `INSERT INTO tracking_history (
          tenant_id, consignment_id, status, location, branch_id, created_by, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tenantId,
          id,
          status,
          remarks || `Status updated to ${status}`,
          updateBranchId,
          req.userId,
          remarks
        ]
      );
    });

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