export interface ExpenseCategory {
  id: string;
  company_id: string;
  category_name: string;
  category_type: 'direct' | 'indirect';
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Expense {
  id: string;
  company_id: string;
  expense_date: Date;
  category_id: string;
  amount: number;
  description?: string;
  vehicle_id?: string;
  driver_id?: string;
  ogpl_id?: string;
  branch_id?: string;
  payment_mode?: 'cash' | 'online' | 'credit';
  reference_number?: string;
  bill_number?: string;
  attachment_url?: string;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
  // Joined fields
  category_name?: string;
  category_type?: string;
  vehicle_number?: string;
  driver_name?: string;
  ogpl_number?: string;
  branch_name?: string;
}

export interface RecurringExpense {
  id: string;
  company_id: string;
  expense_name: string;
  category_id: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  vehicle_id?: string;
  driver_id?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface ExpenseFilter {
  company_id: string;
  branch_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  ogpl_id?: string;
  category_id?: string;
  category_type?: 'direct' | 'indirect';
  from_date?: Date;
  to_date?: Date;
  payment_mode?: string;
}

export interface TripPLReport {
  ogpl_id: string;
  ogpl_number: string;
  route: string;
  vehicle_number: string;
  trip_date: Date;
  revenue: {
    consignment_count: number;
    total_freight: number;
    other_charges: number;
    total_revenue: number;
  };
  expenses: {
    category_wise: Array<{
      category_name: string;
      amount: number;
    }>;
    total_expenses: number;
  };
  profit: number;
  profit_margin: number;
}

export interface VehiclePLReport {
  vehicle_id: string;
  vehicle_number: string;
  period: string;
  total_trips: number;
  total_km: number;
  revenue: number;
  expenses: {
    fuel: number;
    driver: number;
    maintenance: number;
    others: number;
    total: number;
  };
  profit: number;
  profit_margin: number;
}

export interface ExpenseSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  expense_breakdown: Array<{
    category_name: string;
    category_type: string;
    amount: number;
    percentage: number;
  }>;
  top_expenses: Array<{
    category_name: string;
    amount: number;
  }>;
}