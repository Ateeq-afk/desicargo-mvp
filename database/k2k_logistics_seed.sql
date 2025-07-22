-- K2K LOGISTICS - Complete Seed Data
-- Organization: K2K Logistics Pvt Ltd
-- HQ: Bangalore, Karnataka
-- Business: Pan-India logistics operations

-- Start transaction
BEGIN;

-- 1. COMPANY SETUP
INSERT INTO companies (id, company_name, company_code, contact_person, contact_phone, contact_email, address_line1, city, state, country, postal_code, gst_number, pan_number, is_active, created_at, updated_at) VALUES 
('k2k-logistics-001', 'K2K Logistics Pvt Ltd', 'K2K', 'Rajesh Kumar', '+91-9876543210', 'admin@k2klogistics.com', '#45, Industrial Area, Whitefield', 'Bangalore', 'Karnataka', 'India', '560066', '29ABCDE1234F1Z5', 'ABCDE1234F', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. BRANCH SETUP (Bangalore HQ + Network)
INSERT INTO branches (id, company_id, branch_name, branch_code, branch_type, contact_person, contact_phone, contact_email, address_line1, city, state, country, postal_code, is_active, created_at, updated_at) VALUES 
-- Bangalore HQ
('branch-blr-hq', 'k2k-logistics-001', 'K2K Bangalore HQ', 'BLR-HQ', 'head_office', 'Rajesh Kumar', '+91-9876543210', 'bangalore@k2klogistics.com', '#45, Industrial Area, Whitefield', 'Bangalore', 'Karnataka', 'India', '560066', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- South India Network
('branch-chennai', 'k2k-logistics-001', 'K2K Chennai Branch', 'CHN', 'branch', 'Suresh Babu', '+91-9876543211', 'chennai@k2klogistics.com', '123, Mount Road, T Nagar', 'Chennai', 'Tamil Nadu', 'India', '600017', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('branch-hyderabad', 'k2k-logistics-001', 'K2K Hyderabad Branch', 'HYD', 'branch', 'Prasad Reddy', '+91-9876543212', 'hyderabad@k2klogistics.com', '456, HITEC City, Madhapur', 'Hyderabad', 'Telangana', 'India', '500081', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('branch-kochi', 'k2k-logistics-001', 'K2K Kochi Branch', 'KOC', 'branch', 'Ravi Nair', '+91-9876543213', 'kochi@k2klogistics.com', '789, Marine Drive, Ernakulam', 'Kochi', 'Kerala', 'India', '682031', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Major Metro Network
('branch-mumbai', 'k2k-logistics-001', 'K2K Mumbai Branch', 'MUM', 'branch', 'Amit Shah', '+91-9876543214', 'mumbai@k2klogistics.com', '321, Andheri East, MIDC', 'Mumbai', 'Maharashtra', 'India', '400093', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('branch-delhi', 'k2k-logistics-001', 'K2K Delhi Branch', 'DEL', 'branch', 'Vikram Singh', '+91-9876543215', 'delhi@k2klogistics.com', '654, Gurgaon Sector 18', 'Gurgaon', 'Haryana', 'India', '122015', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('branch-pune', 'k2k-logistics-001', 'K2K Pune Branch', 'PUN', 'branch', 'Sachin Patil', '+91-9876543216', 'pune@k2klogistics.com', '987, Hinjewadi Phase 2', 'Pune', 'Maharashtra', 'India', '411057', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. USER ROLES & PERMISSIONS
INSERT INTO roles (id, company_id, role_name, permissions, is_active, created_at, updated_at) VALUES 
('role-admin', 'k2k-logistics-001', 'Admin', '{"all": true}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('role-manager', 'k2k-logistics-001', 'Branch Manager', '{"booking": true, "tracking": true, "delivery": true, "billing": true, "reports": true}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('role-operator', 'k2k-logistics-001', 'Booking Operator', '{"booking": true, "tracking": true, "delivery": true}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('role-accounts', 'k2k-logistics-001', 'Accounts', '{"billing": true, "reports": true, "expenses": true}', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. USERS SETUP
INSERT INTO users (id, company_id, branch_id, role_id, name, email, phone, password_hash, is_active, created_by, created_at, updated_at) VALUES 
-- HQ Users
('user-admin', 'k2k-logistics-001', 'branch-blr-hq', 'role-admin', 'Rajesh Kumar', 'admin@k2klogistics.com', '+91-9876543210', '$2b$10$example_hash_admin', true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('user-blr-mgr', 'k2k-logistics-001', 'branch-blr-hq', 'role-manager', 'Priya Sharma', 'priya.sharma@k2klogistics.com', '+91-9876543220', '$2b$10$example_hash_manager', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('user-blr-op1', 'k2k-logistics-001', 'branch-blr-hq', 'role-operator', 'Sudhir Kumar', 'sudhir.kumar@k2klogistics.com', '+91-9876543221', '$2b$10$example_hash_operator', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Branch Users
('user-chn-mgr', 'k2k-logistics-001', 'branch-chennai', 'role-manager', 'Suresh Babu', 'suresh.babu@k2klogistics.com', '+91-9876543211', '$2b$10$example_hash_manager', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('user-hyd-mgr', 'k2k-logistics-001', 'branch-hyderabad', 'role-manager', 'Prasad Reddy', 'prasad.reddy@k2klogistics.com', '+91-9876543212', '$2b$10$example_hash_manager', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('user-mum-mgr', 'k2k-logistics-001', 'branch-mumbai', 'role-manager', 'Amit Shah', 'amit.shah@k2klogistics.com', '+91-9876543214', '$2b$10$example_hash_manager', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. GOODS MASTER DATA
INSERT INTO goods_master (id, company_id, goods_name, goods_code, hsn_code, is_active, created_by, created_at, updated_at) VALUES 
-- Electronics Category
('goods-electronics', 'k2k-logistics-001', 'Electronics', 'ELEC', '8517', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('goods-mobile-phones', 'k2k-logistics-001', 'Mobile Phones', 'MOB', '8517', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('goods-laptops', 'k2k-logistics-001', 'Laptops & Computers', 'COMP', '8471', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('goods-tv-appliances', 'k2k-logistics-001', 'TV & Home Appliances', 'TV', '8528', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Textiles Category
('goods-garments', 'k2k-logistics-001', 'Readymade Garments', 'GARM', '6203', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('goods-fabric', 'k2k-logistics-001', 'Cotton Fabric', 'FAB', '5208', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('goods-sarees', 'k2k-logistics-001', 'Silk Sarees', 'SAREE', '5007', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- General Categories
('goods-general', 'k2k-logistics-001', 'General Goods', 'GEN', '9999', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('goods-books', 'k2k-logistics-001', 'Books & Stationery', 'BOOKS', '4901', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('goods-medicines', 'k2k-logistics-001', 'Medicines', 'MED', '3004', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('goods-automotive', 'k2k-logistics-001', 'Automotive Parts', 'AUTO', '8708', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 6. CUSTOMERS SETUP (Major clients across cities)
INSERT INTO customers (id, company_id, customer_name, customer_type, contact_person, contact_phone, contact_email, billing_address, city, state, postal_code, gst_number, pan_number, credit_limit, payment_terms, is_active, created_by, created_at, updated_at) VALUES 
-- Bangalore Customers
('cust-tech-solutions', 'k2k-logistics-001', 'Tech Solutions Pvt Ltd', 'corporate', 'Anand Kumar', '+91-9988776655', 'anand@techsolutions.com', 'Electronic City, Phase 2, Bangalore', 'Bangalore', 'Karnataka', '560100', '29ABCDE5678F1Z5', 'ABCDE5678F', 500000, 30, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cust-textile-house', 'k2k-logistics-001', 'Bangalore Textile House', 'corporate', 'Lakshmi Devi', '+91-9988776656', 'lakshmi@textilehouse.com', 'Commercial Street, Bangalore', 'Bangalore', 'Karnataka', '560001', '29ABCDE9012F1Z5', 'ABCDE9012F', 300000, 15, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Chennai Customers  
('cust-chennai-electronics', 'k2k-logistics-001', 'Chennai Electronics Hub', 'corporate', 'Murugan S', '+91-9988776657', 'murugan@electronichub.com', 'T Nagar, Chennai', 'Chennai', 'Tamil Nadu', '600017', '33ABCDE3456F1Z5', 'ABCDE3456F', 400000, 30, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cust-textile-exports', 'k2k-logistics-001', 'South India Textile Exports', 'corporate', 'Raman Pillai', '+91-9988776658', 'raman@textileexports.com', 'Guindy Industrial Estate, Chennai', 'Chennai', 'Tamil Nadu', '600032', '33ABCDE7890F1Z5', 'ABCDE7890F', 600000, 45, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Mumbai Customers
('cust-mumbai-traders', 'k2k-logistics-001', 'Mumbai Import Traders', 'corporate', 'Kiran Patel', '+91-9988776659', 'kiran@mumbaitraders.com', 'Andheri East, Mumbai', 'Mumbai', 'Maharashtra', '400093', '27ABCDE1357F1Z5', 'ABCDE1357F', 750000, 30, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Delhi Customers
('cust-delhi-auto', 'k2k-logistics-001', 'Delhi Auto Components Ltd', 'corporate', 'Rajesh Aggarwal', '+91-9988776660', 'rajesh@autocomponents.com', 'Gurgaon Sector 18, Delhi NCR', 'Gurgaon', 'Haryana', '122015', '06ABCDE2468F1Z5', 'ABCDE2468F', 450000, 30, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 7. RATE MASTER - Route and Goods-wise pricing
INSERT INTO rate_master (id, company_id, from_city, to_city, goods_type, rate_per_kg, min_charge, is_active, created_by, created_at, updated_at) VALUES 
-- Bangalore to other cities - Electronics (Premium rates)
('rate-blr-chn-elec', 'k2k-logistics-001', 'Bangalore', 'Chennai', 'Electronics', 4.50, 150, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-hyd-elec', 'k2k-logistics-001', 'Bangalore', 'Hyderabad', 'Electronics', 4.25, 120, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-mum-elec', 'k2k-logistics-001', 'Bangalore', 'Mumbai', 'Electronics', 6.50, 200, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-del-elec', 'k2k-logistics-001', 'Bangalore', 'Delhi', 'Electronics', 7.25, 250, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-pun-elec', 'k2k-logistics-001', 'Bangalore', 'Pune', 'Electronics', 5.75, 180, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-koc-elec', 'k2k-logistics-001', 'Bangalore', 'Kochi', 'Electronics', 5.50, 160, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Bangalore to other cities - Textiles (Standard rates)
('rate-blr-chn-text', 'k2k-logistics-001', 'Bangalore', 'Chennai', 'Readymade Garments', 3.25, 100, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-hyd-text', 'k2k-logistics-001', 'Bangalore', 'Hyderabad', 'Readymade Garments', 3.00, 80, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-mum-text', 'k2k-logistics-001', 'Bangalore', 'Mumbai', 'Readymade Garments', 4.50, 150, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-del-text', 'k2k-logistics-001', 'Bangalore', 'Delhi', 'Readymade Garments', 5.25, 180, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-pun-text', 'k2k-logistics-001', 'Bangalore', 'Pune', 'Readymade Garments', 4.25, 130, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-koc-text', 'k2k-logistics-001', 'Bangalore', 'Kochi', 'Readymade Garments', 4.00, 120, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Bangalore to other cities - General Goods (Economical rates)
('rate-blr-chn-gen', 'k2k-logistics-001', 'Bangalore', 'Chennai', 'General Goods', 2.75, 75, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-hyd-gen', 'k2k-logistics-001', 'Bangalore', 'Hyderabad', 'General Goods', 2.50, 60, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-mum-gen', 'k2k-logistics-001', 'Bangalore', 'Mumbai', 'General Goods', 3.75, 120, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-del-gen', 'k2k-logistics-001', 'Bangalore', 'Delhi', 'General Goods', 4.25, 150, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-pun-gen', 'k2k-logistics-001', 'Bangalore', 'Pune', 'General Goods', 3.50, 100, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-blr-koc-gen', 'k2k-logistics-001', 'Bangalore', 'Kochi', 'General Goods', 3.25, 90, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Reverse direction rates (Return loads)
('rate-chn-blr-elec', 'k2k-logistics-001', 'Chennai', 'Bangalore', 'Electronics', 4.25, 140, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-hyd-blr-elec', 'k2k-logistics-001', 'Hyderabad', 'Bangalore', 'Electronics', 4.00, 110, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rate-mum-blr-elec', 'k2k-logistics-001', 'Mumbai', 'Bangalore', 'Electronics', 6.25, 190, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 8. CUSTOMER SPECIAL RATES (VIP Customer pricing)
INSERT INTO customer_rate_master (id, customer_id, company_id, from_city, to_city, goods_type, special_rate, min_charge, is_active, created_by, created_at, updated_at) VALUES 
-- Tech Solutions - Volume discount
('cust-rate-tech-blr-chn', 'cust-tech-solutions', 'k2k-logistics-001', 'Bangalore', 'Chennai', 'Electronics', 4.00, 130, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cust-rate-tech-blr-mum', 'cust-tech-solutions', 'k2k-logistics-001', 'Bangalore', 'Mumbai', 'Electronics', 6.00, 180, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Textile House - Long-term contract rates
('cust-rate-textile-blr-chn', 'cust-textile-house', 'k2k-logistics-001', 'Bangalore', 'Chennai', 'Readymade Garments', 2.75, 80, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cust-rate-textile-blr-del', 'cust-textile-house', 'k2k-logistics-001', 'Bangalore', 'Delhi', 'Readymade Garments', 4.75, 160, true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 9. VEHICLE TYPES MASTER
INSERT INTO vehicle_types (id, company_id, type_name, capacity_kg, dimensions, fuel_type, is_active, created_by, created_at, updated_at) VALUES 
('vtype-mini-truck', 'k2k-logistics-001', 'Mini Truck (Tata Ace)', 750, '6ft x 4ft x 4ft', 'diesel', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vtype-small-truck', 'k2k-logistics-001', 'Small Truck (Bolero Pickup)', 1500, '8ft x 5ft x 4ft', 'diesel', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vtype-medium-truck', 'k2k-logistics-001', 'Medium Truck (Eicher 1095)', 5000, '14ft x 6ft x 6ft', 'diesel', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vtype-large-truck', 'k2k-logistics-001', 'Large Truck (Tata 1615)', 9000, '19ft x 7ft x 7ft', 'diesel', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vtype-container', 'k2k-logistics-001', '20ft Container Truck', 15000, '20ft x 8ft x 8ft', 'diesel', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 10. EXPENSE CATEGORIES
INSERT INTO expense_categories (id, company_id, category_name, category_type, is_active, created_by, created_at, updated_at) VALUES 
-- Direct Expenses (Trip-related)
('exp-fuel', 'k2k-logistics-001', 'Fuel & Diesel', 'direct', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('exp-driver-salary', 'k2k-logistics-001', 'Driver Salary & Allowance', 'direct', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('exp-toll', 'k2k-logistics-001', 'Toll & RTO Charges', 'direct', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('exp-maintenance', 'k2k-logistics-001', 'Vehicle Maintenance', 'direct', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('exp-loading', 'k2k-logistics-001', 'Loading & Unloading', 'direct', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Indirect Expenses (Operational)
('exp-office-rent', 'k2k-logistics-001', 'Office Rent', 'indirect', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('exp-staff-salary', 'k2k-logistics-001', 'Staff Salary', 'indirect', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('exp-utilities', 'k2k-logistics-001', 'Electricity & Utilities', 'indirect', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('exp-insurance', 'k2k-logistics-001', 'Vehicle Insurance', 'indirect', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('exp-marketing', 'k2k-logistics-001', 'Marketing & Advertising', 'indirect', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;

-- Summary Report
SELECT 
    'K2K LOGISTICS SETUP COMPLETE' as status,
    (SELECT COUNT(*) FROM branches WHERE company_id = 'k2k-logistics-001') as branches_created,
    (SELECT COUNT(*) FROM users WHERE company_id = 'k2k-logistics-001') as users_created,
    (SELECT COUNT(*) FROM goods_master WHERE company_id = 'k2k-logistics-001') as goods_types,
    (SELECT COUNT(*) FROM customers WHERE company_id = 'k2k-logistics-001') as customers_added,
    (SELECT COUNT(*) FROM rate_master WHERE company_id = 'k2k-logistics-001') as standard_rates,
    (SELECT COUNT(*) FROM customer_rate_master WHERE company_id = 'k2k-logistics-001') as special_rates;