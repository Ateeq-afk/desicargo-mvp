import { Response } from 'express';
import { TenantAuthRequest } from '../types';
import { queryWithTenant } from '../config/database';
import { AppError } from '../middleware/error.middleware';

// Get all addresses for a customer
export const getCustomerAddresses = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;

    const result = await queryWithTenant(
      `SELECT * FROM customer_addresses 
      WHERE customer_id = $1 AND tenant_id = $2
      ORDER BY is_default DESC, created_at DESC`,
      [customerId, req.tenantId!],
      req.tenantId!
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch addresses'
    });
  }
};

// Create a new address
export const createCustomerAddress = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const {
      address_type,
      contact_person,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      landmark,
      is_default
    } = req.body;

    // If setting as default, unset other defaults of same type
    if (is_default) {
      await queryWithTenant(
        `UPDATE customer_addresses 
        SET is_default = false 
        WHERE customer_id = $1 AND tenant_id = $2 AND address_type = $3`,
        [customerId, req.tenantId!, address_type],
        req.tenantId!
      );
    }

    const result = await queryWithTenant(
      `INSERT INTO customer_addresses (
        customer_id, tenant_id, address_type, contact_person, phone,
        address_line1, address_line2, city, state, pincode, landmark, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        customerId, req.tenantId!, address_type, contact_person, phone,
        address_line1, address_line2, city, state, pincode, landmark, is_default
      ],
      req.tenantId!
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create address'
    });
  }
};

// Update an address
export const updateCustomerAddress = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, addressId } = req.params;
    const {
      address_type,
      contact_person,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      landmark,
      is_default
    } = req.body;

    // If setting as default, unset other defaults of same type
    if (is_default) {
      await queryWithTenant(
        `UPDATE customer_addresses 
        SET is_default = false 
        WHERE customer_id = $1 AND tenant_id = $2 AND address_type = $3 AND id != $4`,
        [customerId, req.tenantId!, address_type, addressId],
        req.tenantId!
      );
    }

    const result = await queryWithTenant(
      `UPDATE customer_addresses 
      SET address_type = $3, contact_person = $4, phone = $5,
          address_line1 = $6, address_line2 = $7, city = $8,
          state = $9, pincode = $10, landmark = $11, is_default = $12,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND customer_id = $2 AND tenant_id = $13
      RETURNING *`,
      [
        addressId, customerId, address_type, contact_person, phone,
        address_line1, address_line2, city, state, pincode, landmark, 
        is_default, req.tenantId!
      ],
      req.tenantId!
    );

    if (result.rows.length === 0) {
      throw new AppError('Address not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update address'
    });
  }
};

// Delete an address
export const deleteCustomerAddress = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, addressId } = req.params;

    const result = await queryWithTenant(
      `DELETE FROM customer_addresses 
      WHERE id = $1 AND customer_id = $2 AND tenant_id = $3
      RETURNING id`,
      [addressId, customerId, req.tenantId!],
      req.tenantId!
    );

    if (result.rows.length === 0) {
      throw new AppError('Address not found', 404);
    }

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete address'
    });
  }
};

// Set default address
export const setDefaultAddress = async (req: TenantAuthRequest, res: Response): Promise<void> => {
  try {
    const { customerId, addressId } = req.params;

    // Get address type
    const addressResult = await queryWithTenant(
      `SELECT address_type FROM customer_addresses 
      WHERE id = $1 AND customer_id = $2 AND tenant_id = $3`,
      [addressId, customerId, req.tenantId!],
      req.tenantId!
    );

    if (addressResult.rows.length === 0) {
      throw new AppError('Address not found', 404);
    }

    const addressType = addressResult.rows[0].address_type;

    // Unset other defaults of same type
    await queryWithTenant(
      `UPDATE customer_addresses 
      SET is_default = false 
      WHERE customer_id = $1 AND tenant_id = $2 AND address_type = $3`,
      [customerId, req.tenantId!, addressType],
      req.tenantId!
    );

    // Set this as default
    const result = await queryWithTenant(
      `UPDATE customer_addresses 
      SET is_default = true 
      WHERE id = $1 AND customer_id = $2 AND tenant_id = $3
      RETURNING *`,
      [addressId, customerId, req.tenantId!],
      req.tenantId!
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set default address'
    });
  }
};