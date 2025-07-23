// Enhanced Goods System Type Definitions

export interface GoodsCategory {
  id: string;
  tenant_id: string;
  name: string;
  parent_id?: string;
  icon?: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  children?: GoodsCategory[]; // For hierarchical display
}

export interface PackagingType {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  max_weight?: number; // in kg
  tare_weight?: number; // packaging weight in kg
  is_stackable: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EnhancedGoodsMaster {
  id: string;
  company_id: string;
  goods_name: string;
  goods_code?: string;
  hsn_code?: string;
  category_id?: string;
  category?: GoodsCategory; // For populated queries
  packaging_type_id?: string;
  packaging_type?: PackagingType; // For populated queries
  unit_of_measurement: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  weight_per_unit?: number; // in kg
  is_fragile: boolean;
  is_hazardous: boolean;
  is_perishable: boolean;
  temperature_requirements?: {
    min: number;
    max: number;
    unit: 'C' | 'F';
  };
  handling_instructions?: string;
  image_urls: string[];
  barcode?: string;
  qr_code?: string;
  min_insurance_value?: number;
  shelf_life_days?: number;
  stackable_quantity?: number;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  documents?: GoodsDocument[];
  aliases?: GoodsAlias[];
  attributes?: GoodsAttribute[];
  pricing_rules?: GoodsPricingRule[];
}

export interface GoodsDocument {
  id: string;
  goods_id: string;
  document_type: 'msds' | 'specification' | 'certificate' | 'manual' | 'other';
  document_name: string;
  document_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_at: Date;
  is_active: boolean;
}

export interface GoodsAlias {
  id: string;
  goods_id: string;
  alias_name: string;
  language: string;
  is_primary: boolean;
  created_at: Date;
}

export interface GoodsAttribute {
  id: string;
  goods_id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: 'text' | 'number' | 'boolean' | 'date';
  display_order: number;
  created_at: Date;
}

export interface GoodsPricingRule {
  id: string;
  tenant_id: string;
  goods_id?: string;
  category_id?: string;
  rule_type: 'surcharge' | 'discount' | 'handling_fee';
  rule_name: string;
  conditions?: {
    min_weight?: number;
    max_weight?: number;
    routes?: string[];
    valid_days?: string[]; // ['monday', 'tuesday', etc.]
    time_slots?: { start: string; end: string }[];
  };
  charge_type: 'percentage' | 'fixed';
  charge_value: number;
  is_active: boolean;
  priority: number;
  valid_from?: Date;
  valid_to?: Date;
  created_by?: string;
  created_at: Date;
}

export interface GoodsCompatibility {
  id: string;
  goods_id_1: string;
  goods_id_2: string;
  is_compatible: boolean;
  reason?: string;
  created_at: Date;
}

// Request/Response DTOs
export interface CreateGoodsCategoryRequest {
  name: string;
  parent_id?: string;
  icon?: string;
  description?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface CreatePackagingTypeRequest {
  name: string;
  code: string;
  description?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  max_weight?: number;
  tare_weight?: number;
  is_stackable?: boolean;
  is_active?: boolean;
}

export interface CreateEnhancedGoodsRequest {
  goods_name: string;
  goods_code?: string;
  hsn_code?: string;
  category_id?: string;
  packaging_type_id?: string;
  unit_of_measurement?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  weight_per_unit?: number;
  is_fragile?: boolean;
  is_hazardous?: boolean;
  is_perishable?: boolean;
  temperature_requirements?: {
    min: number;
    max: number;
    unit: 'C' | 'F';
  };
  handling_instructions?: string;
  image_urls?: string[];
  barcode?: string;
  min_insurance_value?: number;
  shelf_life_days?: number;
  stackable_quantity?: number;
  is_active?: boolean;
  aliases?: { alias_name: string; language?: string; is_primary?: boolean }[];
  attributes?: { attribute_name: string; attribute_value: string; attribute_type?: string }[];
}

export interface GoodsSearchParams {
  query?: string;
  category_id?: string;
  is_hazardous?: boolean;
  is_fragile?: boolean;
  is_perishable?: boolean;
  packaging_type_id?: string;
  weight_range?: { min: number; max: number };
  barcode?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'code' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface GoodsBulkImportRequest {
  file_url: string;
  mapping: {
    goods_name: string;
    goods_code?: string;
    hsn_code?: string;
    category?: string;
    weight?: string;
    [key: string]: string | undefined;
  };
  options: {
    update_existing: boolean;
    skip_errors: boolean;
  };
}

export interface GoodsPriceCalculationRequest {
  goods_id: string;
  weight: number;
  from_city: string;
  to_city: string;
  customer_id?: string;
  delivery_date?: Date;
}

export interface GoodsPriceCalculationResponse {
  base_rate: number;
  weight_charges: number;
  special_handling_charges: number;
  insurance_charges: number;
  total_amount: number;
  applied_rules: {
    rule_name: string;
    charge_type: string;
    charge_value: number;
    amount: number;
  }[];
}

// Barcode/QR Code types
export interface GenerateBarcodeRequest {
  goods_id: string;
  format: 'CODE128' | 'EAN13' | 'QR';
  include_text?: boolean;
}

export interface ScanBarcodeRequest {
  barcode_data: string;
  format?: string;
}

// Analytics types
export interface GoodsAnalytics {
  total_goods: number;
  active_goods: number;
  categories_count: number;
  hazardous_goods_count: number;
  fragile_goods_count: number;
  perishable_goods_count: number;
  most_booked_goods: {
    goods_id: string;
    goods_name: string;
    booking_count: number;
  }[];
  category_distribution: {
    category_id: string;
    category_name: string;
    goods_count: number;
    percentage: number;
  }[];
  revenue_by_goods: {
    goods_id: string;
    goods_name: string;
    total_revenue: number;
  }[];
}