// Type definitions for the application

export interface User {
  id: string;
  company_id: string;
  branch_id: string;
  username: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  email?: string;
  avatar_url?: string;
  preferences?: any;
  last_login?: Date;
  is_active: boolean;
  created_at: Date;
}

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'operator' | 'accountant';

export interface Company {
  id: string;
  name: string;
  gstin?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  subscription_plan: string;
  is_active: boolean;
  created_at: Date;
}

export interface Branch {
  id: string;
  company_id: string;
  branch_code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  is_head_office: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface Consignment {
  id: string;
  company_id: string;
  cn_number: string;
  booking_date: Date;
  booking_time: string;
  from_branch_id: string;
  to_branch_id: string;
  
  // Consignor Details
  consignor_id?: string;
  consignor_name: string;
  consignor_phone: string;
  consignor_address?: string;
  consignor_gstin?: string;
  
  // Consignee Details
  consignee_name: string;
  consignee_phone: string;
  consignee_address?: string;
  consignee_pincode?: string;
  
  // Goods Details
  goods_description?: string;
  goods_value?: number;
  eway_bill_number?: string;
  invoice_number?: string;
  no_of_packages: number;
  actual_weight?: number;
  charged_weight?: number;
  
  // Charges
  freight_amount: number;
  hamali_charges?: number;
  door_delivery_charges?: number;
  loading_charges?: number;
  unloading_charges?: number;
  other_charges?: number;
  statistical_charges?: number;
  
  // GST
  gst_percentage: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_amount: number;
  
  // Other
  payment_type: 'paid' | 'topay' | 'tbb';
  delivery_type: 'godown' | 'door';
  status: ConsignmentStatus;
  current_branch_id?: string;
  
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export type ConsignmentStatus = 
  | 'booked'
  | 'picked'
  | 'in_transit'
  | 'reached'
  | 'out_for_delivery'
  | 'delivered'
  | 'undelivered'
  | 'cancelled';

export interface OGPL {
  id: string;
  company_id: string;
  ogpl_number: string;
  ogpl_date: Date;
  from_branch_id: string;
  to_branch_id: string;
  vehicle_id?: string;
  vehicle_number?: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  seal_number?: string;
  departure_time?: Date;
  arrival_time?: Date;
  total_packages: number;
  total_weight: number;
  total_consignments: number;
  status: OGPLStatus;
  created_by: string;
  created_at: Date;
}

export type OGPLStatus = 'created' | 'departed' | 'intransit' | 'reached';

export interface Customer {
  id: string;
  company_id: string;
  customer_code?: string;
  name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  gstin?: string;
  customer_type: 'regular' | 'walkin' | 'corporate';
  credit_limit: number;
  credit_days: number;
  opening_balance: number;
  special_rates?: any;
  created_by: string;
  created_at: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface JwtPayload {
  userId: string;
  companyId: string;
  branchId: string;
  role: UserRole;
  username: string;
  tenantId?: string;
  tenantCode?: string;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

export interface TenantAuthRequest extends AuthRequest {
  tenantId?: string;
  tenantCode?: string;
}