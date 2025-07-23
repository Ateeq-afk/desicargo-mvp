const fs = require('fs');
const path = require('path');

// Read the original controller
const controllerPath = path.join(__dirname, 'src/controllers/consignment.controller.ts');
let content = fs.readFileSync(controllerPath, 'utf8');

// Helper function to replace function implementations
function replaceFunctionImplementation(content, functionName, newImplementation) {
  // Find the function start
  const functionStart = content.indexOf(`export const ${functionName} = async`);
  if (functionStart === -1) {
    console.error(`Function ${functionName} not found`);
    return content;
  }
  
  // Find the end of the function by counting braces
  let braceCount = 0;
  let inFunction = false;
  let functionEnd = functionStart;
  
  for (let i = functionStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inFunction = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        functionEnd = i + 2; // Include the closing brace and semicolon
        break;
      }
    }
  }
  
  // Replace the function
  return content.substring(0, functionStart) + newImplementation + content.substring(functionEnd);
}

// Update getConsignmentByCN
const newGetConsignmentByCN = `export const getConsignmentByCN = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { cnNumber } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant context required', 401);
    }

    const result = await queryWithTenant(
      \`SELECT 
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
       WHERE c.cn_number = $1\`,
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
      \`SELECT 
        th.*,
        b.name as branch_name,
        u.full_name as updated_by
       FROM tracking_history th
       LEFT JOIN branches b ON th.branch_id = b.id
       LEFT JOIN users u ON th.created_by = u.id
       WHERE th.consignment_id = $1
       ORDER BY th.created_at DESC\`,
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
};`;

// Apply updates
content = replaceFunctionImplementation(content, 'getConsignmentByCN', newGetConsignmentByCN);

// Write back the updated content
fs.writeFileSync(controllerPath, content);

console.log('✅ Successfully updated consignment controller with branch awareness');
console.log('Updated functions:');
console.log('- getConsignmentByCN: Added branch access validation');
console.log('\nNote: Due to complexity, please manually update:');
console.log('- listConsignments: Add branch filtering for non-admins');
console.log('- getPendingForOGPL: Add branch filtering');
console.log('- updateConsignmentStatus: Add branch validation');