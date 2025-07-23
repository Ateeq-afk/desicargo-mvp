-- Tracking System Test Data
-- This creates sample tracking events for testing the enhanced tracking system

DO $$
DECLARE
    k2k_company_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    k2k_tenant_id uuid := '45c4a180-3242-4020-92b3-b2588e930b4c';
    admin_user_id uuid;
    test_consignment_id uuid;
    test_cn_number varchar := 'TEST001';
    
BEGIN
    -- Get admin user
    SELECT id INTO admin_user_id FROM users LIMIT 1;
    IF admin_user_id IS NULL THEN
        admin_user_id := gen_random_uuid();
    END IF;
    
    -- Create a test consignment if it doesn't exist
    SELECT id INTO test_consignment_id 
    FROM consignments 
    WHERE cn_number = test_cn_number AND company_id = k2k_company_id;
    
    IF test_consignment_id IS NULL THEN
        INSERT INTO consignments (
            id, company_id, tenant_id, cn_number, booking_date,
            consignor_name, consignor_phone, consignor_city,
            consignee_name, consignee_phone, consignee_city,
            goods_description, packages, actual_weight,
            freight_charges, total_amount, payment_mode,
            status, created_by
        ) VALUES (
            gen_random_uuid(), k2k_company_id, k2k_tenant_id, test_cn_number, CURRENT_DATE,
            'Test Sender', '9876543210', 'Delhi',
            'Test Receiver', '9876543211', 'Mumbai',
            'Test Goods', 1, 5.0,
            500.00, 590.00, 'paid',
            'BOOKED', admin_user_id
        ) RETURNING id INTO test_consignment_id;
    END IF;
    
    RAISE NOTICE 'Using consignment ID: %', test_consignment_id;
    
    -- Create tracking events for the journey
    
    -- 1. Consignment Booked
    INSERT INTO tracking_events (
        consignment_id, event_type, location_name, city, state,
        description, created_by, created_by_type,
        event_timestamp
    ) VALUES (
        test_consignment_id, 'BOOKED', 'Delhi Branch', 'Delhi', 'Delhi',
        'Consignment has been booked successfully', admin_user_id, 'user',
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    );
    
    -- 2. Pickup Scheduled
    INSERT INTO tracking_events (
        consignment_id, event_type, location_name, city, state,
        description, created_by, created_by_type,
        event_timestamp
    ) VALUES (
        test_consignment_id, 'PICKUP_SCHEDULED', 'Customer Location', 'Delhi', 'Delhi',
        'Pickup has been scheduled for tomorrow', admin_user_id, 'system',
        CURRENT_TIMESTAMP - INTERVAL '1 day 18 hours'
    );
    
    -- 3. Picked Up
    INSERT INTO tracking_events (
        consignment_id, event_type, location_name, city, state,
        latitude, longitude, description, created_by, created_by_type,
        event_timestamp
    ) VALUES (
        test_consignment_id, 'PICKED_UP', 'Customer Office', 'Delhi', 'Delhi',
        28.6139, 77.2090, 'Consignment picked up successfully', admin_user_id, 'mobile',
        CURRENT_TIMESTAMP - INTERVAL '1 day 12 hours'
    );
    
    -- 4. Received at Origin
    INSERT INTO tracking_events (
        consignment_id, event_type, location_name, city, state,
        latitude, longitude, description, created_by, created_by_type,
        event_timestamp
    ) VALUES (
        test_consignment_id, 'IN_SCAN', 'Delhi Hub', 'Delhi', 'Delhi',
        28.7041, 77.1025, 'Consignment received and scanned at Delhi hub', admin_user_id, 'user',
        CURRENT_TIMESTAMP - INTERVAL '1 day 8 hours'
    );
    
    -- 5. Loaded on Vehicle
    INSERT INTO tracking_events (
        consignment_id, event_type, location_name, city, state,
        description, created_by, created_by_type,
        event_timestamp
    ) VALUES (
        test_consignment_id, 'LOADED_ON_VEHICLE', 'Delhi Hub', 'Delhi', 'Delhi',
        'Loaded on vehicle DL-01-AB-1234', admin_user_id, 'system',
        CURRENT_TIMESTAMP - INTERVAL '1 day 6 hours'
    );
    
    -- 6. In Transit
    INSERT INTO tracking_events (
        consignment_id, event_type, location_name, city, state,
        latitude, longitude, description, created_by, created_by_type,
        event_timestamp
    ) VALUES (
        test_consignment_id, 'IN_TRANSIT', 'Highway Toll Plaza', 'Gurgaon', 'Haryana',
        28.4595, 77.0266, 'Vehicle departed from Delhi, en route to Mumbai', admin_user_id, 'gps',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    );
    
    -- 7. Reached Destination
    INSERT INTO tracking_events (
        consignment_id, event_type, location_name, city, state,
        latitude, longitude, description, created_by, created_by_type,
        event_timestamp
    ) VALUES (
        test_consignment_id, 'REACHED_DESTINATION', 'Mumbai Hub', 'Mumbai', 'Maharashtra',
        19.0760, 72.8777, 'Consignment reached Mumbai destination hub', admin_user_id, 'system',
        CURRENT_TIMESTAMP - INTERVAL '4 hours'
    );
    
    -- 8. Out for Delivery
    INSERT INTO tracking_events (
        consignment_id, event_type, location_name, city, state,
        latitude, longitude, description, created_by, created_by_type,
        event_timestamp
    ) VALUES (
        test_consignment_id, 'OUT_SCAN', 'Mumbai Hub', 'Mumbai', 'Maharashtra',
        19.0760, 72.8777, 'Out for delivery to consignee', admin_user_id, 'user',
        CURRENT_TIMESTAMP - INTERVAL '2 hours'
    );
    
    -- Update the consignment status to match latest event
    UPDATE consignments 
    SET status = 'OUT_SCAN', 
        estimated_delivery_date = CURRENT_DATE + INTERVAL '1 day',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = test_consignment_id;
    
    RAISE NOTICE '✅ Tracking test data created successfully!';
    RAISE NOTICE '📦 Test CN Number: %', test_cn_number;
    RAISE NOTICE '🛣️  Created % tracking events', 
        (SELECT COUNT(*) FROM tracking_events WHERE consignment_id = test_consignment_id);
    
END $$;