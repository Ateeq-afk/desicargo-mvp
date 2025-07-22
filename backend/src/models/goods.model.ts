export interface GoodsMaster {
  id: string;
  company_id: string;
  goods_name: string;
  goods_code?: string;
  hsn_code?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateGoodsRequest {
  goods_name: string;
  goods_code?: string;
  hsn_code?: string;
  is_active?: boolean;
}

export interface UpdateGoodsRequest {
  goods_name?: string;
  goods_code?: string;
  hsn_code?: string;
  is_active?: boolean;
}