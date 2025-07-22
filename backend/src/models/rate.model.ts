export interface RateMaster {
  id: string;
  company_id: string;
  from_city: string;
  to_city: string;
  goods_type: string;
  rate_per_kg: number;
  min_charge: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerRateMaster {
  id: string;
  customer_id: string;
  company_id: string;
  from_city: string;
  to_city: string;
  goods_type: string;
  special_rate: number;
  min_charge: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface RateHistory {
  id: string;
  consignment_id: string;
  rate_type: 'default' | 'customer' | 'manual';
  from_city: string;
  to_city: string;
  goods_type?: string;
  applied_rate: number;
  weight: number;
  total_amount: number;
  entered_by: string;
  created_at: Date;
}

export interface CreateRateRequest {
  from_city: string;
  to_city: string;
  goods_type: string;
  rate_per_kg: number;
  min_charge?: number;
}

export interface CreateCustomerRateRequest {
  customer_id: string;
  from_city: string;
  to_city: string;
  goods_type: string;
  special_rate: number;
  min_charge?: number;
}

export interface RateCalculationRequest {
  from_city: string;
  to_city: string;
  goods_type: string;
  weight: number;
  customer_id?: string;
}

export interface RateCalculationResponse {
  default_rate?: {
    rate_per_kg: number;
    min_charge: number;
    total: number;
  };
  customer_rate?: {
    rate_per_kg: number;
    min_charge: number;
    total: number;
  };
  manual_rate?: {
    rate_per_kg: number;
    total: number;
  };
}

export interface RateApproval {
  id: string;
  consignment_id: string;
  requested_rate: number;
  standard_rate?: number;
  reason?: string;
  requested_by: string;
  approved_by?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
  updated_at: Date;
}