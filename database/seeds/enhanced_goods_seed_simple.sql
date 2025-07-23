-- Simple Enhanced Goods System Seed Data
-- Use existing K2K company and tenant

DO $$
DECLARE
    k2k_company_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    k2k_tenant_id uuid := '45c4a180-3242-4020-92b3-b2588e930b4c';
    admin_user_id uuid;
    
    -- Categories
    electronics_id uuid := gen_random_uuid();
    mobile_id uuid := gen_random_uuid();
    
    -- Packaging types
    box_small_id uuid := gen_random_uuid();
    
    -- Goods
    iphone_id uuid := gen_random_uuid();
    
BEGIN
    -- Get any admin user
    SELECT id INTO admin_user_id FROM users LIMIT 1;
    IF admin_user_id IS NULL THEN
        admin_user_id := gen_random_uuid();
    END IF;
    
    RAISE NOTICE 'Using company: %, tenant: %, user: %', k2k_company_id, k2k_tenant_id, admin_user_id;

    -- Create root category (tenant_id actually references companies.id)
    INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order, created_by) 
    VALUES (electronics_id, k2k_company_id, 'Electronics', NULL, 'cpu', 'Electronic devices', true, 1, admin_user_id);

    -- Create sub-category
    INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order, created_by) 
    VALUES (mobile_id, k2k_company_id, 'Mobile Phones', electronics_id, 'smartphone', 'Smartphones', true, 1, admin_user_id);

    -- Create packaging type (tenant_id actually references companies.id)
    INSERT INTO packaging_types (id, tenant_id, name, code, description, dimensions, max_weight, tare_weight, is_stackable, is_active, created_by) 
    VALUES (box_small_id, k2k_company_id, 'Small Box', 'SB', 'Small cardboard box', 
     '{"length": 20, "width": 15, "height": 10, "unit": "cm"}', 5.0, 0.2, true, true, admin_user_id);

    -- Create enhanced goods item
    INSERT INTO goods_master (
        id, company_id, tenant_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
        unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
        handling_instructions, image_urls, barcode, min_insurance_value, is_active, created_by
    ) VALUES (
        iphone_id, k2k_company_id, k2k_tenant_id, 'iPhone 15 Pro', 'IPH15P', '85171200', mobile_id, box_small_id,
        'pcs', '{"length": 16, "width": 8, "height": 1, "unit": "cm"}', 0.2, true, false, false,
        'Handle with care. Avoid magnetic fields.', '[]', 'GDS001001', 50000.00, true, admin_user_id
    );

    -- Create alias for the iPhone
    INSERT INTO goods_aliases (goods_id, alias_name, language, is_primary) 
    VALUES (iphone_id, 'Apple iPhone', 'en', false);

    -- Create attribute for the iPhone
    INSERT INTO goods_attributes (goods_id, attribute_name, attribute_value, attribute_type, display_order) 
    VALUES (iphone_id, 'Storage', '256GB', 'text', 1);

    RAISE NOTICE '✅ Basic Enhanced Goods System data loaded successfully!';
    RAISE NOTICE '📱 Created 1 goods item with enhanced features';
    
END $$;