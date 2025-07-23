-- Enhanced Goods System Seed Data (Fixed with proper UUIDs)
-- First, get the tenant ID for k2k-logistics-001

DO $$
DECLARE
    k2k_tenant_id uuid;
    admin_user_id uuid;
    
    -- Categories
    electronics_id uuid := gen_random_uuid();
    clothing_id uuid := gen_random_uuid();
    food_id uuid := gen_random_uuid();
    automotive_id uuid := gen_random_uuid();
    furniture_id uuid := gen_random_uuid();
    medical_id uuid := gen_random_uuid();
    books_id uuid := gen_random_uuid();
    sports_id uuid := gen_random_uuid();
    
    mobile_id uuid := gen_random_uuid();
    laptop_id uuid := gen_random_uuid();
    appliances_id uuid := gen_random_uuid();
    audio_id uuid := gen_random_uuid();
    mens_id uuid := gen_random_uuid();
    womens_id uuid := gen_random_uuid();
    kids_id uuid := gen_random_uuid();
    fresh_id uuid := gen_random_uuid();
    packaged_id uuid := gen_random_uuid();
    beverages_id uuid := gen_random_uuid();
    
    -- Packaging types
    box_small_id uuid := gen_random_uuid();
    envelope_id uuid := gen_random_uuid();
    box_medium_id uuid := gen_random_uuid();
    bag_poly_id uuid := gen_random_uuid();
    box_large_id uuid := gen_random_uuid();
    crate_wood_id uuid := gen_random_uuid();
    tube_id uuid := gen_random_uuid();
    fragile_id uuid := gen_random_uuid();
    insulated_id uuid := gen_random_uuid();
    
    -- Goods
    iphone_id uuid := gen_random_uuid();
    samsung_id uuid := gen_random_uuid();
    macbook_id uuid := gen_random_uuid();
    microwave_id uuid := gen_random_uuid();
    tshirt_id uuid := gen_random_uuid();
    jeans_id uuid := gen_random_uuid();
    apple_id uuid := gen_random_uuid();
    milk_id uuid := gen_random_uuid();
    textbook_id uuid := gen_random_uuid();
    insulin_id uuid := gen_random_uuid();
    tire_id uuid := gen_random_uuid();
    
