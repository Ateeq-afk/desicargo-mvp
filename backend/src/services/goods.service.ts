import { pool } from '../config/database';
import { GoodsMaster, CreateGoodsRequest, UpdateGoodsRequest } from '../models/goods.model';
import { v4 as uuidv4 } from 'uuid';

export class GoodsService {
  // Get all goods for a company
  static async getGoods(company_id: string, is_active?: boolean) {
    let query = `
      SELECT * FROM goods_master 
      WHERE company_id = $1
    `;
    const params: any[] = [company_id];

    if (is_active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(is_active);
    }

    query += ` ORDER BY goods_name ASC`;

    const result = await pool.query<GoodsMaster>(query, params);
    return result.rows;
  }

  // Get single goods by ID
  static async getGoodsById(id: string, company_id: string) {
    const query = `
      SELECT * FROM goods_master 
      WHERE id = $1 AND company_id = $2
    `;
    const result = await pool.query<GoodsMaster>(query, [id, company_id]);
    return result.rows[0];
  }

  // Create new goods
  static async createGoods(data: CreateGoodsRequest, company_id: string, user_id: string) {
    const query = `
      INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, 
        is_active, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `;

    const values = [
      uuidv4(),
      company_id,
      data.goods_name,
      data.goods_code || null,
      data.hsn_code || null,
      data.is_active !== false,
      user_id
    ];

    const result = await pool.query<GoodsMaster>(query, values);
    return result.rows[0];
  }

  // Update goods
  static async updateGoods(id: string, data: UpdateGoodsRequest, company_id: string) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.goods_name !== undefined) {
      updateFields.push(`goods_name = $${paramCount++}`);
      values.push(data.goods_name);
    }

    if (data.goods_code !== undefined) {
      updateFields.push(`goods_code = $${paramCount++}`);
      values.push(data.goods_code);
    }

    if (data.hsn_code !== undefined) {
      updateFields.push(`hsn_code = $${paramCount++}`);
      values.push(data.hsn_code);
    }

    if (data.is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    if (updateFields.length === 0) {
      return null;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, company_id);

    const query = `
      UPDATE goods_master 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query<GoodsMaster>(query, values);
    return result.rows[0];
  }

  // Delete goods (soft delete by setting is_active = false)
  static async deleteGoods(id: string, company_id: string) {
    const query = `
      UPDATE goods_master 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND company_id = $2
      RETURNING *
    `;

    const result = await pool.query<GoodsMaster>(query, [id, company_id]);
    return result.rows[0];
  }

  // Search goods by name or code
  static async searchGoods(company_id: string, search: string) {
    const query = `
      SELECT * FROM goods_master 
      WHERE company_id = $1 
      AND is_active = true
      AND (
        LOWER(goods_name) LIKE LOWER($2) 
        OR LOWER(goods_code) LIKE LOWER($2)
        OR LOWER(hsn_code) LIKE LOWER($2)
      )
      ORDER BY goods_name ASC
      LIMIT 20
    `;

    const searchPattern = `%${search}%`;
    const result = await pool.query<GoodsMaster>(query, [company_id, searchPattern]);
    return result.rows;
  }
}