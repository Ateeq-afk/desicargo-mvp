-- K2K LOGISTICS - Fleet Operations & Sample Data
-- Vehicle fleet, drivers, and sample operational data

BEGIN;

-- 1. DRIVERS MASTER DATA
INSERT INTO drivers (id, company_id, branch_id, name, license_number, license_type, contact_phone, address, city, state, is_active, created_by, created_at, updated_at) VALUES 
-- Bangalore HQ Drivers
('driver-blr-001', 'k2k-logistics-001', 'branch-blr-hq', 'Ravi Kumar', 'KA02-20230001234', 'HMV', '+91-9876543301', 'Whitefield, Bangalore', 'Bangalore', 'Karnataka', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('driver-blr-002', 'k2k-logistics-001', 'branch-blr-hq', 'Suresh Gowda', 'KA02-20230001235', 'HMV', '+91-9876543302', 'Electronic City, Bangalore', 'Bangalore', 'Karnataka', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('driver-blr-003', 'k2k-logistics-001', 'branch-blr-hq', 'Manjunath', 'KA02-20230001236', 'LMV', '+91-9876543303', 'Koramangala, Bangalore', 'Bangalore', 'Karnataka', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('driver-blr-004', 'k2k-logistics-001', 'branch-blr-hq', 'Krishna Murthy', 'KA02-20230001237', 'HMV', '+91-9876543304', 'Hebbal, Bangalore', 'Bangalore', 'Karnataka', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Chennai Branch Drivers
('driver-chn-001', 'k2k-logistics-001', 'branch-chennai', 'Murugan', 'TN09-20230002001', 'HMV', '+91-9876543311', 'T Nagar, Chennai', 'Chennai', 'Tamil Nadu', true, 'user-chn-mgr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('driver-chn-002', 'k2k-logistics-001', 'branch-chennai', 'Karthik', 'TN09-20230002002', 'HMV', '+91-9876543312', 'Guindy, Chennai', 'Chennai', 'Tamil Nadu', true, 'user-chn-mgr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Hyderabad Branch Drivers
('driver-hyd-001', 'k2k-logistics-001', 'branch-hyderabad', 'Ravi Teja', 'TS08-20230003001', 'HMV', '+91-9876543321', 'HITEC City, Hyderabad', 'Hyderabad', 'Telangana', true, 'user-hyd-mgr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. VEHICLE FLEET DATA
INSERT INTO vehicles (id, company_id, branch_id, vehicle_number, vehicle_type_id, make_model, year_of_manufacture, owner_type, driver_id, fuel_type, mileage_kmpl, insurance_expiry, fitness_expiry, permit_expiry, is_active, created_by, created_at, updated_at) VALUES 
-- Bangalore Fleet
('vehicle-blr-001', 'k2k-logistics-001', 'branch-blr-hq', 'KA02-AB-1234', 'vtype-large-truck', 'Tata 1615 TC', 2022, 'owned', 'driver-blr-001', 'diesel', 6.5, '2024-12-31', '2024-10-15', '2024-09-30', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vehicle-blr-002', 'k2k-logistics-001', 'branch-blr-hq', 'KA02-CD-5678', 'vtype-medium-truck', 'Eicher Pro 1095', 2021, 'owned', 'driver-blr-002', 'diesel', 8.2, '2024-11-30', '2024-09-25', '2024-08-20', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vehicle-blr-003', 'k2k-logistics-001', 'branch-blr-hq', 'KA02-EF-9012', 'vtype-small-truck', 'Mahindra Bolero Pickup', 2023, 'owned', 'driver-blr-003', 'diesel', 12.5, '2025-06-15', '2025-03-10', '2025-01-25', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vehicle-blr-004', 'k2k-logistics-001', 'branch-blr-hq', 'KA02-GH-3456', 'vtype-container', 'Ashok Leyland 2518', 2020, 'leased', 'driver-blr-004', 'diesel', 5.8, '2024-08-30', '2024-07-20', '2024-06-15', true, 'user-admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Chennai Fleet
('vehicle-chn-001', 'k2k-logistics-001', 'branch-chennai', 'TN09-XY-7890', 'vtype-large-truck', 'Tata LPT 1615', 2022, 'owned', 'driver-chn-001', 'diesel', 6.8, '2024-10-31', '2024-08-15', '2024-07-10', true, 'user-chn-mgr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('vehicle-chn-002', 'k2k-logistics-001', 'branch-chennai', 'TN09-MN-1122', 'vtype-medium-truck', 'Eicher Pro 1110', 2021, 'owned', 'driver-chn-002', 'diesel', 7.9, '2024-09-28', '2024-08-05', '2024-06-30', true, 'user-chn-mgr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Hyderabad Fleet
('vehicle-hyd-001', 'k2k-logistics-001', 'branch-hyderabad', 'TS08-PQ-4455', 'vtype-large-truck', 'Tata Prima 1615', 2023, 'owned', 'driver-hyd-001', 'diesel', 6.9, '2025-04-30', '2025-02-15', '2025-01-10', true, 'user-hyd-mgr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. SAMPLE CONSIGNMENTS (Recent transactions for realistic data)
INSERT INTO consignments (id, company_id, branch_id, cn_number, booking_date, consignor_name, consignor_phone, consignor_address, consignor_city, consignee_name, consignee_phone, consignee_address, consignee_city, goods_description, packages, actual_weight, freight_charges, other_charges, total_amount, payment_mode, customer_id, is_paid, status, created_by, created_at, updated_at) VALUES 

-- Recent Bangalore bookings
('cn-k2k-240701001', 'k2k-logistics-001', 'branch-blr-hq', 'K2K240701001', '2024-07-01', 'Tech Solutions Pvt Ltd', '+91-9988776655', 'Electronic City Phase 2', 'Bangalore', 'Chennai Electronics Hub', '+91-9988776657', 'T Nagar', 'Chennai', 'Mobile Phones', 5, 125.5, 565.0, 45.0, 610.0, 'paid', 'cust-tech-solutions', true, 'in_transit', 'user-blr-op1', '2024-07-01 10:30:00', '2024-07-01 10:30:00'),

('cn-k2k-240702002', 'k2k-logistics-001', 'branch-blr-hq', 'K2K240702002', '2024-07-02', 'Bangalore Textile House', '+91-9988776656', 'Commercial Street', 'Bangalore', 'South India Textile Exports', '+91-9988776658', 'Guindy Industrial Estate', 'Chennai', 'Readymade Garments', 12, 86.3, 237.0, 25.0, 262.0, 'to_pay', 'cust-textile-house', false, 'delivered', 'user-blr-op1', '2024-07-02 14:15:00', '2024-07-02 14:15:00'),

('cn-k2k-240703003', 'k2k-logistics-001', 'branch-blr-hq', 'K2K240703003', '2024-07-03', 'ABC Electronics Pvt Ltd', '+91-9988776661', 'Koramangala', 'Bangalore', 'Mumbai Import Traders', '+91-9988776659', 'Andheri East', 'Mumbai', 'Laptops & Computers', 8, 245.8, 1597.0, 120.0, 1717.0, 'paid', NULL, true, 'booked', 'user-blr-op1', '2024-07-03 09:45:00', '2024-07-03 09:45:00'),

('cn-k2k-240704004', 'k2k-logistics-001', 'branch-blr-hq', 'K2K240704004', '2024-07-04', 'Karnataka Handlooms', '+91-9988776662', 'Chickpet', 'Bangalore', 'Delhi Fashion House', '+91-9988776663', 'Karol Bagh', 'Delhi', 'Silk Sarees', 25, 156.7, 823.0, 65.0, 888.0, 'tbb', NULL, false, 'in_transit', 'user-blr-op1', '2024-07-04 16:20:00', '2024-07-04 16:20:00'),

-- Chennai bookings
('cn-k2k-240705005', 'k2k-logistics-001', 'branch-chennai', 'K2K240705005', '2024-07-05', 'Chennai Auto Parts', '+91-9988776664', 'Ambattur Industrial Estate', 'Chennai', 'K2K Bangalore HQ', '+91-9876543210', 'Whitefield', 'Bangalore', 'Automotive Parts', 18, 342.5, 1370.0, 85.0, 1455.0, 'paid', NULL, true, 'delivered', 'user-chn-mgr', '2024-07-05 11:10:00', '2024-07-05 11:10:00');

-- 4. SAMPLE EXPENSES (Operational costs)
INSERT INTO expenses (id, company_id, branch_id, expense_date, category_id, amount, description, vehicle_id, driver_id, payment_mode, bill_number, created_by, created_at, updated_at) VALUES 

-- Vehicle operational expenses
('exp-fuel-001', 'k2k-logistics-001', 'branch-blr-hq', '2024-07-01', 'exp-fuel', 8500.00, 'Diesel fill for Bangalore-Chennai trip', 'vehicle-blr-001', 'driver-blr-001', 'cash', 'FUEL001', 'user-blr-mgr', '2024-07-01 08:30:00', '2024-07-01 08:30:00'),
('exp-toll-001', 'k2k-logistics-001', 'branch-blr-hq', '2024-07-01', 'exp-toll', 1250.00, 'Highway tolls Bangalore to Chennai', 'vehicle-blr-001', 'driver-blr-001', 'online', 'TOLL001', 'user-blr-mgr', '2024-07-01 09:15:00', '2024-07-01 09:15:00'),
('exp-driver-001', 'k2k-logistics-001', 'branch-blr-hq', '2024-07-01', 'exp-driver-salary', 2500.00, 'Driver daily allowance', 'vehicle-blr-001', 'driver-blr-001', 'cash', 'DA001', 'user-blr-mgr', '2024-07-01 18:00:00', '2024-07-01 18:00:00'),

-- Office expenses
('exp-rent-001', 'k2k-logistics-001', 'branch-blr-hq', '2024-07-01', 'exp-office-rent', 45000.00, 'July office rent - Bangalore HQ', NULL, NULL, 'online', 'RENT001', 'user-blr-mgr', '2024-07-01 10:00:00', '2024-07-01 10:00:00'),
('exp-salary-001', 'k2k-logistics-001', 'branch-blr-hq', '2024-07-01', 'exp-staff-salary', 125000.00, 'July staff salaries - Bangalore', NULL, NULL, 'online', 'SAL001', 'user-blr-mgr', '2024-07-01 10:30:00', '2024-07-01 10:30:00'),

-- Branch expenses
('exp-fuel-002', 'k2k-logistics-001', 'branch-chennai', '2024-07-02', 'exp-fuel', 6200.00, 'Diesel fill for local delivery', 'vehicle-chn-001', 'driver-chn-001', 'cash', 'FUEL002', 'user-chn-mgr', '2024-07-02 07:45:00', '2024-07-02 07:45:00');

-- 5. SAMPLE OGPL (Loading Lists)
INSERT INTO ogpl (id, company_id, branch_id, ogpl_number, ogpl_date, from_city, to_city, vehicle_id, driver_id, total_consignments, total_weight, estimated_revenue, status, created_by, created_at, updated_at) VALUES 

('ogpl-001', 'k2k-logistics-001', 'branch-blr-hq', 'OGPL-BLR-001', '2024-07-01', 'Bangalore', 'Chennai', 'vehicle-blr-001', 'driver-blr-001', 2, 211.8, 872.0, 'completed', 'user-blr-mgr', '2024-07-01 06:00:00', '2024-07-01 06:00:00'),
('ogpl-002', 'k2k-logistics-001', 'branch-blr-hq', 'OGPL-BLR-002', '2024-07-03', 'Bangalore', 'Mumbai', 'vehicle-blr-002', 'driver-blr-002', 1, 245.8, 1717.0, 'in_transit', 'user-blr-mgr', '2024-07-03 05:30:00', '2024-07-03 05:30:00');

-- Link consignments to OGPL
UPDATE consignments SET ogpl_id = 'ogpl-001' WHERE id IN ('cn-k2k-240701001', 'cn-k2k-240702002');
UPDATE consignments SET ogpl_id = 'ogpl-002' WHERE id = 'cn-k2k-240703003';

-- 6. DELIVERY RUNS
INSERT INTO delivery_runs (id, company_id, branch_id, run_number, run_date, vehicle_id, driver_id, delivery_area, total_consignments, status, created_by, created_at, updated_at) VALUES 

('del-run-001', 'k2k-logistics-001', 'branch-chennai', 'DEL-CHN-001', '2024-07-02', 'vehicle-chn-002', 'driver-chn-002', 'T Nagar - Guindy Area', 2, 'completed', 'user-chn-mgr', '2024-07-02 08:00:00', '2024-07-02 08:00:00');

-- 7. INVOICES (Sample billing)
INSERT INTO invoices (id, company_id, branch_id, invoice_number, invoice_date, customer_id, billing_period_from, billing_period_to, total_consignments, total_freight, other_charges, tax_amount, total_amount, due_date, payment_status, created_by, created_at, updated_at) VALUES 

('inv-001', 'k2k-logistics-001', 'branch-blr-hq', 'K2K-INV-001', '2024-07-05', 'cust-tech-solutions', '2024-07-01', '2024-07-05', 1, 565.0, 45.0, 109.8, 719.8, '2024-07-20', 'paid', 'user-blr-mgr', '2024-07-05 15:30:00', '2024-07-05 15:30:00'),
('inv-002', 'k2k-logistics-001', 'branch-blr-hq', 'K2K-INV-002', '2024-07-05', 'cust-textile-house', '2024-07-01', '2024-07-05', 1, 237.0, 25.0, 47.16, 309.16, '2024-07-20', 'pending', 'user-blr-mgr', '2024-07-05 16:00:00', '2024-07-05 16:00:00');

COMMIT;

-- Real-time Summary Report
SELECT 
    'K2K LOGISTICS OPERATIONS DATA LOADED' as status,
    (SELECT COUNT(*) FROM drivers WHERE company_id = 'k2k-logistics-001') as total_drivers,
    (SELECT COUNT(*) FROM vehicles WHERE company_id = 'k2k-logistics-001') as total_vehicles,
    (SELECT COUNT(*) FROM consignments WHERE company_id = 'k2k-logistics-001') as total_consignments,
    (SELECT COUNT(*) FROM ogpl WHERE company_id = 'k2k-logistics-001') as total_ogpl,
    (SELECT SUM(total_amount) FROM consignments WHERE company_id = 'k2k-logistics-001') as total_revenue,
    (SELECT SUM(amount) FROM expenses WHERE company_id = 'k2k-logistics-001') as total_expenses;

-- Show current operational status
SELECT 
    'CURRENT OPERATIONS STATUS' as report_type,
    COUNT(CASE WHEN status = 'booked' THEN 1 END) as pending_dispatch,
    COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_today,
    SUM(CASE WHEN payment_mode = 'paid' THEN total_amount ELSE 0 END) as paid_freight,
    SUM(CASE WHEN payment_mode = 'to_pay' THEN total_amount ELSE 0 END) as to_pay_amount
FROM consignments 
WHERE company_id = 'k2k-logistics-001' 
AND created_at >= '2024-07-01';