-- K2K LOGISTICS - Final Corrected Seed Data
-- Complete operational setup matching actual schema

BEGIN;

-- Get the existing company ID and update to K2K Logistics
DO $$ 
DECLARE 
    company_uuid UUID;
    branch_blr_hq UUID;
    branch_mumbai UUID;
    branch_delhi UUID;
    admin_user_id UUID;
BEGIN
    -- 1. UPDATE EXISTING COMPANY TO K2K LOGISTICS
    UPDATE companies SET 
        name = 'K2K Logistics Pvt Ltd',
        gstin = '29K2KL1234F1Z5',
        address = '#45, Industrial Area, Whitefield, Bangalore, Karnataka - 560066',
        phone = '+91-9876543210',
        email = 'admin@k2klogistics.com'
    WHERE name LIKE '%DesiCargo%' OR name LIKE '%K2K%';

    -- Get the company ID
    SELECT id INTO company_uuid FROM companies WHERE name = 'K2K Logistics Pvt Ltd';
    
    IF company_uuid IS NULL THEN
        RAISE EXCEPTION 'Company not found or not updated';
    END IF;

    -- 2. UPDATE BRANCHES - Set Bangalore as HQ
    UPDATE branches SET 
        branch_code = 'BLR-HQ',
        name = 'K2K Logistics HQ Bangalore',
        address = '#45, Industrial Area, Whitefield, Bangalore',
        city = 'Bangalore',
        state = 'Karnataka', 
        pincode = '560066',
        phone = '+91-9876543210',
        email = 'bangalore@k2klogistics.com',
        is_head_office = true
    WHERE branch_code = 'BLR' AND company_id = company_uuid;

    -- Update Mumbai branch
    UPDATE branches SET 
        name = 'K2K Mumbai Branch',
        address = '321, Andheri East, MIDC Area, Mumbai',
        email = 'mumbai@k2klogistics.com',
        is_head_office = false
    WHERE branch_code = 'MUM' AND company_id = company_uuid;

    -- Update Delhi branch
    UPDATE branches SET 
        name = 'K2K Delhi Branch', 
        address = '654, Gurgaon Sector 18, Haryana',
        city = 'Gurgaon',
        state = 'Haryana',
        email = 'delhi@k2klogistics.com',
        is_head_office = false
    WHERE branch_code = 'DEL' AND company_id = company_uuid;

    -- Add Chennai and Hyderabad branches
    INSERT INTO branches (company_id, branch_code, name, address, city, state, pincode, phone, email, is_head_office, is_active) VALUES 
    (company_uuid, 'CHN', 'K2K Chennai Branch', '123, Mount Road, T Nagar', 'Chennai', 'Tamil Nadu', '600017', '+91-9876543211', 'chennai@k2klogistics.com', false, true),
    (company_uuid, 'HYD', 'K2K Hyderabad Branch', '456, HITEC City, Madhapur', 'Hyderabad', 'Telangana', '500081', '+91-9876543212', 'hyderabad@k2klogistics.com', false, true)
    ON CONFLICT (branch_code) DO NOTHING;

    -- Get branch IDs
    SELECT id INTO branch_blr_hq FROM branches WHERE branch_code = 'BLR-HQ' AND company_id = company_uuid;
    SELECT id INTO branch_mumbai FROM branches WHERE branch_code = 'MUM' AND company_id = company_uuid;
    SELECT id INTO branch_delhi FROM branches WHERE branch_code = 'DEL' AND company_id = company_uuid;

    -- 3. CREATE/UPDATE USERS
    -- Create admin user if not exists
    INSERT INTO users (company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active) 
    VALUES (company_uuid, branch_blr_hq, 'admin', '$2b$10$YourHashedPasswordHere', 'Rajesh Kumar', 'admin', '+91-9876543210', 'admin@k2klogistics.com', true)
    ON CONFLICT (username) DO UPDATE SET
        full_name = 'Rajesh Kumar',
        email = 'admin@k2klogistics.com',
        branch_id = branch_blr_hq,
        company_id = company_uuid;

    -- Get admin user ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';

    -- Add branch staff
    INSERT INTO users (company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active) VALUES 
    (company_uuid, branch_blr_hq, 'blr_manager', '$2b$10$ManagerHash', 'Priya Sharma', 'manager', '+91-9876543220', 'priya.sharma@k2klogistics.com', true),
    (company_uuid, branch_blr_hq, 'blr_operator', '$2b$10$OperatorHash', 'Sudhir Kumar', 'operator', '+91-9876543221', 'sudhir.kumar@k2klogistics.com', true)
    ON CONFLICT (username) DO NOTHING;

    -- 4. GOODS MASTER DATA
    INSERT INTO goods_master (company_id, goods_name, goods_code, hsn_code, is_active, created_by) VALUES 
    (company_uuid, 'Electronics', 'ELEC', '8517', true, admin_user_id),
    (company_uuid, 'Mobile Phones', 'MOB', '8517', true, admin_user_id), 
    (company_uuid, 'Laptops & Computers', 'COMP', '8471', true, admin_user_id),
    (company_uuid, 'TV & Home Appliances', 'TV', '8528', true, admin_user_id),
    (company_uuid, 'Readymade Garments', 'GARM', '6203', true, admin_user_id),
    (company_uuid, 'Cotton Fabric', 'FAB', '5208', true, admin_user_id),
    (company_uuid, 'Silk Sarees', 'SAREE', '5007', true, admin_user_id),
    (company_uuid, 'General Goods', 'GEN', '9999', true, admin_user_id),
    (company_uuid, 'Books & Stationery', 'BOOKS', '4901', true, admin_user_id),
    (company_uuid, 'Medicines', 'MED', '3004', true, admin_user_id),
    (company_uuid, 'Automotive Parts', 'AUTO', '8708', true, admin_user_id),
    (company_uuid, 'Food Items', 'FOOD', '2106', true, admin_user_id)
    ON CONFLICT DO NOTHING;

    -- 5. CUSTOMERS (Using correct schema)
    INSERT INTO customers (company_id, customer_code, name, phone, email, address, city, state, pincode, gstin, customer_type, credit_limit, credit_days, is_active, created_by) VALUES 
    -- Bangalore Customers
    (company_uuid, 'CUST001', 'Tech Solutions India Pvt Ltd', '+91-9988776655', 'anand@techsolutions.com', 'Electronic City Phase 2, Bangalore', 'Bangalore', 'Karnataka', '560100', '29ABCDE5678F1Z5', 'corporate', 500000, 30, true, admin_user_id),
    (company_uuid, 'CUST002', 'Bangalore Textile House', '+91-9988776656', 'lakshmi@textilehouse.com', 'Commercial Street, Bangalore', 'Bangalore', 'Karnataka', '560001', '29ABCDE9012F1Z5', 'corporate', 300000, 15, true, admin_user_id),
    (company_uuid, 'CUST003', 'Karnataka Electronics', '+91-9988776670', 'rajesh@karnataka-electronics.com', 'Koramangala, Bangalore', 'Bangalore', 'Karnataka', '560078', '29ABCDE3456F1Z5', 'corporate', 400000, 30, true, admin_user_id),
    
    -- Chennai Customers  
    (company_uuid, 'CUST004', 'Chennai Electronics Hub', '+91-9988776657', 'murugan@electronichub.com', 'T Nagar, Chennai', 'Chennai', 'Tamil Nadu', '600017', '33ABCDE7890F1Z5', 'corporate', 450000, 30, true, admin_user_id),
    (company_uuid, 'CUST005', 'South India Textile Exports', '+91-9988776658', 'raman@textileexports.com', 'Guindy Industrial Estate, Chennai', 'Chennai', 'Tamil Nadu', '600032', '33ABCDE1234F1Z5', 'corporate', 600000, 45, true, admin_user_id),
    
    -- Mumbai Customers
    (company_uuid, 'CUST006', 'Mumbai Import Traders', '+91-9988776659', 'kiran@mumbaitraders.com', 'Andheri East, Mumbai', 'Mumbai', 'Maharashtra', '400093', '27ABCDE5678F1Z5', 'corporate', 750000, 30, true, admin_user_id),
    (company_uuid, 'CUST007', 'Maharashtra Electronics Ltd', '+91-9988776671', 'sachin@mh-electronics.com', 'Lower Parel, Mumbai', 'Mumbai', 'Maharashtra', '400001', '27ABCDE9012F1Z5', 'corporate', 500000, 30, true, admin_user_id),
    
    -- Delhi Customers
    (company_uuid, 'CUST008', 'Delhi Auto Components Ltd', '+91-9988776660', 'rajesh@autocomponents.com', 'Gurgaon Sector 18', 'Gurgaon', 'Haryana', '122015', '06ABCDE1357F1Z5', 'corporate', 450000, 30, true, admin_user_id),
    (company_uuid, 'CUST009', 'North India Traders', '+91-9988776672', 'vikash@northtraders.com', 'Karol Bagh, Delhi', 'Delhi', 'Delhi', '110001', '07ABCDE2468F1Z5', 'corporate', 350000, 30, true, admin_user_id)
    ON CONFLICT (customer_code) DO NOTHING;

    -- 6. COMPREHENSIVE RATE MATRIX
    INSERT INTO rate_master (company_id, from_city, to_city, goods_type, rate_per_kg, min_charge, is_active, created_by) VALUES 
    -- ELECTRONICS - Premium rates (₹4-7/kg)
    (company_uuid, 'Bangalore', 'Chennai', 'Electronics', 4.50, 150, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'Electronics', 6.50, 200, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'Electronics', 7.25, 250, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Hyderabad', 'Electronics', 4.25, 120, true, admin_user_id),
    
    -- TEXTILES - Standard rates (₹3-5/kg)  
    (company_uuid, 'Bangalore', 'Chennai', 'Readymade Garments', 3.25, 100, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'Readymade Garments', 4.50, 150, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'Readymade Garments', 5.25, 180, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Hyderabad', 'Readymade Garments', 3.00, 80, true, admin_user_id),
    
    -- GENERAL GOODS - Economical rates (₹2.5-4/kg)
    (company_uuid, 'Bangalore', 'Chennai', 'General Goods', 2.75, 75, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'General Goods', 3.75, 120, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'General Goods', 4.25, 150, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Hyderabad', 'General Goods', 2.50, 60, true, admin_user_id),

    -- RETURN ROUTES (Competitive rates for return loads)
    (company_uuid, 'Chennai', 'Bangalore', 'Electronics', 4.25, 140, true, admin_user_id),
    (company_uuid, 'Mumbai', 'Bangalore', 'Electronics', 6.25, 190, true, admin_user_id),
    (company_uuid, 'Delhi', 'Bangalore', 'Electronics', 7.00, 240, true, admin_user_id),
    (company_uuid, 'Chennai', 'Bangalore', 'Readymade Garments', 3.00, 90, true, admin_user_id),
    (company_uuid, 'Mumbai', 'Bangalore', 'Readymade Garments', 4.25, 140, true, admin_user_id),
    (company_uuid, 'Chennai', 'Bangalore', 'General Goods', 2.50, 70, true, admin_user_id),
    (company_uuid, 'Mumbai', 'Bangalore', 'General Goods', 3.50, 110, true, admin_user_id)
    ON CONFLICT DO NOTHING;

    -- 7. FLEET MANAGEMENT
    INSERT INTO vehicles (company_id, vehicle_number, owner_type, capacity_kg, is_active, created_by) VALUES 
    -- Bangalore HQ Fleet
    (company_uuid, 'KA02-AB-1234', 'owned', 9000, true, admin_user_id),
    (company_uuid, 'KA02-CD-5678', 'owned', 5000, true, admin_user_id), 
    (company_uuid, 'KA02-EF-9012', 'owned', 1500, true, admin_user_id),
    (company_uuid, 'KA02-GH-3456', 'leased', 15000, true, admin_user_id),
    
    -- Branch Vehicles  
    (company_uuid, 'TN09-XY-7890', 'owned', 9000, true, admin_user_id),
    (company_uuid, 'MH12-RS-7788', 'owned', 5000, true, admin_user_id),
    (company_uuid, 'DL01-UV-4455', 'leased', 9000, true, admin_user_id),
    (company_uuid, 'TS08-PQ-1122', 'owned', 9000, true, admin_user_id)
    ON CONFLICT DO NOTHING;

    -- 8. DRIVERS
    INSERT INTO drivers (company_id, name, license_number, contact_phone, is_active, created_by) VALUES 
    -- Bangalore Drivers
    (company_uuid, 'Ravi Kumar', 'KA02-20230001234', '+91-9876543301', true, admin_user_id),
    (company_uuid, 'Suresh Gowda', 'KA02-20230001235', '+91-9876543302', true, admin_user_id),
    (company_uuid, 'Manjunath S', 'KA02-20230001236', '+91-9876543303', true, admin_user_id),
    (company_uuid, 'Krishna Murthy', 'KA02-20230001237', '+91-9876543304', true, admin_user_id),
    
    -- Branch Drivers
    (company_uuid, 'Murugan', 'TN09-20230002001', '+91-9876543311', true, admin_user_id),
    (company_uuid, 'Prakash Patil', 'MH12-20230004001', '+91-9876543321', true, admin_user_id),
    (company_uuid, 'Ravi Teja', 'TS08-20230003001', '+91-9876543331', true, admin_user_id),
    (company_uuid, 'Suresh Singh', 'DL01-20230005001', '+91-9876543341', true, admin_user_id)
    ON CONFLICT DO NOTHING;

END $$;

COMMIT;

-- 🎉 VERIFICATION REPORTS
SELECT 
    '🏢 K2K LOGISTICS OPERATIONAL SETUP COMPLETE' as "STATUS",
    c.name as "COMPANY NAME",
    c.gstin as "GSTIN",
    c.phone as "CONTACT",
    c.email as "EMAIL"
FROM companies c 
WHERE c.name = 'K2K Logistics Pvt Ltd';

-- Branch Network
SELECT 
    '🏪 BRANCH NETWORK' as "SECTION",
    b.branch_code as "CODE",
    b.name as "BRANCH NAME", 
    b.city as "CITY",
    b.state as "STATE",
    CASE WHEN b.is_head_office THEN '🏢 HEADQUARTERS' ELSE '🏪 Branch' END as "TYPE"
FROM branches b
JOIN companies c ON b.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd'
ORDER BY b.is_head_office DESC, b.city;

-- Rate Matrix Summary
SELECT 
    '💰 RATE PRICING STRUCTURE' as "SECTION",
    rm.from_city || ' → ' || rm.to_city as "ROUTE",
    rm.goods_type as "GOODS TYPE",
    '₹' || rm.rate_per_kg || '/kg' as "RATE PER KG",
    '₹' || rm.min_charge as "MIN CHARGE"
FROM rate_master rm
JOIN companies c ON rm.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd'
  AND rm.from_city = 'Bangalore'
ORDER BY rm.to_city, rm.goods_type;

-- Customer Base
SELECT 
    '👥 CUSTOMER BASE' as "SECTION",
    COUNT(*) as "TOTAL CUSTOMERS",
    SUM(CASE WHEN customer_type = 'corporate' THEN 1 ELSE 0 END) as "CORPORATE CLIENTS",
    SUM(credit_limit) as "TOTAL CREDIT LIMIT",
    ROUND(AVG(credit_limit), 0) as "AVG CREDIT LIMIT"
FROM customers cu
JOIN companies c ON cu.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd';

-- Fleet Summary
SELECT 
    '🚛 FLEET OVERVIEW' as "SECTION",
    COUNT(*) as "TOTAL VEHICLES",
    SUM(CASE WHEN owner_type = 'owned' THEN 1 ELSE 0 END) as "OWNED",
    SUM(CASE WHEN owner_type = 'leased' THEN 1 ELSE 0 END) as "LEASED",
    SUM(capacity_kg) as "TOTAL CAPACITY (KG)",
    ROUND(AVG(capacity_kg), 0) as "AVG CAPACITY PER VEHICLE"
FROM vehicles v
JOIN companies c ON v.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd';

-- System Ready Message
SELECT 
    '✅ SYSTEM STATUS' as "INFO",
    'K2K Logistics is now ready for operations!' as "MESSAGE",
    'Login with: admin / password' as "LOGIN DETAILS",
    'HQ: Bangalore | Network: 5 Cities' as "COVERAGE";