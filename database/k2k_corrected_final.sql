-- K2K LOGISTICS - Final Setup with Correct Schema
-- Complete operational system ready for use

BEGIN;

-- Update existing company to K2K Logistics
UPDATE companies SET 
    name = 'K2K Logistics Pvt Ltd',
    gstin = '29K2KL1234F1Z5', 
    address = '#45, Industrial Area, Whitefield, Bangalore, Karnataka - 560066',
    phone = '+91-9876543210',
    email = 'admin@k2klogistics.com'
WHERE id = (SELECT id FROM companies LIMIT 1);

-- Get company ID for reference
DO $$ 
DECLARE 
    company_uuid UUID;
    branch_blr_hq UUID;
    admin_user_id UUID;
BEGIN
    -- Get company ID
    SELECT id INTO company_uuid FROM companies WHERE name = 'K2K Logistics Pvt Ltd';
    
    -- Update existing branches
    UPDATE branches SET 
        branch_code = 'BLR-HQ',
        name = 'K2K Bangalore HQ',
        address = '#45, Industrial Area, Whitefield', 
        city = 'Bangalore',
        state = 'Karnataka',
        pincode = '560066',
        phone = '+91-9876543210',
        email = 'bangalore@k2klogistics.com',
        is_head_office = true
    WHERE branch_code = 'BLR' AND company_id = company_uuid;

    UPDATE branches SET 
        name = 'K2K Mumbai Branch',
        email = 'mumbai@k2klogistics.com',
        is_head_office = false
    WHERE branch_code = 'MUM' AND company_id = company_uuid;

    UPDATE branches SET 
        name = 'K2K Delhi Branch',
        email = 'delhi@k2klogistics.com', 
        is_head_office = false
    WHERE branch_code = 'DEL' AND company_id = company_uuid;

    -- Add Chennai branch
    INSERT INTO branches (company_id, branch_code, name, address, city, state, pincode, phone, email, is_head_office, is_active) VALUES 
    (company_uuid, 'CHN', 'K2K Chennai Branch', '123, Mount Road, T Nagar', 'Chennai', 'Tamil Nadu', '600017', '+91-9876543211', 'chennai@k2klogistics.com', false, true)
    ON CONFLICT (branch_code) DO NOTHING;

    -- Get HQ branch ID
    SELECT id INTO branch_blr_hq FROM branches WHERE branch_code = 'BLR-HQ' AND company_id = company_uuid;

    -- Update admin user
    UPDATE users SET 
        company_id = company_uuid,
        branch_id = branch_blr_hq,
        full_name = 'Rajesh Kumar - K2K Admin',
        email = 'admin@k2klogistics.com'
    WHERE username = 'admin';

    -- Get admin user ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';

    -- Add operational staff
    INSERT INTO users (company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active) VALUES 
    (company_uuid, branch_blr_hq, 'blr_manager', '$2b$10$hash', 'Priya Sharma', 'manager', '+91-9876543220', 'priya@k2klogistics.com', true),
    (company_uuid, branch_blr_hq, 'blr_operator', '$2b$10$hash', 'Sudhir Kumar', 'operator', '+91-9876543221', 'sudhir@k2klogistics.com', true)
    ON CONFLICT (username) DO NOTHING;

    -- Clear existing data to avoid conflicts
    DELETE FROM rate_master WHERE company_id = company_uuid;
    DELETE FROM goods_master WHERE company_id = company_uuid; 
    DELETE FROM customers WHERE company_id = company_uuid;
    DELETE FROM vehicles WHERE company_id = company_uuid;
    DELETE FROM drivers WHERE company_id = company_uuid;

    -- GOODS MASTER DATA
    INSERT INTO goods_master (company_id, goods_name, goods_code, hsn_code, is_active, created_by) VALUES 
    (company_uuid, 'Electronics', 'ELEC', '8517', true, admin_user_id),
    (company_uuid, 'Mobile Phones', 'MOB', '8517', true, admin_user_id),
    (company_uuid, 'Laptops & Computers', 'COMP', '8471', true, admin_user_id),
    (company_uuid, 'Readymade Garments', 'GARM', '6203', true, admin_user_id),
    (company_uuid, 'Cotton Fabric', 'FAB', '5208', true, admin_user_id),
    (company_uuid, 'Silk Sarees', 'SAREE', '5007', true, admin_user_id),
    (company_uuid, 'General Goods', 'GEN', '9999', true, admin_user_id),
    (company_uuid, 'Books & Stationery', 'BOOKS', '4901', true, admin_user_id),
    (company_uuid, 'Medicines', 'MED', '3004', true, admin_user_id),
    (company_uuid, 'Automotive Parts', 'AUTO', '8708', true, admin_user_id);

    -- CUSTOMERS
    INSERT INTO customers (company_id, customer_code, name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, credit_days, is_active, created_by) VALUES 
    (company_uuid, 'CUST001', 'Tech Solutions India Pvt Ltd', '+91-9988776655', 'anand@techsolutions.com', 'Electronic City Phase 2', 'Bangalore', 'Karnataka', '560100', '29ABCDE5678F1Z5', 'corporate', 500000, 30, true, admin_user_id),
    (company_uuid, 'CUST002', 'Bangalore Textile House', '+91-9988776656', 'lakshmi@textilehouse.com', 'Commercial Street', 'Bangalore', 'Karnataka', '560001', '29ABCDE9012F1Z5', 'corporate', 300000, 15, true, admin_user_id),
    (company_uuid, 'CUST003', 'Chennai Electronics Hub', '+91-9988776657', 'murugan@electronichub.com', 'T Nagar', 'Chennai', 'Tamil Nadu', '600017', '33ABCDE7890F1Z5', 'corporate', 450000, 30, true, admin_user_id),
    (company_uuid, 'CUST004', 'Mumbai Import Traders', '+91-9988776659', 'kiran@mumbaitraders.com', 'Andheri East', 'Mumbai', 'Maharashtra', '400093', '27ABCDE5678F1Z5', 'corporate', 750000, 30, true, admin_user_id),
    (company_uuid, 'CUST005', 'Delhi Auto Components Ltd', '+91-9988776660', 'rajesh@autocomponents.com', 'Gurgaon Sector 18', 'Gurgaon', 'Haryana', '122015', '06ABCDE1357F1Z5', 'corporate', 450000, 30, true, admin_user_id);

    -- RATE MATRIX - Goods-based pricing from Bangalore HQ
    INSERT INTO rate_master (company_id, from_city, to_city, goods_type, rate_per_kg, min_charge, is_active, created_by) VALUES 
    -- ELECTRONICS - Premium rates
    (company_uuid, 'Bangalore', 'Chennai', 'Electronics', 4.50, 150, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'Electronics', 6.50, 200, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'Electronics', 7.25, 250, true, admin_user_id),
    
    -- TEXTILES - Standard rates
    (company_uuid, 'Bangalore', 'Chennai', 'Readymade Garments', 3.25, 100, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'Readymade Garments', 4.50, 150, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'Readymade Garments', 5.25, 180, true, admin_user_id),
    
    -- GENERAL GOODS - Economical rates
    (company_uuid, 'Bangalore', 'Chennai', 'General Goods', 2.75, 75, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'General Goods', 3.75, 120, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'General Goods', 4.25, 150, true, admin_user_id),
    
    -- Return routes
    (company_uuid, 'Chennai', 'Bangalore', 'Electronics', 4.25, 140, true, admin_user_id),
    (company_uuid, 'Mumbai', 'Bangalore', 'Electronics', 6.25, 190, true, admin_user_id),
    (company_uuid, 'Chennai', 'Bangalore', 'General Goods', 2.50, 70, true, admin_user_id);

    -- VEHICLES (using correct schema)
    INSERT INTO vehicles (company_id, vehicle_number, vehicle_type, capacity_kg, owner_type, is_active) VALUES 
    (company_uuid, 'KA02-AB-1234', 'Large Truck', 9000, 'owned', true),
    (company_uuid, 'KA02-CD-5678', 'Medium Truck', 5000, 'owned', true),
    (company_uuid, 'KA02-EF-9012', 'Small Truck', 1500, 'owned', true),
    (company_uuid, 'TN09-XY-7890', 'Large Truck', 9000, 'owned', true),
    (company_uuid, 'MH12-RS-7788', 'Medium Truck', 5000, 'leased', true);

    -- DRIVERS (using correct schema)
    INSERT INTO drivers (company_id, driver_code, name, phone, license_number, salary_type, salary_amount, is_active) VALUES 
    (company_uuid, 'DRV001', 'Ravi Kumar', '+91-9876543301', 'KA02-20230001234', 'monthly', 25000, true),
    (company_uuid, 'DRV002', 'Suresh Gowda', '+91-9876543302', 'KA02-20230001235', 'monthly', 25000, true),
    (company_uuid, 'DRV003', 'Manjunath S', '+91-9876543303', 'KA02-20230001236', 'monthly', 20000, true),
    (company_uuid, 'DRV004', 'Murugan', '+91-9876543311', 'TN09-20230002001', 'monthly', 25000, true),
    (company_uuid, 'DRV005', 'Prakash Patil', '+91-9876543321', 'MH12-20230004001', 'monthly', 22000, true);

