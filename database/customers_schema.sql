-- Customers table for managing customer data
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  alternate_phone VARCHAR(15),
  email VARCHAR(255),
  
  -- Address Details
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  
  -- Business Information
  gstin VARCHAR(20),
  customer_type VARCHAR(20) DEFAULT 'regular' CHECK (customer_type IN ('regular', 'walkin', 'corporate', 'agent')),
  
  -- Credit Information
  credit_limit DECIMAL(10, 2) DEFAULT 0,
  credit_days INTEGER DEFAULT 0,
  current_outstanding DECIMAL(10, 2) DEFAULT 0,
  
  -- Additional Information
  special_instructions TEXT,
  
  -- Analytics (updated via triggers)
  total_bookings INTEGER DEFAULT 0,
  total_business_value DECIMAL(12, 2) DEFAULT 0,
  last_booking_date DATE,
  
  -- System Fields
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  
  -- Unique constraint on phone per company
  CONSTRAINT unique_customer_phone_per_company UNIQUE(company_id, phone)
);

-- Indexes for performance
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_search ON customers(name, phone);
CREATE INDEX idx_customers_active ON customers(company_id, is_active);

-- Full text search
CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_phone_trgm ON customers USING gin(phone gin_trgm_ops);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_update_timestamp
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Function to update customer analytics
CREATE OR REPLACE FUNCTION update_customer_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update consignor analytics
    UPDATE customers 
    SET 
      total_bookings = total_bookings + 1,
      total_business_value = total_business_value + NEW.freight_amount,
      last_booking_date = NEW.booking_date
    WHERE phone = NEW.consignor_phone AND company_id = NEW.company_id;
    
    -- Update consignee analytics if different
    IF NEW.consignee_phone != NEW.consignor_phone THEN
      UPDATE customers 
      SET 
        total_bookings = total_bookings + 1,
        total_business_value = total_business_value + NEW.freight_amount,
        last_booking_date = NEW.booking_date
      WHERE phone = NEW.consignee_phone AND company_id = NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer analytics when booking is created
CREATE TRIGGER update_customer_analytics_on_booking
  AFTER INSERT ON consignments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_analytics();

-- Sample data for testing
INSERT INTO customers (company_id, name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, credit_days)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ABC Corporation', '9876543210', 'abc@corp.com', '123 Business Park', 'Mumbai', 'Maharashtra', '400001', '27AABCU9603R1ZX', 'corporate', 50000, 30),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'XYZ Traders', '9876543211', 'xyz@traders.com', '456 Market Street', 'Delhi', 'Delhi', '110001', '07AABCU9603R1ZY', 'regular', 25000, 15),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Quick Logistics', '9876543212', 'quick@logistics.com', '789 Transport Hub', 'Bangalore', 'Karnataka', '560001', '29AABCU9603R1ZZ', 'agent', 100000, 45),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'John Doe', '9111222333', 'john@email.com', '10 Residence Road', 'Mumbai', 'Maharashtra', '400050', NULL, 'regular', 0, 0),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sara Industries', '9444555666', 'sara@industries.com', '20 Industrial Area', 'Pune', 'Maharashtra', '411001', '27AABCS1234E1Z5', 'corporate', 75000, 30);