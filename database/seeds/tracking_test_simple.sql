-- Simple Tracking Test Data
-- Creates minimal test data for tracking system

DO $$
DECLARE
    test_company_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    test_user_id uuid;
    test_consignment_id uuid;
    test_branch_id uuid;
BEGIN
    -- Get first user
    SELECT id INTO test_user_id FROM users LIMIT 1;
    IF test_user_id IS NULL THEN
        test_user_id := gen_random_uuid();
    END IF;
    
    -- Get first branch
    SELECT id INTO test_branch_id FROM branches WHERE company_id = test_company_id LIMIT 1;
    
    -- Delete existing TEST001 if exists
    DELETE FROM tracking_events WHERE consignment_id IN (SELECT id FROM consignments WHERE cn_number = 'TEST001');
    DELETE FROM consignments WHERE cn_number = 'TEST001';
    
    -- Create test consignment
    INSERT INTO consignments (
        id, company_id, cn_number, booking_date,
        consignor_name, consignor_phone, consignor_address,
        consignee_name, consignee_phone, consignee_address,
        goods_description, no_of_packages, actual_weight,
        freight_amount, total_amount, status, payment_type,
        from_branch_id, to_branch_id
    ) VALUES (
        gen_random_uuid(), test_company_id, 'TEST001', CURRENT_DATE,
        'Test Sender', '9876543210', 'Test Address, Delhi',
        'Test Receiver', '9876543211', 'Test Address, Mumbai',
        'Sample Electronics', 1, 5.0,
        500.00, 590.00, 'OUT_SCAN', 'topay',
        test_branch_id, test_branch_id
    ) RETURNING id INTO test_consignment_id;
    
    -- Create tracking events
    INSERT INTO tracking_events (consignment_id, event_type, location_name, city, state, description, created_by, created_by_type, event_timestamp)
    VALUES 
        (test_consignment_id, 'BOOKED', 'Delhi Branch', 'Delhi', 'Delhi', 'Consignment booked successfully', test_user_id, 'user', CURRENT_TIMESTAMP - INTERVAL '2 days'),
        (test_consignment_id, 'PICKED_UP', 'Customer Location', 'Delhi', 'Delhi', 'Picked up from customer', test_user_id, 'user', CURRENT_TIMESTAMP - INTERVAL '1 day 18 hours'),
        (test_consignment_id, 'IN_SCAN', 'Delhi Hub', 'Delhi', 'Delhi', 'Received at Delhi hub', test_user_id, 'user', CURRENT_TIMESTAMP - INTERVAL '1 day 12 hours'),
        (test_consignment_id, 'IN_TRANSIT', 'On Route', 'Gurgaon', 'Haryana', 'In transit to Mumbai', test_user_id, 'system', CURRENT_TIMESTAMP - INTERVAL '1 day'),
        (test_consignment_id, 'REACHED_DESTINATION', 'Mumbai Hub', 'Mumbai', 'Maharashtra', 'Reached Mumbai hub', test_user_id, 'system', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
        (test_consignment_id, 'OUT_SCAN', 'Mumbai Hub', 'Mumbai', 'Maharashtra', 'Out for delivery', test_user_id, 'user', CURRENT_TIMESTAMP - INTERVAL '2 hours');
    
    RAISE NOTICE '✅ Test consignment TEST001 created successfully!';
    RAISE NOTICE '📦 Consignment ID: %', test_consignment_id;
    RAISE NOTICE '🛣️ Created 6 tracking events';
    
END $$;