END $$;

COMMIT;

-- 🎉 SUCCESS REPORT
SELECT 
    '🏢 K2K LOGISTICS OPERATIONAL SETUP COMPLETE' as "STATUS",
    c.name as "COMPANY NAME",
    c.gstin as "GSTIN",
    c.phone as "CONTACT"
FROM companies c 
WHERE c.name = 'K2K Logistics Pvt Ltd';

-- Branch Network
SELECT 
    '🏪 BRANCH NETWORK' as "INFO",
    b.branch_code as "CODE",
    b.name as "BRANCH NAME",
    b.city as "CITY",
    CASE WHEN b.is_head_office THEN '🏢 HQ' ELSE '🏪 Branch' END as "TYPE"
FROM branches b
JOIN companies c ON b.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd'
ORDER BY b.is_head_office DESC;

-- Rate Matrix
SELECT 
    '💰 GOODS-BASED RATES' as "INFO",
    rm.from_city || ' → ' || rm.to_city as "ROUTE",
    rm.goods_type as "GOODS",
    '₹' || rm.rate_per_kg as "RATE/KG",
    '₹' || rm.min_charge as "MIN"
FROM rate_master rm
JOIN companies c ON rm.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd'
ORDER BY rm.from_city, rm.to_city, rm.rate_per_kg DESC;

-- Fleet & Staff Summary
SELECT 
    '📊 OPERATIONAL SUMMARY' as "INFO",
    (SELECT COUNT(*) FROM vehicles v JOIN companies c ON v.company_id = c.id WHERE c.name = 'K2K Logistics Pvt Ltd') as "VEHICLES",
    (SELECT COUNT(*) FROM drivers d JOIN companies c ON d.company_id = c.id WHERE c.name = 'K2K Logistics Pvt Ltd') as "DRIVERS", 
    (SELECT COUNT(*) FROM customers cu JOIN companies c ON cu.company_id = c.id WHERE c.name = 'K2K Logistics Pvt Ltd') as "CUSTOMERS",
    (SELECT COUNT(*) FROM users u JOIN companies c ON u.company_id = c.id WHERE c.name = 'K2K Logistics Pvt Ltd') as "USERS";

-- Login Information
SELECT 
    '✅ SYSTEM READY' as "STATUS",
    'K2K Logistics is now operational!' as "MESSAGE",
    'Username: admin | Password: (default)' as "LOGIN",
    'Bangalore HQ | Multi-city network' as "COVERAGE";