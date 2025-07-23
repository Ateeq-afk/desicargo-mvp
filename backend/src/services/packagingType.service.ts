import { pool } from '../config/database';
import { 
  PackagingType, 
  CreatePackagingTypeRequest 
} from '../types/goods.types';

export class PackagingTypeService {
  // Get all packaging types
  static async getPackagingTypes(
    tenantId: string,
    includeInactive = false
  ): Promise<PackagingType[]> {
    try {
      const query = `
        SELECT 
          id, tenant_id, name, code, description,
          dimensions, max_weight, tare_weight,
          is_stackable, is_active,
          created_by, created_at, updated_at
        FROM packaging_types
        WHERE tenant_id = $1
        ${!includeInactive ? 'AND is_active = true' : ''}
        ORDER BY name
      `;

      const result = await pool.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching packaging types:', error);
      throw error;
    }
  }

  // Get packaging type by ID
  static async getPackagingTypeById(
    id: string,
    tenantId: string
  ): Promise<PackagingType | null> {
    try {
      const query = `
        SELECT 
          id, tenant_id, name, code, description,
          dimensions, max_weight, tare_weight,
          is_stackable, is_active,
          created_by, created_at, updated_at
        FROM packaging_types
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await pool.query(query, [id, tenantId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching packaging type:', error);
      throw error;
    }
  }

  // Get packaging type by code
  static async getPackagingTypeByCode(
    code: string,
    tenantId: string
  ): Promise<PackagingType | null> {
    try {
      const query = `
        SELECT 
          id, tenant_id, name, code, description,
          dimensions, max_weight, tare_weight,
          is_stackable, is_active,
          created_by, created_at, updated_at
        FROM packaging_types
        WHERE code = $1 AND tenant_id = $2
      `;

      const result = await pool.query(query, [code, tenantId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching packaging type by code:', error);
      throw error;
    }
  }

  // Create new packaging type
  static async createPackagingType(
    data: CreatePackagingTypeRequest,
    tenantId: string,
    userId: string
  ): Promise<PackagingType> {
    try {
      // Check for duplicate code
      const duplicateCheck = await pool.query(
        'SELECT id FROM packaging_types WHERE tenant_id = $1 AND code = $2',
        [tenantId, data.code]
      );

      if (duplicateCheck.rows.length > 0) {
        throw new Error('Packaging type with this code already exists');
      }

      const insertQuery = `
        INSERT INTO packaging_types (
          tenant_id, name, code, description,
          dimensions, max_weight, tare_weight,
          is_stackable, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        tenantId,
        data.name,
        data.code,
        data.description || null,
        data.dimensions ? JSON.stringify(data.dimensions) : null,
        data.max_weight || null,
        data.tare_weight || null,
        data.is_stackable !== false,
        data.is_active !== false,
        userId
      ];

      const result = await pool.query(insertQuery, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating packaging type:', error);
      throw error;
    }
  }

  // Update packaging type
  static async updatePackagingType(
    id: string,
    data: Partial<CreatePackagingTypeRequest>,
    tenantId: string
  ): Promise<PackagingType | null> {
    try {
      // Check if packaging type exists
      const existingCheck = await pool.query(
        'SELECT * FROM packaging_types WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (existingCheck.rows.length === 0) {
        return null;
      }

      // Check for duplicate code if code is being updated
      if (data.code && data.code !== existingCheck.rows[0].code) {
        const duplicateCheck = await pool.query(
          'SELECT id FROM packaging_types WHERE tenant_id = $1 AND code = $2 AND id != $3',
          [tenantId, data.code, id]
        );

        if (duplicateCheck.rows.length > 0) {
          throw new Error('Packaging type with this code already exists');
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.code !== undefined) {
        updateFields.push(`code = $${paramIndex++}`);
        values.push(data.code);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description || null);
      }
      if (data.dimensions !== undefined) {
        updateFields.push(`dimensions = $${paramIndex++}`);
        values.push(data.dimensions ? JSON.stringify(data.dimensions) : null);
      }
      if (data.max_weight !== undefined) {
        updateFields.push(`max_weight = $${paramIndex++}`);
        values.push(data.max_weight || null);
      }
      if (data.tare_weight !== undefined) {
        updateFields.push(`tare_weight = $${paramIndex++}`);
        values.push(data.tare_weight || null);
      }
      if (data.is_stackable !== undefined) {
        updateFields.push(`is_stackable = $${paramIndex++}`);
        values.push(data.is_stackable);
      }
      if (data.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(data.is_active);
      }

      if (updateFields.length === 0) {
        return existingCheck.rows[0];
      }

      values.push(id);
      values.push(tenantId);

      const updateQuery = `
        UPDATE packaging_types
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating packaging type:', error);
      throw error;
    }
  }

  // Delete packaging type
  static async deletePackagingType(
    id: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      // Check if packaging type is being used by any goods
      const usageCheck = await pool.query(
        'SELECT COUNT(*) FROM goods_master WHERE packaging_type_id = $1',
        [id]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        throw new Error('Packaging type is being used by goods. Cannot delete.');
      }

      const deleteQuery = `
        DELETE FROM packaging_types
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await pool.query(deleteQuery, [id, tenantId]);
      return result.rowCount! > 0;
    } catch (error) {
      console.error('Error deleting packaging type:', error);
      throw error;
    }
  }

  // Calculate volumetric weight
  static calculateVolumetricWeight(
    dimensions: { length: number; width: number; height: number; unit: 'cm' | 'inch' },
    divisor = 5000 // Standard divisor for air freight in cm³/kg
  ): number {
    let volumeCm3: number;

    if (dimensions.unit === 'inch') {
      // Convert inches to cm (1 inch = 2.54 cm)
      volumeCm3 = (dimensions.length * 2.54) * 
                  (dimensions.width * 2.54) * 
                  (dimensions.height * 2.54);
    } else {
      volumeCm3 = dimensions.length * dimensions.width * dimensions.height;
    }

    return volumeCm3 / divisor;
  }

  // Suggest best packaging for given dimensions and weight
  static async suggestPackaging(
    tenantId: string,
    itemDimensions: { length: number; width: number; height: number; unit: 'cm' | 'inch' },
    itemWeight: number,
    quantity = 1
  ): Promise<PackagingType[]> {
    try {
      // Get all active packaging types
      const packagingTypes = await this.getPackagingTypes(tenantId, false);

      // Filter and sort suitable packaging
      const suitablePackaging = packagingTypes
        .filter(pkg => {
          if (!pkg.dimensions || !pkg.max_weight) return false;

          // Convert item dimensions to same unit as packaging
          let itemL = itemDimensions.length;
          let itemW = itemDimensions.width;
          let itemH = itemDimensions.height;

          if (itemDimensions.unit !== pkg.dimensions.unit) {
            if (itemDimensions.unit === 'inch' && pkg.dimensions.unit === 'cm') {
              itemL *= 2.54;
              itemW *= 2.54;
              itemH *= 2.54;
            } else if (itemDimensions.unit === 'cm' && pkg.dimensions.unit === 'inch') {
              itemL /= 2.54;
              itemW /= 2.54;
              itemH /= 2.54;
            }
          }

          // Check if item fits (considering rotation)
          const itemDims = [itemL, itemW, itemH].sort((a, b) => b - a);
          const pkgDims = [pkg.dimensions.length, pkg.dimensions.width, pkg.dimensions.height].sort((a, b) => b - a);

          const fits = itemDims[0] <= pkgDims[0] && 
                      itemDims[1] <= pkgDims[1] && 
                      itemDims[2] <= pkgDims[2];

          const weightFits = (itemWeight * quantity) <= pkg.max_weight;

          return fits && weightFits;
        })
        .sort((a, b) => {
          // Sort by volume (smallest suitable first)
          const volA = a.dimensions!.length * a.dimensions!.width * a.dimensions!.height;
          const volB = b.dimensions!.length * b.dimensions!.width * b.dimensions!.height;
          return volA - volB;
        });

      return suitablePackaging;
    } catch (error) {
      console.error('Error suggesting packaging:', error);
      throw error;
    }
  }

  // Get packaging statistics
  static async getPackagingStats(tenantId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          pt.id,
          pt.name,
          pt.code,
          COUNT(DISTINCT gm.id) as goods_count,
          COUNT(DISTINCT c.id) as consignment_count,
          COALESCE(AVG(c.actual_weight), 0) as avg_weight,
          pt.max_weight,
          CASE 
            WHEN pt.max_weight > 0 
            THEN ROUND((AVG(c.actual_weight) / pt.max_weight * 100)::numeric, 2)
            ELSE 0 
          END as avg_utilization_percent
        FROM packaging_types pt
        LEFT JOIN goods_master gm ON gm.packaging_type_id = pt.id
        LEFT JOIN consignments c ON c.goods_description IN (
          SELECT goods_name FROM goods_master WHERE packaging_type_id = pt.id
        )
        WHERE pt.tenant_id = $1 AND pt.is_active = true
        GROUP BY pt.id, pt.name, pt.code, pt.max_weight
        ORDER BY goods_count DESC, consignment_count DESC
      `;

      const result = await pool.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching packaging statistics:', error);
      throw error;
    }
  }
}