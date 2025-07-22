-- Seed data for DesiCargo

-- Insert demo company
INSERT INTO companies (id, name, gstin, address, phone, email, subscription_plan)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'DesiCargo Logistics Pvt Ltd',
  '27AABCD1234E1Z5',
  '123 Transport Hub, Mumbai',
  '9876543210',
  'info@desicargo.com',
  'premium'
);

-- Insert branches
INSERT INTO branches (id, company_id, branch_code, name, address, city, state, pincode, phone, is_head_office)
VALUES 
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MUM', 'Mumbai Head Office', 'Transport Hub, Andheri East', 'Mumbai', 'Maharashtra', '400069', '022-12345678', true),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DEL', 'Delhi Branch', 'Sector 18, Gurgaon', 'Delhi', 'Delhi', '110001', '011-12345678', false),
  ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'BLR', 'Bangalore Branch', 'Electronic City', 'Bangalore', 'Karnataka', '560001', '080-12345678', false);

-- Insert users 
-- admin/admin123, operator1/operator123, delhi_mgr/password123
INSERT INTO users (id, company_id, branch_id, username, password_hash, full_name, role, phone, email)
VALUES 
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', '$2b$10$9k7uW84hqN9xhyP5xNYG2eOttPTJujyKr29giJKDNr6TjjOF.f.Iu', 'Admin User', 'admin', '9876543211', 'admin@desicargo.com'),
  ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'operator1', '$2b$10$5MrOQGZy8m.dHX7JEkMn/uNHRphxPiFw4gLTYZVdf0WCIWNBIzYvm', 'John Operator', 'operator', '9876543212', 'john@desicargo.com'),
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'delhi_mgr', '$2b$10$biVEdCZ3BEgDdtr301bx4u.VTR9Lywk1Fs4ogudsDMajD49I3WGVK', 'Delhi Manager', 'manager', '9876543213', 'delhi@desicargo.com');

-- Insert some routes
INSERT INTO routes (company_id, from_city, to_city, distance_km, transit_days, rate_per_kg, min_charge)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mumbai', 'Delhi', 1400, 2, 15.50, 500),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mumbai', 'Bangalore', 980, 2, 12.00, 400),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Delhi', 'Bangalore', 2150, 3, 18.00, 600),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mumbai', 'Pune', 150, 1, 8.00, 200),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Delhi', 'Gurgaon', 30, 1, 5.00, 150);

-- Insert vehicles
INSERT INTO vehicles (company_id, vehicle_number, vehicle_type, capacity_kg, owner_type, owner_name)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MH-04-AB-1234', 'truck', 5000, 'own', 'Company Owned'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MH-04-CD-5678', 'tata407', 2000, 'own', 'Company Owned'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DL-01-EF-9012', 'mini', 1000, 'attached', 'Rajesh Transport');

-- Insert drivers
INSERT INTO drivers (company_id, driver_code, name, phone, license_number, salary_type, salary_amount)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DRV001', 'Ramesh Kumar', '9876543220', 'MH1234567890', 'fixed', 25000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DRV002', 'Suresh Singh', '9876543221', 'DL0987654321', 'per_trip', 1500),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DRV003', 'Mahesh Sharma', '9876543222', 'KA1122334455', 'per_km', 15);

-- Insert sample customers
INSERT INTO customers (company_id, customer_code, name, phone, email, address, city, customer_type, credit_limit, credit_days)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CUST001', 'ABC Traders', '9876543230', 'abc@traders.com', 'Market Road, Andheri', 'Mumbai', 'regular', 50000, 30),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CUST002', 'XYZ Industries', '9876543231', 'xyz@industries.com', 'Industrial Area, Phase 2', 'Delhi', 'corporate', 100000, 45),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'Walk-in Customer', '9876543232', NULL, NULL, NULL, 'walkin', 0, 0);