BEGIN
    -- Get tenant and admin user IDs
    SELECT id INTO k2k_tenant_id FROM companies WHERE name LIKE '%K2K%' OR name LIKE '%k2k%' LIMIT 1;
    IF k2k_tenant_id IS NULL THEN
        RAISE NOTICE 'Creating demo tenant...';
        INSERT INTO companies (id, name, gstin, address, phone, email, subscription_plan)
        VALUES (gen_random_uuid(), 'K2K Logistics Demo', '27AAACK2K00K1ZN', 'Demo Address, Demo City', '9876543210', 'demo@k2klogistics.com', 'premium')
        RETURNING id INTO k2k_tenant_id;
    END IF;
    
    SELECT id INTO admin_user_id FROM users WHERE email LIKE '%admin%' OR email LIKE '%demo%' LIMIT 1;
    IF admin_user_id IS NULL THEN
        admin_user_id := gen_random_uuid();
    END IF;
    
    RAISE NOTICE 'Using tenant ID: % and user ID: %', k2k_tenant_id, admin_user_id;

    -- ============================================================================
    -- 1. GOODS CATEGORIES SEED DATA
    -- ============================================================================

    -- Root Categories
    INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order, created_by) VALUES 
    (electronics_id, k2k_tenant_id, 'Electronics', NULL, 'cpu', 'Electronic devices and components', true, 1, admin_user_id),
    (clothing_id, k2k_tenant_id, 'Clothing & Textiles', NULL, 'shirt', 'Garments and textile products', true, 2, admin_user_id),
    (food_id, k2k_tenant_id, 'Food & Beverages', NULL, 'coffee', 'Food items and beverages', true, 3, admin_user_id),
    (automotive_id, k2k_tenant_id, 'Automotive', NULL, 'car', 'Vehicle parts and accessories', true, 4, admin_user_id),
    (furniture_id, k2k_tenant_id, 'Furniture', NULL, 'home', 'Home and office furniture', true, 5, admin_user_id),
    (medical_id, k2k_tenant_id, 'Medical & Healthcare', NULL, 'heart', 'Medical devices and pharmaceuticals', true, 6, admin_user_id),
    (books_id, k2k_tenant_id, 'Books & Stationery', NULL, 'book', 'Books and office supplies', true, 7, admin_user_id),
    (sports_id, k2k_tenant_id, 'Sports & Recreation', NULL, 'zap', 'Sports equipment and recreational items', true, 8, admin_user_id);

    -- Electronics Sub-categories
    INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order, created_by) VALUES 
    (mobile_id, k2k_tenant_id, 'Mobile Phones', electronics_id, 'smartphone', 'Smartphones and accessories', true, 1, admin_user_id),
    (laptop_id, k2k_tenant_id, 'Laptops & Computers', electronics_id, 'monitor', 'Computing devices', true, 2, admin_user_id),
    (appliances_id, k2k_tenant_id, 'Home Appliances', electronics_id, 'zap', 'Kitchen and home appliances', true, 3, admin_user_id),
    (audio_id, k2k_tenant_id, 'Audio & Video', electronics_id, 'headphones', 'Audio and video equipment', true, 4, admin_user_id);

    -- Clothing Sub-categories
    INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order, created_by) VALUES 
    (mens_id, k2k_tenant_id, 'Mens Wear', clothing_id, 'user', 'Mens clothing and accessories', true, 1, admin_user_id),
    (womens_id, k2k_tenant_id, 'Womens Wear', clothing_id, 'user', 'Womens clothing and accessories', true, 2, admin_user_id),
    (kids_id, k2k_tenant_id, 'Kids Wear', clothing_id, 'users', 'Childrens clothing', true, 3, admin_user_id);

    -- Food Sub-categories
    INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order, created_by) VALUES 
    (fresh_id, k2k_tenant_id, 'Fresh Produce', food_id, 'apple', 'Fresh fruits and vegetables', true, 1, admin_user_id),
    (packaged_id, k2k_tenant_id, 'Packaged Foods', food_id, 'package', 'Processed and packaged foods', true, 2, admin_user_id),
    (beverages_id, k2k_tenant_id, 'Beverages', food_id, 'coffee', 'Drinks and beverages', true, 3, admin_user_id);

    -- ============================================================================
    -- 2. PACKAGING TYPES SEED DATA
    -- ============================================================================

    INSERT INTO packaging_types (id, tenant_id, name, code, description, dimensions, max_weight, tare_weight, is_stackable, is_active, created_by) VALUES 
    -- Small packages
    (box_small_id, k2k_tenant_id, 'Small Box', 'SB', 'Standard small cardboard box', 
     '{"length": 20, "width": 15, "height": 10, "unit": "cm"}', 5.0, 0.2, true, true, admin_user_id),

    (envelope_id, k2k_tenant_id, 'Document Envelope', 'ENV', 'A4 document envelope',
     '{"length": 35, "width": 25, "height": 2, "unit": "cm"}', 0.5, 0.05, true, true, admin_user_id),

    -- Medium packages  
    (box_medium_id, k2k_tenant_id, 'Medium Box', 'MB', 'Standard medium cardboard box',
     '{"length": 40, "width": 30, "height": 25, "unit": "cm"}', 15.0, 0.5, true, true, admin_user_id),

    (bag_poly_id, k2k_tenant_id, 'Poly Bag', 'PB', 'Waterproof polyethylene bag',
     '{"length": 50, "width": 35, "height": 5, "unit": "cm"}', 10.0, 0.1, true, true, admin_user_id),

    -- Large packages
    (box_large_id, k2k_tenant_id, 'Large Box', 'LB', 'Large cardboard box for bulky items',
     '{"length": 60, "width": 45, "height": 40, "unit": "cm"}', 30.0, 1.0, true, true, admin_user_id),

    (crate_wood_id, k2k_tenant_id, 'Wooden Crate', 'WC', 'Heavy duty wooden crate',
     '{"length": 80, "width": 60, "height": 50, "unit": "cm"}', 100.0, 5.0, false, true, admin_user_id),

    -- Specialized packaging
    (tube_id, k2k_tenant_id, 'Cardboard Tube', 'CT', 'For documents and posters',
     '{"length": 100, "width": 10, "height": 10, "unit": "cm"}', 2.0, 0.3, false, true, admin_user_id),

    (fragile_id, k2k_tenant_id, 'Fragile Box', 'FB', 'Extra padding for fragile items',
     '{"length": 35, "width": 25, "height": 20, "unit": "cm"}', 8.0, 0.8, true, true, admin_user_id),

    -- Cold chain packaging
    (insulated_id, k2k_tenant_id, 'Insulated Box', 'IB', 'Temperature controlled packaging',
     '{"length": 45, "width": 35, "height": 30, "unit": "cm"}', 20.0, 2.0, false, true, admin_user_id);

    -- ============================================================================
    -- 3. ENHANCED GOODS MASTER SEED DATA
    -- ============================================================================

    -- Electronics - Mobile Phones
    INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        handling_instructions, image_urls, barcode, min_insurance_value, is_active, created_by
    ) VALUES 
    (iphone_id, k2k_tenant_id, 'iPhone 15 Pro', 'IPH15P', '85171200', mobile_id, box_small_id,
     'pcs', '{"length": 16, "width": 8, "height": 1, "unit": "cm"}', 0.2, true, false, false,
     'Handle with care. Avoid magnetic fields.', '[]', 'GDS001001', 50000.00, true, admin_user_id),

    (samsung_id, k2k_tenant_id, 'Samsung Galaxy S24', 'SGS24', '85171200', mobile_id, box_small_id,
     'pcs', '{"length": 16, "width": 7.5, "height": 0.8, "unit": "cm"}', 0.18, true, false, false,
     'Fragile electronic device. Keep dry.', '[]', 'GDS001002', 40000.00, true, admin_user_id);

    -- Electronics - Laptops
    INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        handling_instructions, image_urls, barcode, min_insurance_value, is_active, created_by
    ) VALUES 
    (macbook_id, k2k_tenant_id, 'MacBook Pro 16-inch', 'MBP16', '84713000', laptop_id, box_medium_id,
     'pcs', '{"length": 36, "width": 25, "height": 2, "unit": "cm"}', 2.0, true, false, false,
     'Extremely fragile. Use original packaging when possible.', '[]', 'GDS002001', 150000.00, true, admin_user_id);

    -- Home Appliances
    INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        handling_instructions, image_urls, barcode, min_insurance_value, is_active, created_by
    ) VALUES 
    (microwave_id, k2k_tenant_id, 'Microwave Oven', 'MWO001', '85165000', appliances_id, box_large_id,
     'pcs', '{"length": 50, "width": 40, "height": 30, "unit": "cm"}', 15.0, true, false, false,
     'Heavy item. Use proper lifting equipment. Fragile glass turntable.', '[]', 'GDS003001', 8000.00, true, admin_user_id);

    -- Clothing
    INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        handling_instructions, image_urls, barcode, is_active, created_by
    ) VALUES 
    (tshirt_id, k2k_tenant_id, 'Cotton T-Shirt', 'TSH001', '61091000', mens_id, bag_poly_id,
     'pcs', '{"length": 30, "width": 25, "height": 2, "unit": "cm"}', 0.15, false, false, false,
     'Keep dry. Avoid sharp objects.', '[]', 'GDS004001', true, admin_user_id),

    (jeans_id, k2k_tenant_id, 'Denim Jeans', 'JNS001', '62034200', mens_id, bag_poly_id,
     'pcs', '{"length": 40, "width": 35, "height": 3, "unit": "cm"}', 0.5, false, false, false,
     'Fold carefully to avoid wrinkles.', '[]', 'GDS004002', true, admin_user_id);

    -- Food Items (Perishable)
    INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        temperature_requirements, handling_instructions, image_urls, barcode, shelf_life_days, is_active, created_by
    ) VALUES 
    (apple_id, k2k_tenant_id, 'Fresh Apples', 'APL001', '08081000', fresh_id, crate_wood_id,
     'kg', '{"length": 8, "width": 8, "height": 8, "unit": "cm"}', 0.2, false, false, true,
     '{"min": 0, "max": 4, "unit": "C"}', 'Keep refrigerated. Handle gently to avoid bruising.', 
     '[]', 'GDS005001', 7, true, admin_user_id),

    (milk_id, k2k_tenant_id, 'Fresh Milk', 'MLK001', '04012000', beverages_id, insulated_id,
     'liter', '{"length": 10, "width": 6, "height": 20, "unit": "cm"}', 1.03, true, false, true,
     '{"min": 2, "max": 6, "unit": "C"}', 'URGENT: Keep refrigerated at all times. Fragile packaging.',
     '[]', 'GDS005002', 3, true, admin_user_id);

    -- Books
    INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        handling_instructions, image_urls, barcode, is_active, created_by
    ) VALUES 
    (textbook_id, k2k_tenant_id, 'Educational Textbook', 'TXB001', '49019900', books_id, envelope_id,
     'pcs', '{"length": 25, "width": 20, "height": 2, "unit": "cm"}', 0.8, false, false, false,
     'Protect from moisture. Handle pages carefully.', '[]', 'GDS006001', true, admin_user_id);

    -- Medical/Pharmaceutical (Hazardous)
    INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        temperature_requirements, handling_instructions, image_urls, barcode, shelf_life_days, is_active, created_by
    ) VALUES 
    (insulin_id, k2k_tenant_id, 'Insulin Vials', 'INS001', '30043200', medical_id, insulated_id,
     'vial', '{"length": 3, "width": 3, "height": 10, "unit": "cm"}', 0.05, true, true, true,
     '{"min": 2, "max": 8, "unit": "C"}', 'MEDICAL EMERGENCY ITEM. Maintain cold chain. Fragile glass vials. Requires special permits.',
     '[]', 'GDS007001', 730, true, admin_user_id);

    -- Automotive
    INSERT INTO goods_master (
        id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        handling_instructions, image_urls, barcode, is_active, created_by
    ) VALUES 
    (tire_id, k2k_tenant_id, 'Car Tire 185/65R15', 'TIR001', '40111000', automotive_id, NULL,
     'pcs', '{"length": 60, "width": 60, "height": 20, "unit": "cm"}', 8.0, false, false, false,
     'Heavy item. Can be stacked but avoid excessive weight.', '[]', 'GDS008001', true, admin_user_id);

    -- ============================================================================
    -- 4. GOODS ALIASES SEED DATA
    -- ============================================================================

    INSERT INTO goods_aliases (goods_id, alias_name, language, is_primary) VALUES 
    -- iPhone aliases
    (iphone_id, 'iPhone 15 Pro Max', 'en', false),
    (iphone_id, 'Apple iPhone', 'en', false),
    (iphone_id, 'आईफोन 15 प्रो', 'hi', false),

    -- Samsung aliases
    (samsung_id, 'Galaxy S24', 'en', false),
    (samsung_id, 'Samsung Mobile', 'en', false),

    -- MacBook aliases  
    (macbook_id, 'MacBook Pro', 'en', false),
    (macbook_id, 'Apple Laptop', 'en', false),

    -- Food aliases
    (apple_id, 'Red Apples', 'en', false),
    (apple_id, 'सेब', 'hi', false),
    (milk_id, 'दूध', 'hi', false);

    -- ============================================================================
    -- 5. GOODS ATTRIBUTES SEED DATA
    -- ============================================================================

    INSERT INTO goods_attributes (goods_id, attribute_name, attribute_value, attribute_type, display_order) VALUES 
    -- iPhone attributes
    (iphone_id, 'Storage', '256GB', 'text', 1),
    (iphone_id, 'Color', 'Natural Titanium', 'text', 2),
    (iphone_id, 'Battery Life', '29 hours', 'text', 3),
    (iphone_id, 'Water Resistant', 'true', 'boolean', 4),

    -- MacBook attributes
    (macbook_id, 'Processor', 'Apple M3 Pro', 'text', 1),
    (macbook_id, 'RAM', '18GB', 'text', 2),
    (macbook_id, 'Storage', '512GB SSD', 'text', 3),
    (macbook_id, 'Display Size', '16.2', 'number', 4),

    -- Microwave attributes
    (microwave_id, 'Power', '800W', 'text', 1),
    (microwave_id, 'Capacity', '20L', 'text', 2),
    (microwave_id, 'Digital Display', 'true', 'boolean', 3),

    -- T-shirt attributes
    (tshirt_id, 'Size', 'M', 'text', 1),
    (tshirt_id, 'Color', 'Blue', 'text', 2),
    (tshirt_id, 'Material', '100% Cotton', 'text', 3),

    -- Apple attributes
    (apple_id, 'Variety', 'Fuji', 'text', 1),
    (apple_id, 'Origin', 'Kashmir', 'text', 2),
    (apple_id, 'Grade', 'Premium', 'text', 3);

    -- ============================================================================
    -- 6. GOODS PRICING RULES SEED DATA
    -- ============================================================================

    INSERT INTO goods_pricing_rules (tenant_id, category_id, rule_type, rule_name, conditions, charge_type, charge_value, is_active, priority, created_by) VALUES 
    -- Electronics surcharge
    (k2k_tenant_id, electronics_id, 'surcharge', 'Electronics Insurance Surcharge', 
     '{"min_insurance_value": 10000}', 'percentage', 2.0, true, 1, admin_user_id),

    -- Fragile handling fee
    (k2k_tenant_id, electronics_id, 'handling_fee', 'Fragile Item Handling', 
     '{"is_fragile": true}', 'fixed', 50.0, true, 2, admin_user_id),

    -- Perishable rush charge
    (k2k_tenant_id, food_id, 'surcharge', 'Perishable Rush Delivery', 
     '{"is_perishable": true}', 'percentage', 15.0, true, 1, admin_user_id),

    -- Cold chain surcharge
    (k2k_tenant_id, food_id, 'surcharge', 'Cold Chain Handling', 
     '{"temperature_controlled": true}', 'fixed', 200.0, true, 3, admin_user_id),

    -- Hazardous material fee
    (k2k_tenant_id, medical_id, 'handling_fee', 'Hazardous Material Handling', 
     '{"is_hazardous": true}', 'fixed', 500.0, true, 1, admin_user_id),

    -- Heavy item surcharge
    (k2k_tenant_id, automotive_id, 'surcharge', 'Heavy Item Surcharge', 
     '{"min_weight": 5.0}', 'percentage', 10.0, true, 1, admin_user_id);

    RAISE NOTICE '✅ Enhanced Goods System seed data loaded successfully!';
    RAISE NOTICE '📊 Created % categories, % packaging types, % goods items', 
        (SELECT COUNT(*) FROM goods_categories WHERE tenant_id = k2k_tenant_id),
        (SELECT COUNT(*) FROM packaging_types WHERE tenant_id = k2k_tenant_id), 
        (SELECT COUNT(*) FROM goods_master WHERE company_id = k2k_tenant_id);
    
END $$;