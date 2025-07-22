-- K2K LOGISTICS - Corrected Seed Data
-- Matches actual database schema

BEGIN;

-- 1. COMPANY SETUP
INSERT INTO companies (id, name, gstin, address, phone, email, subscription_plan, is_active) VALUES 
(gen_random_uuid(), 'K2K Logistics Pvt Ltd', '29ABCDE1234F1Z5', '#45, Industrial Area, Whitefield, Bangalore, Karnataka - 560066', '+91-9876543210', 'admin@k2klogistics.com', 'professional', true);

-- Get the company ID for reference
DO $$ 
DECLARE 
    company_uuid UUID;
    branch_blr_hq UUID;
    branch_chennai UUID;
    branch_hyderabad UUID;
    branch_mumbai UUID;
    admin_user_id UUID;
    manager_user_id UUID;
BEGIN
    -- Get the company ID
    SELECT id INTO company_uuid FROM companies WHERE name = 'K2K Logistics Pvt Ltd';

    -- 2. BRANCHES SETUP
    INSERT INTO branches (id, company_id, branch_code, name, address, city, state, pincode, phone, email, is_head_office, is_active) VALUES 
    (gen_random_uuid(), company_uuid, 'BLR-HQ', 'K2K Bangalore HQ', '#45, Industrial Area, Whitefield', 'Bangalore', 'Karnataka', '560066', '+91-9876543210', 'bangalore@k2klogistics.com', true, true),
    (gen_random_uuid(), company_uuid, 'CHN', 'K2K Chennai Branch', '123, Mount Road, T Nagar', 'Chennai', 'Tamil Nadu', '600017', '+91-9876543211', 'chennai@k2klogistics.com', false, true),
    (gen_random_uuid(), company_uuid, 'HYD', 'K2K Hyderabad Branch', '456, HITEC City, Madhapur', 'Hyderabad', 'Telangana', '500081', '+91-9876543212', 'hyderabad@k2klogistics.com', false, true),
    (gen_random_uuid(), company_uuid, 'MUM', 'K2K Mumbai Branch', '321, Andheri East, MIDC', 'Mumbai', 'Maharashtra', '400093', '+91-9876543214', 'mumbai@k2klogistics.com', false, true);

    -- Get branch IDs
    SELECT id INTO branch_blr_hq FROM branches WHERE branch_code = 'BLR-HQ';
    SELECT id INTO branch_chennai FROM branches WHERE branch_code = 'CHN';
    SELECT id INTO branch_hyderabad FROM branches WHERE branch_code = 'HYD';
    SELECT id INTO branch_mumbai FROM branches WHERE branch_code = 'MUM';

    -- 3. USERS SETUP
    INSERT INTO users (id, company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active) VALUES 
    (gen_random_uuid(), company_uuid, branch_blr_hq, 'admin', '$2b$10$example_hash_admin', 'Rajesh Kumar', 'admin', '+91-9876543210', 'admin@k2klogistics.com', true),
    (gen_random_uuid(), company_uuid, branch_blr_hq, 'blr_manager', '$2b$10$example_hash_manager', 'Priya Sharma', 'manager', '+91-9876543220', 'priya.sharma@k2klogistics.com', true),
    (gen_random_uuid(), company_uuid, branch_blr_hq, 'blr_operator', '$2b$10$example_hash_operator', 'Sudhir Kumar', 'operator', '+91-9876543221', 'sudhir.kumar@k2klogistics.com', true),
    (gen_random_uuid(), company_uuid, branch_chennai, 'chn_manager', '$2b$10$example_hash_manager', 'Suresh Babu', 'manager', '+91-9876543211', 'suresh.babu@k2klogistics.com', true),
    (gen_random_uuid(), company_uuid, branch_hyderabad, 'hyd_manager', '$2b$10$example_hash_manager', 'Prasad Reddy', 'manager', '+91-9876543212', 'prasad.reddy@k2klogistics.com', true),
    (gen_random_uuid(), company_uuid, branch_mumbai, 'mum_manager', '$2b$10$example_hash_manager', 'Amit Shah', 'manager', '+91-9876543214', 'amit.shah@k2klogistics.com', true);

    -- Get user IDs for reference
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT id INTO manager_user_id FROM users WHERE username = 'blr_manager';

    -- 4. GOODS MASTER
    INSERT INTO goods_master (id, company_id, goods_name, goods_code, hsn_code, is_active, created_by) VALUES 
    (gen_random_uuid(), company_uuid, 'Electronics', 'ELEC', '8517', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Mobile Phones', 'MOB', '8517', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Laptops & Computers', 'COMP', '8471', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Readymade Garments', 'GARM', '6203', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Cotton Fabric', 'FAB', '5208', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Silk Sarees', 'SAREE', '5007', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'General Goods', 'GEN', '9999', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Books & Stationery', 'BOOKS', '4901', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Medicines', 'MED', '3004', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Automotive Parts', 'AUTO', '8708', true, admin_user_id);

    -- 5. CUSTOMERS
    INSERT INTO customers (id, company_id, name, contact_person, contact_phone, contact_email, city, state, pincode, is_active, created_by) VALUES 
    (gen_random_uuid(), company_uuid, 'Tech Solutions Pvt Ltd', 'Anand Kumar', '+91-9988776655', 'anand@techsolutions.com', 'Bangalore', 'Karnataka', '560100', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore Textile House', 'Lakshmi Devi', '+91-9988776656', 'lakshmi@textilehouse.com', 'Bangalore', 'Karnataka', '560001', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Chennai Electronics Hub', 'Murugan S', '+91-9988776657', 'murugan@electronichub.com', 'Chennai', 'Tamil Nadu', '600017', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Mumbai Import Traders', 'Kiran Patel', '+91-9988776659', 'kiran@mumbaitraders.com', 'Mumbai', 'Maharashtra', '400093', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Delhi Auto Components Ltd', 'Rajesh Aggarwal', '+91-9988776660', 'rajesh@autocomponents.com', 'Gurgaon', 'Haryana', '122015', true, admin_user_id);

    -- 6. RATE MASTER - Key routes with goods-based pricing
    INSERT INTO rate_master (id, company_id, from_city, to_city, goods_type, rate_per_kg, min_charge, is_active, created_by) VALUES 
    -- Electronics - Premium rates
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Chennai', 'Electronics', 4.50, 150, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Hyderabad', 'Electronics', 4.25, 120, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Mumbai', 'Electronics', 6.50, 200, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Delhi', 'Electronics', 7.25, 250, true, admin_user_id),
    
    -- Textiles - Standard rates  
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Chennai', 'Readymade Garments', 3.25, 100, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Hyderabad', 'Readymade Garments', 3.00, 80, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Mumbai', 'Readymade Garments', 4.50, 150, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Delhi', 'Readymade Garments', 5.25, 180, true, admin_user_id),
    
    -- General Goods - Economical rates
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Chennai', 'General Goods', 2.75, 75, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Hyderabad', 'General Goods', 2.50, 60, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Mumbai', 'General Goods', 3.75, 120, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Bangalore', 'Delhi', 'General Goods', 4.25, 150, true, admin_user_id),

    -- Return routes
    (gen_random_uuid(), company_uuid, 'Chennai', 'Bangalore', 'Electronics', 4.25, 140, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Mumbai', 'Bangalore', 'Electronics', 6.25, 190, true, admin_user_id);

    -- 7. VEHICLES
    INSERT INTO vehicles (id, company_id, vehicle_number, owner_type, capacity_kg, is_active, created_by) VALUES 
    (gen_random_uuid(), company_uuid, 'KA02-AB-1234', 'owned', 9000, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'KA02-CD-5678', 'owned', 5000, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'TN09-XY-7890', 'owned', 9000, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'TS08-PQ-4455', 'owned', 9000, true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'MH12-RS-7788', 'leased', 5000, true, admin_user_id);

    -- 8. DRIVERS  
    INSERT INTO drivers (id, company_id, name, license_number, contact_phone, is_active, created_by) VALUES 
    (gen_random_uuid(), company_uuid, 'Ravi Kumar', 'KA02-20230001234', '+91-9876543301', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Suresh Gowda', 'KA02-20230001235', '+91-9876543302', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Murugan', 'TN09-20230002001', '+91-9876543311', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Ravi Teja', 'TS08-20230003001', '+91-9876543321', true, admin_user_id),
    (gen_random_uuid(), company_uuid, 'Prakash Patil', 'MH12-20230004001', '+91-9876543331', true, admin_user_id);

END $$;

COMMIT;

-- Verification Report
SELECT 
    'K2K LOGISTICS SETUP COMPLETED' as status,
    c.name as company_name,
    (SELECT COUNT(*) FROM branches WHERE company_id = c.id) as total_branches,
    (SELECT COUNT(*) FROM users WHERE company_id = c.id) as total_users,
    (SELECT COUNT(*) FROM goods_master WHERE company_id = c.id) as goods_categories,
    (SELECT COUNT(*) FROM customers WHERE company_id = c.id) as customers_added,
    (SELECT COUNT(*) FROM rate_master WHERE company_id = c.id) as rate_entries,
    (SELECT COUNT(*) FROM vehicles WHERE company_id = c.id) as fleet_size,
    (SELECT COUNT(*) FROM drivers WHERE company_id = c.id) as total_drivers
FROM companies c 
WHERE c.name = 'K2K Logistics Pvt Ltd';

-- Show branch network
SELECT 
    'BRANCH NETWORK' as info,
    branch_code,
    name as branch_name,
    city,
    state,
    CASE WHEN is_head_office THEN 'HQ' ELSE 'Branch' END as type
FROM branches b
JOIN companies c ON b.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd'
ORDER BY is_head_office DESC, city;

-- Show rate matrix sample
SELECT 
    'RATE MATRIX SAMPLE' as info,
    from_city,
    to_city,
    goods_type,
    rate_per_kg,
    min_charge
FROM rate_master rm
JOIN companies c ON rm.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd'
ORDER BY from_city, to_city, goods_type
LIMIT 10;