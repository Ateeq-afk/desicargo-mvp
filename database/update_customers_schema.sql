-- Add missing columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_business_value DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_booking_date DATE,
ADD COLUMN IF NOT EXISTS current_outstanding DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for search
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm ON customers USING gin(phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(company_id, is_active);

-- Add sample customers
INSERT INTO customers (company_id, name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, credit_days)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ABC Corporation', '9876543210', 'abc@corp.com', '123 Business Park', 'Mumbai', 'Maharashtra', '400001', '27AABCU9603R1ZX', 'corporate', 50000, 30),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'XYZ Traders', '9876543211', 'xyz@traders.com', '456 Market Street', 'Delhi', 'Delhi', '110001', '07AABCU9603R1ZY', 'regular', 25000, 15),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Quick Logistics', '9876543212', 'quick@logistics.com', '789 Transport Hub', 'Bangalore', 'Karnataka', '560001', '29AABCU9603R1ZZ', 'agent', 100000, 45),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'John Doe', '9111222333', 'john@email.com', '10 Residence Road', 'Mumbai', 'Maharashtra', '400050', NULL, 'regular', 0, 0),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sara Industries', '9444555666', 'sara@industries.com', '20 Industrial Area', 'Pune', 'Maharashtra', '411001', '27AABCS1234E1Z5', 'corporate', 75000, 30)
ON CONFLICT (company_id, phone) DO NOTHING;