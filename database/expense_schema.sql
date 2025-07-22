-- Expense Categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  category_name VARCHAR(100) NOT NULL,
  category_type VARCHAR(50) NOT NULL CHECK (category_type IN ('direct', 'indirect')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Master
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  
  -- Link to operations
  vehicle_id UUID REFERENCES vehicles(id),
  driver_id UUID REFERENCES drivers(id),
  ogpl_id UUID REFERENCES ogpl(id),
  branch_id UUID REFERENCES branches(id),
  
  -- Payment details
  payment_mode VARCHAR(50) CHECK (payment_mode IN ('cash', 'online', 'credit')),
  reference_number VARCHAR(100),
  bill_number VARCHAR(100),
  
  -- Attachment
  attachment_url TEXT,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recurring expenses
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  expense_name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(50) CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  vehicle_id UUID REFERENCES vehicles(id),
  driver_id UUID REFERENCES drivers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_expenses_company_date ON expenses(company_id, expense_date);
CREATE INDEX idx_expenses_ogpl ON expenses(ogpl_id);
CREATE INDEX idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- Insert default expense categories
INSERT INTO expense_categories (company_id, category_name, category_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Fuel', 'direct'),
  ('00000000-0000-0000-0000-000000000001', 'Toll Tax', 'direct'),
  ('00000000-0000-0000-0000-000000000001', 'Loading/Unloading Charges', 'direct'),
  ('00000000-0000-0000-0000-000000000001', 'Driver Bhatta', 'direct'),
  ('00000000-0000-0000-0000-000000000001', 'RTO/Police', 'direct'),
  ('00000000-0000-0000-0000-000000000001', 'Parking', 'direct'),
  ('00000000-0000-0000-0000-000000000001', 'Driver Salary', 'indirect'),
  ('00000000-0000-0000-0000-000000000001', 'Vehicle Insurance', 'indirect'),
  ('00000000-0000-0000-0000-000000000001', 'Vehicle Maintenance', 'indirect'),
  ('00000000-0000-0000-0000-000000000001', 'Tyre Replacement', 'indirect'),
  ('00000000-0000-0000-0000-000000000001', 'Office Rent', 'indirect'),
  ('00000000-0000-0000-0000-000000000001', 'Staff Salary', 'indirect');