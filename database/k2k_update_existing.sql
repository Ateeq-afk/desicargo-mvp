-- K2K LOGISTICS - Update existing DesiCargo to K2K Logistics
-- Complete operational setup with Bangalore HQ

BEGIN;

-- Get the existing company ID
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
    WHERE name = 'DesiCargo Logistics Pvt Ltd';

    -- Get the company ID
    SELECT id INTO company_uuid FROM companies WHERE name = 'K2K Logistics Pvt Ltd';

    -- 2. UPDATE EXISTING BRANCHES AND SET BANGALORE AS HQ
    -- Update Mumbai branch
    UPDATE branches SET 
        name = 'K2K Mumbai Branch',
        address = '321, Andheri East, MIDC Area, Mumbai',
        email = 'mumbai@k2klogistics.com',
        is_head_office = false
    WHERE branch_code = 'MUM';

    -- Update Delhi branch
    UPDATE branches SET 
        name = 'K2K Delhi Branch', 
        address = '654, Gurgaon Sector 18, Haryana',
        city = 'Gurgaon',
        state = 'Haryana',
        email = 'delhi@k2klogistics.com',
        is_head_office = false
    WHERE branch_code = 'DEL';

    -- Update Bangalore as HQ
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
    WHERE branch_code = 'BLR';

    -- Add additional branches
    INSERT INTO branches (company_id, branch_code, name, address, city, state, pincode, phone, email, is_head_office, is_active) VALUES 
    (company_uuid, 'CHN', 'K2K Chennai Branch', '123, Mount Road, T Nagar', 'Chennai', 'Tamil Nadu', '600017', '+91-9876543211', 'chennai@k2klogistics.com', false, true),
    (company_uuid, 'HYD', 'K2K Hyderabad Branch', '456, HITEC City, Madhapur', 'Hyderabad', 'Telangana', '500081', '+91-9876543212', 'hyderabad@k2klogistics.com', false, true),
    (company_uuid, 'PUN', 'K2K Pune Branch', '789, Hinjewadi Phase 2', 'Pune', 'Maharashtra', '411057', '+91-9876543216', 'pune@k2klogistics.com', false, true);

    -- Get branch IDs
    SELECT id INTO branch_blr_hq FROM branches WHERE branch_code = 'BLR-HQ';
    SELECT id INTO branch_mumbai FROM branches WHERE branch_code = 'MUM';
    SELECT id INTO branch_delhi FROM branches WHERE branch_code = 'DEL';

    -- 3. CREATE ADMIN USER IF NOT EXISTS
    INSERT INTO users (company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active) 
    VALUES (company_uuid, branch_blr_hq, 'admin', '$2b$10$YourHashedPasswordHere', 'Rajesh Kumar (Admin)', 'admin', '+91-9876543210', 'admin@k2klogistics.com', true)
    ON CONFLICT (username) DO UPDATE SET
        full_name = 'Rajesh Kumar (Admin)',
        email = 'admin@k2klogistics.com',
        branch_id = branch_blr_hq;

    -- Get admin user ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';

    -- 4. ADD BRANCH MANAGERS
    INSERT INTO users (company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active) VALUES 
    (company_uuid, branch_blr_hq, 'blr_manager', '$2b$10$ManagerHashHere', 'Priya Sharma', 'manager', '+91-9876543220', 'priya.sharma@k2klogistics.com', true),
    (company_uuid, branch_blr_hq, 'blr_operator', '$2b$10$OperatorHashHere', 'Sudhir Kumar', 'operator', '+91-9876543221', 'sudhir.kumar@k2klogistics.com', true),
    (company_uuid, branch_mumbai, 'mum_manager', '$2b$10$ManagerHashHere', 'Amit Shah', 'manager', '+91-9876543214', 'amit.shah@k2klogistics.com', true),
    (company_uuid, branch_delhi, 'del_manager', '$2b$10$ManagerHashHere', 'Vikram Singh', 'manager', '+91-9876543215', 'vikram.singh@k2klogistics.com', true)
    ON CONFLICT (username) DO NOTHING;

    -- 5. GOODS MASTER DATA
    INSERT INTO goods_master (company_id, goods_name, goods_code, hsn_code, is_active, created_by) VALUES 
    -- Electronics Category
    (company_uuid, 'Electronics', 'ELEC', '8517', true, admin_user_id),
    (company_uuid, 'Mobile Phones', 'MOB', '8517', true, admin_user_id),
    (company_uuid, 'Laptops & Computers', 'COMP', '8471', true, admin_user_id),
    (company_uuid, 'TV & Home Appliances', 'TV', '8528', true, admin_user_id),
    
    -- Textiles Category
    (company_uuid, 'Readymade Garments', 'GARM', '6203', true, admin_user_id),
    (company_uuid, 'Cotton Fabric', 'FAB', '5208', true, admin_user_id),
    (company_uuid, 'Silk Sarees', 'SAREE', '5007', true, admin_user_id),
    
    -- General Categories
    (company_uuid, 'General Goods', 'GEN', '9999', true, admin_user_id),
    (company_uuid, 'Books & Stationery', 'BOOKS', '4901', true, admin_user_id),
    (company_uuid, 'Medicines', 'MED', '3004', true, admin_user_id),
    (company_uuid, 'Automotive Parts', 'AUTO', '8708', true, admin_user_id),
    (company_uuid, 'Food Items', 'FOOD', '2106', true, admin_user_id)
    ON CONFLICT DO NOTHING;

    -- 6. CUSTOMERS SETUP
    INSERT INTO customers (company_id, name, contact_person, contact_phone, contact_email, city, state, pincode, is_active, created_by) VALUES 
    -- Bangalore Customers
    (company_uuid, 'Tech Solutions India Pvt Ltd', 'Anand Kumar', '+91-9988776655', 'anand@techsolutions.com', 'Bangalore', 'Karnataka', '560100', true, admin_user_id),
    (company_uuid, 'Bangalore Textile House', 'Lakshmi Devi', '+91-9988776656', 'lakshmi@textilehouse.com', 'Bangalore', 'Karnataka', '560001', true, admin_user_id),
    (company_uuid, 'Karnataka Electronics', 'Rajesh Rao', '+91-9988776670', 'rajesh@karnataka-electronics.com', 'Bangalore', 'Karnataka', '560078', true, admin_user_id),
    
    -- Chennai Customers  
    (company_uuid, 'Chennai Electronics Hub', 'Murugan S', '+91-9988776657', 'murugan@electronichub.com', 'Chennai', 'Tamil Nadu', '600017', true, admin_user_id),
    (company_uuid, 'South India Textile Exports', 'Raman Pillai', '+91-9988776658', 'raman@textileexports.com', 'Chennai', 'Tamil Nadu', '600032', true, admin_user_id),
    
    -- Mumbai Customers
    (company_uuid, 'Mumbai Import Traders', 'Kiran Patel', '+91-9988776659', 'kiran@mumbaitraders.com', 'Mumbai', 'Maharashtra', '400093', true, admin_user_id),
    (company_uuid, 'Maharashtra Electronics Ltd', 'Sachin Desai', '+91-9988776671', 'sachin@mh-electronics.com', 'Mumbai', 'Maharashtra', '400001', true, admin_user_id),
    
    -- Delhi Customers
    (company_uuid, 'Delhi Auto Components Ltd', 'Rajesh Aggarwal', '+91-9988776660', 'rajesh@autocomponents.com', 'Gurgaon', 'Haryana', '122015', true, admin_user_id),
    (company_uuid, 'North India Traders', 'Vikash Sharma', '+91-9988776672', 'vikash@northtraders.com', 'Delhi', 'Delhi', '110001', true, admin_user_id)
    ON CONFLICT DO NOTHING;

    -- 7. RATE MASTER - Comprehensive goods-based pricing from Bangalore HQ
    INSERT INTO rate_master (company_id, from_city, to_city, goods_type, rate_per_kg, min_charge, is_active, created_by) VALUES 
    -- ELECTRONICS - Premium rates (High value, careful handling)
    (company_uuid, 'Bangalore', 'Chennai', 'Electronics', 4.50, 150, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'Electronics', 6.50, 200, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'Electronics', 7.25, 250, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Hyderabad', 'Electronics', 4.25, 120, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Pune', 'Electronics', 5.75, 180, true, admin_user_id),
    
    -- TEXTILES - Standard rates (Medium value)
    (company_uuid, 'Bangalore', 'Chennai', 'Readymade Garments', 3.25, 100, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'Readymade Garments', 4.50, 150, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'Readymade Garments', 5.25, 180, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Hyderabad', 'Readymade Garments', 3.00, 80, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Pune', 'Readymade Garments', 4.25, 130, true, admin_user_id),
    
    -- GENERAL GOODS - Economical rates (Low value, bulk)
    (company_uuid, 'Bangalore', 'Chennai', 'General Goods', 2.75, 75, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Mumbai', 'General Goods', 3.75, 120, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Delhi', 'General Goods', 4.25, 150, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Hyderabad', 'General Goods', 2.50, 60, true, admin_user_id),
    (company_uuid, 'Bangalore', 'Pune', 'General Goods', 3.50, 100, true, admin_user_id),

    -- RETURN ROUTES (Usually lower rates for return loads)
    (company_uuid, 'Chennai', 'Bangalore', 'Electronics', 4.25, 140, true, admin_user_id),
    (company_uuid, 'Mumbai', 'Bangalore', 'Electronics', 6.25, 190, true, admin_user_id),
    (company_uuid, 'Delhi', 'Bangalore', 'Electronics', 7.00, 240, true, admin_user_id),
    (company_uuid, 'Chennai', 'Bangalore', 'Readymade Garments', 3.00, 90, true, admin_user_id),
    (company_uuid, 'Mumbai', 'Bangalore', 'Readymade Garments', 4.25, 140, true, admin_user_id),
    (company_uuid, 'Chennai', 'Bangalore', 'General Goods', 2.50, 70, true, admin_user_id),
    (company_uuid, 'Mumbai', 'Bangalore', 'General Goods', 3.50, 110, true, admin_user_id)
    ON CONFLICT DO NOTHING;

    -- 8. VEHICLES FLEET
    INSERT INTO vehicles (company_id, vehicle_number, owner_type, capacity_kg, is_active, created_by) VALUES 
    -- Bangalore Fleet (HQ)
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

    -- 9. DRIVERS
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

-- VERIFICATION AND SUMMARY REPORTS
SELECT 
    '🏢 K2K LOGISTICS SETUP COMPLETE' as status,
    c.name as company_name,
    c.gstin,
    (SELECT COUNT(*) FROM branches WHERE company_id = c.id) as total_branches,
    (SELECT COUNT(*) FROM users WHERE company_id = c.id) as total_users,
    (SELECT COUNT(*) FROM goods_master WHERE company_id = c.id) as goods_categories,
    (SELECT COUNT(*) FROM customers WHERE company_id = c.id) as customers_added,
    (SELECT COUNT(*) FROM rate_master WHERE company_id = c.id) as rate_entries,
    (SELECT COUNT(*) FROM vehicles WHERE company_id = c.id) as fleet_size,
    (SELECT COUNT(*) FROM drivers WHERE company_id = c.id) as total_drivers
FROM companies c 
WHERE c.name = 'K2K Logistics Pvt Ltd';

-- Branch Network Summary
SELECT 
    '🏪 BRANCH NETWORK' as section,
    b.branch_code,
    b.name as branch_name,
    b.city,
    b.state,
    CASE WHEN b.is_head_office THEN '🏢 HEADQUARTERS' ELSE '🏪 Branch' END as type,
    (SELECT COUNT(*) FROM users WHERE branch_id = b.id) as staff_count
FROM branches b
JOIN companies c ON b.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd'
ORDER BY b.is_head_office DESC, b.city;

-- Rate Matrix Overview (Sample)
SELECT 
    '💰 RATE MATRIX SAMPLE' as section,
    rm.from_city || ' → ' || rm.to_city as route,
    rm.goods_type,
    '₹' || rm.rate_per_kg || '/kg' as rate,
    '₹' || rm.min_charge as min_charge
FROM rate_master rm
JOIN companies c ON rm.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd'
  AND rm.from_city = 'Bangalore'
ORDER BY rm.to_city, rm.rate_per_kg DESC
LIMIT 12;

-- Fleet Summary
SELECT 
    '🚛 FLEET OVERVIEW' as section,
    COUNT(*) as total_vehicles,
    SUM(CASE WHEN owner_type = 'owned' THEN 1 ELSE 0 END) as owned_vehicles,
    SUM(CASE WHEN owner_type = 'leased' THEN 1 ELSE 0 END) as leased_vehicles,
    SUM(capacity_kg) as total_capacity_kg,
    ROUND(AVG(capacity_kg), 0) as avg_capacity_per_vehicle
FROM vehicles v
JOIN companies c ON v.company_id = c.id
WHERE c.name = 'K2K Logistics Pvt Ltd';