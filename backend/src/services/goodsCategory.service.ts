import { pool } from '../config/database';
import { 
  GoodsCategory, 
  CreateGoodsCategoryRequest 
} from '../types/goods.types';

export class GoodsCategoryService {
  // Get all categories with optional hierarchy
  static async getCategories(
    tenantId: string,
    includeInactive = false,
    buildHierarchy = true
  ): Promise<GoodsCategory[]> {
    try {
      const query = `
        SELECT 
          id, tenant_id, name, parent_id, icon, 
          description, is_active, display_order,
          created_by, created_at, updated_at
        FROM goods_categories
        WHERE tenant_id = $1
        ${!includeInactive ? 'AND is_active = true' : ''}
        ORDER BY display_order, name
      `;

      const result = await pool.query(query, [tenantId]);
      const categories = result.rows;

      if (buildHierarchy) {
        return this.buildCategoryHierarchy(categories);
      }

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get category by ID with children
  static async getCategoryById(
    categoryId: string,
    tenantId: string,
    includeChildren = true
  ): Promise<GoodsCategory | null> {
    try {
      const query = `
        SELECT 
          id, tenant_id, name, parent_id, icon, 
          description, is_active, display_order,
          created_by, created_at, updated_at
        FROM goods_categories
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await pool.query(query, [categoryId, tenantId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const category = result.rows[0];

      if (includeChildren) {
        const childrenQuery = `
          SELECT 
            id, tenant_id, name, parent_id, icon, 
            description, is_active, display_order,
            created_by, created_at, updated_at
          FROM goods_categories
          WHERE parent_id = $1 AND tenant_id = $2
          ORDER BY display_order, name
        `;

        const childrenResult = await pool.query(childrenQuery, [categoryId, tenantId]);
        category.children = childrenResult.rows;
      }

      return category;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  }

  // Create new category
  static async createCategory(
    data: CreateGoodsCategoryRequest,
    tenantId: string,
    userId: string
  ): Promise<GoodsCategory> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate parent category if provided
      if (data.parent_id) {
        const parentCheck = await client.query(
          'SELECT id FROM goods_categories WHERE id = $1 AND tenant_id = $2',
          [data.parent_id, tenantId]
        );

        if (parentCheck.rows.length === 0) {
          throw new Error('Parent category not found');
        }
      }

      // Check for duplicate name at the same level
      const duplicateCheck = await client.query(
        `SELECT id FROM goods_categories 
         WHERE tenant_id = $1 AND name = $2 
         AND ($3::uuid IS NULL AND parent_id IS NULL OR parent_id = $3::uuid)`,
        [tenantId, data.name, data.parent_id || null]
      );

      if (duplicateCheck.rows.length > 0) {
        throw new Error('Category with this name already exists at this level');
      }

      // Insert new category
      const insertQuery = `
        INSERT INTO goods_categories (
          tenant_id, name, parent_id, icon, description, 
          is_active, display_order, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        tenantId,
        data.name,
        data.parent_id || null,
        data.icon || null,
        data.description || null,
        data.is_active !== false,
        data.display_order || 0,
        userId
      ];

      const result = await client.query(insertQuery, values);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating category:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update category
  static async updateCategory(
    categoryId: string,
    data: Partial<CreateGoodsCategoryRequest>,
    tenantId: string
  ): Promise<GoodsCategory | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if category exists
      const existingCheck = await client.query(
        'SELECT * FROM goods_categories WHERE id = $1 AND tenant_id = $2',
        [categoryId, tenantId]
      );

      if (existingCheck.rows.length === 0) {
        return null;
      }

      // Validate parent category if being changed
      if (data.parent_id !== undefined) {
        if (data.parent_id) {
          // Check if new parent exists
          const parentCheck = await client.query(
            'SELECT id FROM goods_categories WHERE id = $1 AND tenant_id = $2',
            [data.parent_id, tenantId]
          );

          if (parentCheck.rows.length === 0) {
            throw new Error('Parent category not found');
          }

          // Prevent circular reference
          if (data.parent_id === categoryId) {
            throw new Error('Category cannot be its own parent');
          }

          // Check if new parent is a descendant
          const isDescendant = await this.isDescendant(categoryId, data.parent_id, tenantId, client);
          if (isDescendant) {
            throw new Error('Cannot set a descendant category as parent');
          }
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
      if (data.parent_id !== undefined) {
        updateFields.push(`parent_id = $${paramIndex++}`);
        values.push(data.parent_id || null);
      }
      if (data.icon !== undefined) {
        updateFields.push(`icon = $${paramIndex++}`);
        values.push(data.icon || null);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description || null);
      }
      if (data.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(data.is_active);
      }
      if (data.display_order !== undefined) {
        updateFields.push(`display_order = $${paramIndex++}`);
        values.push(data.display_order);
      }

      if (updateFields.length === 0) {
        return existingCheck.rows[0];
      }

      values.push(categoryId);
      values.push(tenantId);

      const updateQuery = `
        UPDATE goods_categories
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating category:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete category (with cascade handling)
  static async deleteCategory(
    categoryId: string,
    tenantId: string,
    cascade = false
  ): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if category exists
      const existingCheck = await client.query(
        'SELECT * FROM goods_categories WHERE id = $1 AND tenant_id = $2',
        [categoryId, tenantId]
      );

      if (existingCheck.rows.length === 0) {
        return false;
      }

      // Check for child categories
      const childrenCheck = await client.query(
        'SELECT COUNT(*) FROM goods_categories WHERE parent_id = $1',
        [categoryId]
      );

      if (parseInt(childrenCheck.rows[0].count) > 0 && !cascade) {
        throw new Error('Category has child categories. Use cascade option to delete all.');
      }

      // Check for goods using this category
      const goodsCheck = await client.query(
        'SELECT COUNT(*) FROM goods_master WHERE category_id = $1',
        [categoryId]
      );

      if (parseInt(goodsCheck.rows[0].count) > 0) {
        throw new Error('Category is being used by goods. Cannot delete.');
      }

      // Delete category (cascade will handle children due to FK constraint)
      await client.query(
        'DELETE FROM goods_categories WHERE id = $1 AND tenant_id = $2',
        [categoryId, tenantId]
      );

      await client.query('COMMIT');
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting category:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get category path (breadcrumb)
  static async getCategoryPath(
    categoryId: string,
    tenantId: string
  ): Promise<GoodsCategory[]> {
    try {
      const query = `
        WITH RECURSIVE category_path AS (
          SELECT id, tenant_id, name, parent_id, 0 as level
          FROM goods_categories
          WHERE id = $1 AND tenant_id = $2
          
          UNION ALL
          
          SELECT gc.id, gc.tenant_id, gc.name, gc.parent_id, cp.level + 1
          FROM goods_categories gc
          INNER JOIN category_path cp ON gc.id = cp.parent_id
        )
        SELECT * FROM category_path
        ORDER BY level DESC
      `;

      const result = await pool.query(query, [categoryId, tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching category path:', error);
      throw error;
    }
  }

  // Helper: Build hierarchical category tree
  private static buildCategoryHierarchy(categories: GoodsCategory[]): GoodsCategory[] {
    const categoryMap = new Map<string, GoodsCategory>();
    const rootCategories: GoodsCategory[] = [];

    // Create map and initialize children arrays
    categories.forEach(cat => {
      cat.children = [];
      categoryMap.set(cat.id, cat);
    });

    // Build hierarchy
    categories.forEach(cat => {
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children!.push(cat);
        }
      } else {
        rootCategories.push(cat);
      }
    });

    return rootCategories;
  }

  // Helper: Check if a category is descendant of another
  private static async isDescendant(
    parentId: string,
    childId: string,
    tenantId: string,
    client: any
  ): Promise<boolean> {
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id
        FROM goods_categories
        WHERE id = $1 AND tenant_id = $2
        
        UNION ALL
        
        SELECT gc.id, gc.parent_id
        FROM goods_categories gc
        INNER JOIN descendants d ON gc.parent_id = d.id
      )
      SELECT COUNT(*) FROM descendants WHERE id = $3
    `;

    const result = await client.query(query, [parentId, tenantId, childId]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get categories by goods count
  static async getCategoriesWithGoodsCount(tenantId: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          gc.id, gc.name, gc.parent_id, gc.icon,
          COUNT(DISTINCT gm.id) as goods_count,
          COUNT(DISTINCT CASE WHEN gm.is_active = true THEN gm.id END) as active_goods_count
        FROM goods_categories gc
        LEFT JOIN goods_master gm ON gm.category_id = gc.id
        WHERE gc.tenant_id = $1 AND gc.is_active = true
        GROUP BY gc.id, gc.name, gc.parent_id, gc.icon
        ORDER BY goods_count DESC, gc.name
      `;

      const result = await pool.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching categories with goods count:', error);
      throw error;
    }
  }
}