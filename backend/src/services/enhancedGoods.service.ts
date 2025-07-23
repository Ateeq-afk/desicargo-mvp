import { pool } from '../config/database';
import { 
  EnhancedGoodsMaster, 
  CreateEnhancedGoodsRequest,
  GoodsSearchParams,
  GoodsBulkImportRequest,
  GoodsDocument,
  GoodsAlias,
  GoodsAttribute,
  GoodsAnalytics
} from '../types/goods.types';

export class EnhancedGoodsService {
  // Get all goods with enhanced features
  static async getGoods(
    tenantId: string,
    params: Partial<GoodsSearchParams> = {}
  ): Promise<{ goods: EnhancedGoodsMaster[]; total: number; page: number; limit: number }> {
    try {
      const {
        query = '',
        category_id,
        is_hazardous,
        is_fragile,
        is_perishable,
        packaging_type_id,
        weight_range,
        barcode,
        page = 1,
        limit = 50,
        sort_by = 'goods_name',
        sort_order = 'asc'
      } = params;

      // Build WHERE conditions
      const whereConditions: string[] = ['gm.company_id = $1'];
      const queryParams: any[] = [tenantId];
      let paramIndex = 2;

      if (query) {
        whereConditions.push(`(
          LOWER(gm.goods_name) LIKE LOWER($${paramIndex}) OR
          LOWER(gm.goods_code) LIKE LOWER($${paramIndex}) OR
          LOWER(gm.hsn_code) LIKE LOWER($${paramIndex}) OR
          EXISTS (
            SELECT 1 FROM goods_aliases ga 
            WHERE ga.goods_id = gm.id 
            AND LOWER(ga.alias_name) LIKE LOWER($${paramIndex})
          )
        )`);
        queryParams.push(`%${query}%`);
        paramIndex++;
      }

      if (category_id) {
        whereConditions.push(`gm.category_id = $${paramIndex}`);
        queryParams.push(category_id);
        paramIndex++;
      }

      if (is_hazardous !== undefined) {
        whereConditions.push(`gm.is_hazardous = $${paramIndex}`);
        queryParams.push(is_hazardous);
        paramIndex++;
      }

      if (is_fragile !== undefined) {
        whereConditions.push(`gm.is_fragile = $${paramIndex}`);
        queryParams.push(is_fragile);
        paramIndex++;
      }

      if (is_perishable !== undefined) {
        whereConditions.push(`gm.is_perishable = $${paramIndex}`);
        queryParams.push(is_perishable);
        paramIndex++;
      }

      if (packaging_type_id) {
        whereConditions.push(`gm.packaging_type_id = $${paramIndex}`);
        queryParams.push(packaging_type_id);
        paramIndex++;
      }

      if (weight_range) {
        whereConditions.push(`gm.weight_per_unit BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        queryParams.push(weight_range.min, weight_range.max);
        paramIndex += 2;
      }

      if (barcode) {
        whereConditions.push(`(gm.barcode = $${paramIndex} OR gm.qr_code = $${paramIndex})`);
        queryParams.push(barcode);
        paramIndex++;
      }

      // Count query
      const countQuery = `
        SELECT COUNT(DISTINCT gm.id) as total
        FROM goods_master gm
        WHERE ${whereConditions.join(' AND ')}
      `;

      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Main query with joins and pagination
      const offset = (page - 1) * limit;
      const mainQuery = `
        SELECT 
          gm.*,
          gc.name as category_name,
          gc.icon as category_icon,
          pt.name as packaging_name,
          pt.code as packaging_code,
          pt.dimensions as packaging_dimensions,
          pt.max_weight as packaging_max_weight
        FROM goods_master gm
        LEFT JOIN goods_categories gc ON gm.category_id = gc.id
        LEFT JOIN packaging_types pt ON gm.packaging_type_id = pt.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY gm.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await pool.query(mainQuery, queryParams);
      const goods = result.rows.map(row => this.mapRowToEnhancedGoods(row));

      return {
        goods,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('Error fetching enhanced goods:', error);
      throw error;
    }
  }

  // Get single goods with all relations
  static async getGoodsById(
    id: string,
    tenantId: string,
    includeRelations = true
  ): Promise<EnhancedGoodsMaster | null> {
    try {
      const query = `
        SELECT 
          gm.*,
          gc.name as category_name,
          gc.icon as category_icon,
          pt.name as packaging_name,
          pt.code as packaging_code,
          pt.dimensions as packaging_dimensions,
          pt.max_weight as packaging_max_weight
        FROM goods_master gm
        LEFT JOIN goods_categories gc ON gm.category_id = gc.id
        LEFT JOIN packaging_types pt ON gm.packaging_type_id = pt.id
        WHERE gm.id = $1 AND gm.company_id = $2
      `;

      const result = await pool.query(query, [id, tenantId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const goods = this.mapRowToEnhancedGoods(result.rows[0]);

      if (includeRelations) {
        // Load documents
        const documentsQuery = `
          SELECT * FROM goods_documents 
          WHERE goods_id = $1 AND is_active = true
          ORDER BY uploaded_at DESC
        `;
        const documentsResult = await pool.query(documentsQuery, [id]);
        goods.documents = documentsResult.rows;

        // Load aliases
        const aliasesQuery = `
          SELECT * FROM goods_aliases 
          WHERE goods_id = $1
          ORDER BY is_primary DESC, alias_name ASC
        `;
        const aliasesResult = await pool.query(aliasesQuery, [id]);
        goods.aliases = aliasesResult.rows;

        // Load attributes
        const attributesQuery = `
          SELECT * FROM goods_attributes 
          WHERE goods_id = $1
          ORDER BY display_order ASC, attribute_name ASC
        `;
        const attributesResult = await pool.query(attributesQuery, [id]);
        goods.attributes = attributesResult.rows;
      }

      return goods;
    } catch (error) {
      console.error('Error fetching goods by ID:', error);
      throw error;
    }
  }

  // Create new enhanced goods
  static async createGoods(
    data: CreateEnhancedGoodsRequest,
    tenantId: string,
    userId: string
  ): Promise<EnhancedGoodsMaster> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate category if provided
      if (data.category_id) {
        const categoryCheck = await client.query(
          'SELECT id FROM goods_categories WHERE id = $1 AND tenant_id = $2',
          [data.category_id, tenantId]
        );
        if (categoryCheck.rows.length === 0) {
          throw new Error('Invalid category ID');
        }
      }

      // Validate packaging type if provided
      if (data.packaging_type_id) {
        const packagingCheck = await client.query(
          'SELECT id FROM packaging_types WHERE id = $1 AND tenant_id = $2',
          [data.packaging_type_id, tenantId]
        );
        if (packagingCheck.rows.length === 0) {
          throw new Error('Invalid packaging type ID');
        }
      }

      // Generate barcode if not provided
      let barcode = data.barcode;
      if (!barcode && data.goods_code) {
        barcode = `GDS${data.goods_code}${Date.now()}`;
      }

      // Insert main goods record
      const insertQuery = `
        INSERT INTO goods_master (
          company_id, goods_name, goods_code, hsn_code,
          category_id, packaging_type_id, unit_of_measurement,
          dimensions, weight_per_unit, is_fragile, is_hazardous, 
          is_perishable, temperature_requirements, handling_instructions,
          image_urls, barcode, qr_code, min_insurance_value,
          shelf_life_days, stackable_quantity, is_active, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *
      `;

      const values = [
        tenantId,
        data.goods_name,
        data.goods_code || null,
        data.hsn_code || null,
        data.category_id || null,
        data.packaging_type_id || null,
        data.unit_of_measurement || 'pcs',
        data.dimensions ? JSON.stringify(data.dimensions) : null,
        data.weight_per_unit || null,
        data.is_fragile || false,
        data.is_hazardous || false,
        data.is_perishable || false,
        data.temperature_requirements ? JSON.stringify(data.temperature_requirements) : null,
        data.handling_instructions || null,
        JSON.stringify(data.image_urls || []),
        barcode || null,
        null, // qr_code will be generated separately if needed
        data.min_insurance_value || null,
        data.shelf_life_days || null,
        data.stackable_quantity || null,
        data.is_active !== false,
        userId
      ];

      const goodsResult = await client.query(insertQuery, values);
      const goods = goodsResult.rows[0];

      // Insert aliases if provided
      if (data.aliases && data.aliases.length > 0) {
        for (const alias of data.aliases) {
          await client.query(
            `INSERT INTO goods_aliases (goods_id, alias_name, language, is_primary) 
             VALUES ($1, $2, $3, $4)`,
            [goods.id, alias.alias_name, alias.language || 'en', alias.is_primary || false]
          );
        }
      }

      // Insert attributes if provided
      if (data.attributes && data.attributes.length > 0) {
        for (let i = 0; i < data.attributes.length; i++) {
          const attr = data.attributes[i];
          await client.query(
            `INSERT INTO goods_attributes (goods_id, attribute_name, attribute_value, attribute_type, display_order) 
             VALUES ($1, $2, $3, $4, $5)`,
            [goods.id, attr.attribute_name, attr.attribute_value, attr.attribute_type || 'text', i]
          );
        }
      }

      await client.query('COMMIT');

      // Return the created goods with relations
      return await this.getGoodsById(goods.id, tenantId, true) as EnhancedGoodsMaster;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating enhanced goods:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Bulk import goods
  static async bulkImportGoods(
    data: GoodsBulkImportRequest,
    tenantId: string,
    userId: string
  ): Promise<{ success: number; errors: any[] }> {
    // This would typically parse CSV/Excel files
    // For now, returning a placeholder implementation
    return {
      success: 0,
      errors: ['Bulk import feature not yet implemented']
    };
  }

  // Advanced search with full-text search
  static async advancedSearch(
    tenantId: string,
    searchParams: GoodsSearchParams
  ): Promise<EnhancedGoodsMaster[]> {
    try {
      const result = await this.getGoods(tenantId, searchParams);
      return result.goods;
    } catch (error) {
      console.error('Error in advanced search:', error);
      throw error;
    }
  }

  // Search by barcode/QR code
  static async searchByBarcode(
    barcode: string,
    tenantId: string
  ): Promise<EnhancedGoodsMaster | null> {
    try {
      const query = `
        SELECT 
          gm.*,
          gc.name as category_name,
          gc.icon as category_icon,
          pt.name as packaging_name,
          pt.code as packaging_code
        FROM goods_master gm
        LEFT JOIN goods_categories gc ON gm.category_id = gc.id
        LEFT JOIN packaging_types pt ON gm.packaging_type_id = pt.id
        WHERE gm.company_id = $1 
        AND (gm.barcode = $2 OR gm.qr_code = $2)
        AND gm.is_active = true
      `;

      const result = await pool.query(query, [tenantId, barcode]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEnhancedGoods(result.rows[0]);
    } catch (error) {
      console.error('Error searching by barcode:', error);
      throw error;
    }
  }

  // Get goods analytics
  static async getGoodsAnalytics(tenantId: string): Promise<GoodsAnalytics> {
    try {
      const analyticsQuery = `
        WITH goods_stats AS (
          SELECT 
            COUNT(*) as total_goods,
            COUNT(*) FILTER (WHERE is_active = true) as active_goods,
            COUNT(*) FILTER (WHERE is_hazardous = true) as hazardous_goods_count,
            COUNT(*) FILTER (WHERE is_fragile = true) as fragile_goods_count,
            COUNT(*) FILTER (WHERE is_perishable = true) as perishable_goods_count
          FROM goods_master 
          WHERE company_id = $1
        ),
        category_stats AS (
          SELECT COUNT(DISTINCT category_id) as categories_count
          FROM goods_master 
          WHERE company_id = $1 AND category_id IS NOT NULL
        )
        SELECT * FROM goods_stats, category_stats
      `;

      const analyticsResult = await pool.query(analyticsQuery, [tenantId]);
      const stats = analyticsResult.rows[0];

      // Category distribution
      const categoryDistQuery = `
        SELECT 
          gc.id as category_id,
          gc.name as category_name,
          COUNT(gm.id) as goods_count,
          ROUND((COUNT(gm.id) * 100.0 / NULLIF(SUM(COUNT(gm.id)) OVER (), 0)), 2) as percentage
        FROM goods_categories gc
        LEFT JOIN goods_master gm ON gm.category_id = gc.id
        WHERE gc.tenant_id = $1
        GROUP BY gc.id, gc.name
        ORDER BY goods_count DESC
      `;

      const categoryResult = await pool.query(categoryDistQuery, [tenantId]);

      return {
        total_goods: parseInt(stats.total_goods),
        active_goods: parseInt(stats.active_goods),
        categories_count: parseInt(stats.categories_count),
        hazardous_goods_count: parseInt(stats.hazardous_goods_count),
        fragile_goods_count: parseInt(stats.fragile_goods_count),
        perishable_goods_count: parseInt(stats.perishable_goods_count),
        most_booked_goods: [], // Would need consignment data
        category_distribution: categoryResult.rows,
        revenue_by_goods: [] // Would need billing data
      };
    } catch (error) {
      console.error('Error fetching goods analytics:', error);
      throw error;
    }
  }

  // Helper: Map database row to EnhancedGoodsMaster
  private static mapRowToEnhancedGoods(row: any): EnhancedGoodsMaster {
    return {
      id: row.id,
      company_id: row.company_id,
      goods_name: row.goods_name,
      goods_code: row.goods_code,
      hsn_code: row.hsn_code,
      category_id: row.category_id,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon
      } : undefined,
      packaging_type_id: row.packaging_type_id,
      packaging_type: row.packaging_name ? {
        id: row.packaging_type_id,
        name: row.packaging_name,
        code: row.packaging_code,
        dimensions: row.packaging_dimensions,
        max_weight: row.packaging_max_weight
      } : undefined,
      unit_of_measurement: row.unit_of_measurement || 'pcs',
      dimensions: row.dimensions,
      weight_per_unit: row.weight_per_unit,
      is_fragile: row.is_fragile || false,
      is_hazardous: row.is_hazardous || false,
      is_perishable: row.is_perishable || false,
      temperature_requirements: row.temperature_requirements,
      handling_instructions: row.handling_instructions,
      image_urls: row.image_urls || [],
      barcode: row.barcode,
      qr_code: row.qr_code,
      min_insurance_value: row.min_insurance_value,
      shelf_life_days: row.shelf_life_days,
      stackable_quantity: row.stackable_quantity,
      is_active: row.is_active,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    } as EnhancedGoodsMaster;
  }
}