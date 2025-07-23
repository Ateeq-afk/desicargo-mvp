-- Enhanced Goods System Seed Data
-- This file populates the enhanced goods system with sample data

-- ============================================================================
-- 1. GOODS CATEGORIES SEED DATA
-- ============================================================================

-- Root Categories
INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order) VALUES 
('gc-electronics-001', 'k2k-logistics-001', 'Electronics', NULL, 'cpu', 'Electronic devices and components', true, 1),
('gc-clothing-001', 'k2k-logistics-001', 'Clothing & Textiles', NULL, 'shirt', 'Garments and textile products', true, 2),
('gc-food-001', 'k2k-logistics-001', 'Food & Beverages', NULL, 'coffee', 'Food items and beverages', true, 3),
('gc-automotive-001', 'k2k-logistics-001', 'Automotive', NULL, 'car', 'Vehicle parts and accessories', true, 4),
('gc-furniture-001', 'k2k-logistics-001', 'Furniture', NULL, 'home', 'Home and office furniture', true, 5),
('gc-medical-001', 'k2k-logistics-001', 'Medical & Healthcare', NULL, 'heart', 'Medical devices and pharmaceuticals', true, 6),
('gc-books-001', 'k2k-logistics-001', 'Books & Stationery', NULL, 'book', 'Books and office supplies', true, 7),
('gc-sports-001', 'k2k-logistics-001', 'Sports & Recreation', NULL, 'zap', 'Sports equipment and recreational items', true, 8);

-- Electronics Sub-categories
INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order) VALUES 
('gc-mobile-001', 'k2k-logistics-001', 'Mobile Phones', 'gc-electronics-001', 'smartphone', 'Smartphones and accessories', true, 1),
('gc-laptop-001', 'k2k-logistics-001', 'Laptops & Computers', 'gc-electronics-001', 'monitor', 'Computing devices', true, 2),
('gc-appliances-001', 'k2k-logistics-001', 'Home Appliances', 'gc-electronics-001', 'zap', 'Kitchen and home appliances', true, 3),
('gc-audio-001', 'k2k-logistics-001', 'Audio & Video', 'gc-electronics-001', 'headphones', 'Audio and video equipment', true, 4);

-- Clothing Sub-categories
INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order) VALUES 
('gc-mens-001', 'k2k-logistics-001', 'Mens Wear', 'gc-clothing-001', 'user', 'Mens clothing and accessories', true, 1),
('gc-womens-001', 'k2k-logistics-001', 'Womens Wear', 'gc-clothing-001', 'user', 'Womens clothing and accessories', true, 2),
('gc-kids-001', 'k2k-logistics-001', 'Kids Wear', 'gc-clothing-001', 'users', 'Childrens clothing', true, 3);

-- Food Sub-categories
INSERT INTO goods_categories (id, tenant_id, name, parent_id, icon, description, is_active, display_order) VALUES 
('gc-fresh-001', 'k2k-logistics-001', 'Fresh Produce', 'gc-food-001', 'apple', 'Fresh fruits and vegetables', true, 1),
('gc-packaged-001', 'k2k-logistics-001', 'Packaged Foods', 'gc-food-001', 'package', 'Processed and packaged foods', true, 2),
('gc-beverages-001', 'k2k-logistics-001', 'Beverages', 'gc-food-001', 'coffee', 'Drinks and beverages', true, 3);

-- ============================================================================
-- 2. PACKAGING TYPES SEED DATA
-- ============================================================================

INSERT INTO packaging_types (id, tenant_id, name, code, description, dimensions, max_weight, tare_weight, is_stackable, is_active) VALUES 
-- Small packages
('pt-box-small-001', 'k2k-logistics-001', 'Small Box', 'SB', 'Standard small cardboard box', 
 '{"length": 20, "width": 15, "height": 10, "unit": "cm"}', 5.0, 0.2, true, true),

('pt-envelope-001', 'k2k-logistics-001', 'Document Envelope', 'ENV', 'A4 document envelope',
 '{"length": 35, "width": 25, "height": 2, "unit": "cm"}', 0.5, 0.05, true, true),

-- Medium packages  
('pt-box-medium-001', 'k2k-logistics-001', 'Medium Box', 'MB', 'Standard medium cardboard box',
 '{"length": 40, "width": 30, "height": 25, "unit": "cm"}', 15.0, 0.5, true, true),

('pt-bag-poly-001', 'k2k-logistics-001', 'Poly Bag', 'PB', 'Waterproof polyethylene bag',
 '{"length": 50, "width": 35, "height": 5, "unit": "cm"}', 10.0, 0.1, true, true),

-- Large packages
('pt-box-large-001', 'k2k-logistics-001', 'Large Box', 'LB', 'Large cardboard box for bulky items',
 '{"length": 60, "width": 45, "height": 40, "unit": "cm"}', 30.0, 1.0, true, true),

('pt-crate-wood-001', 'k2k-logistics-001', 'Wooden Crate', 'WC', 'Heavy duty wooden crate',
 '{"length": 80, "width": 60, "height": 50, "unit": "cm"}', 100.0, 5.0, false, true),

-- Specialized packaging
('pt-tube-001', 'k2k-logistics-001', 'Cardboard Tube', 'CT', 'For documents and posters',
 '{"length": 100, "width": 10, "height": 10, "unit": "cm"}', 2.0, 0.3, false, true),

('pt-fragile-001', 'k2k-logistics-001', 'Fragile Box', 'FB', 'Extra padding for fragile items',
 '{"length": 35, "width": 25, "height": 20, "unit": "cm"}', 8.0, 0.8, true, true),

-- Cold chain packaging
('pt-insulated-001', 'k2k-logistics-001', 'Insulated Box', 'IB', 'Temperature controlled packaging',
 '{"length": 45, "width": 35, "height": 30, "unit": "cm"}', 20.0, 2.0, false, true);

-- ============================================================================
-- 3. ENHANCED GOODS MASTER SEED DATA
-- ============================================================================

-- Electronics - Mobile Phones
INSERT INTO goods_master (
    id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
    unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
    handling_instructions, image_urls, barcode, min_insurance_value, is_active, created_by
) VALUES 
('gm-iphone-001', 'k2k-logistics-001', 'iPhone 15 Pro', 'IPH15P', '85171200', 'gc-mobile-001', 'pt-box-small-001',
 'pcs', '{"length": 16, "width": 8, "height": 1, "unit": "cm"}', 0.2, true, false, false,
 'Handle with care. Avoid magnetic fields.', '[]', 'GDS001001', 50000.00, true, 'user-admin-001'),

('gm-samsung-001', 'k2k-logistics-001', 'Samsung Galaxy S24', 'SGS24', '85171200', 'gc-mobile-001', 'pt-box-small-001',
 'pcs', '{"length": 16, "width": 7.5, "height": 0.8, "unit": "cm"}', 0.18, true, false, false,
 'Fragile electronic device. Keep dry.', '[]', 'GDS001002', 40000.00, true, 'user-admin-001');

-- Electronics - Laptops
INSERT INTO goods_master (
    id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
    unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
    handling_instructions, image_urls, barcode, min_insurance_value, is_active, created_by
) VALUES 
('gm-macbook-001', 'k2k-logistics-001', 'MacBook Pro 16-inch', 'MBP16', '84713000', 'gc-laptop-001', 'pt-box-medium-001',
 'pcs', '{"length": 36, "width": 25, "height": 2, "unit": "cm"}', 2.0, true, false, false,
 'Extremely fragile. Use original packaging when possible.', '[]', 'GDS002001', 150000.00, true, 'user-admin-001');

-- Home Appliances
INSERT INTO goods_master (
    id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
    unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
    handling_instructions, image_urls, barcode, min_insurance_value, is_active, created_by
) VALUES 
('gm-microwave-001', 'k2k-logistics-001', 'Microwave Oven', 'MWO001', '85165000', 'gc-appliances-001', 'pt-box-large-001',
 'pcs', '{"length": 50, "width": 40, "height": 30, "unit": "cm"}', 15.0, true, false, false,
 'Heavy item. Use proper lifting equipment. Fragile glass turntable.', '[]', 'GDS003001', 8000.00, true, 'user-admin-001');

-- Clothing
INSERT INTO goods_master (
    id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
    unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
    handling_instructions, image_urls, barcode, is_active, created_by
) VALUES 
('gm-tshirt-001', 'k2k-logistics-001', 'Cotton T-Shirt', 'TSH001', '61091000', 'gc-mens-001', 'pt-bag-poly-001',
 'pcs', '{"length": 30, "width": 25, "height": 2, "unit": "cm"}', 0.15, false, false, false,
 'Keep dry. Avoid sharp objects.', '[]', 'GDS004001', true, 'user-admin-001'),

('gm-jeans-001', 'k2k-logistics-001', 'Denim Jeans', 'JNS001', '62034200', 'gc-mens-001', 'pt-bag-poly-001',
 'pcs', '{"length": 40, "width": 35, "height": 3, "unit": "cm"}', 0.5, false, false, false,
 'Fold carefully to avoid wrinkles.', '[]', 'GDS004002', true, 'user-admin-001');

-- Food Items (Perishable)
INSERT INTO goods_master (
    id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
    unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
    temperature_requirements, handling_instructions, image_urls, barcode, shelf_life_days, is_active, created_by
) VALUES 
('gm-apple-001', 'k2k-logistics-001', 'Fresh Apples', 'APL001', '08081000', 'gc-fresh-001', 'pt-crate-wood-001',
 'kg', '{"length": 8, "width": 8, "height": 8, "unit": "cm"}', 0.2, false, false, true,
 '{"min": 0, "max": 4, "unit": "C"}', 'Keep refrigerated. Handle gently to avoid bruising.', 
 '[]', 'GDS005001', 7, true, 'user-admin-001'),

('gm-milk-001', 'k2k-logistics-001', 'Fresh Milk', 'MLK001', '04012000', 'gc-beverages-001', 'pt-insulated-001',
 'liter', '{"length": 10, "width": 6, "height": 20, "unit": "cm"}', 1.03, true, false, true,
 '{"min": 2, "max": 6, "unit": "C"}', 'URGENT: Keep refrigerated at all times. Fragile packaging.',
 '[]', 'GDS005002', 3, true, 'user-admin-001');

-- Books
INSERT INTO goods_master (
    id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
    unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
    handling_instructions, image_urls, barcode, is_active, created_by
) VALUES 
('gm-textbook-001', 'k2k-logistics-001', 'Educational Textbook', 'TXB001', '49019900', 'gc-books-001', 'pt-envelope-001',
 'pcs', '{"length": 25, "width": 20, "height": 2, "unit": "cm"}', 0.8, false, false, false,
 'Protect from moisture. Handle pages carefully.', '[]', 'GDS006001', true, 'user-admin-001');

-- Medical/Pharmaceutical (Hazardous)
INSERT INTO goods_master (
    id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
    unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
    temperature_requirements, handling_instructions, image_urls, barcode, shelf_life_days, is_active, created_by
) VALUES 
('gm-insulin-001', 'k2k-logistics-001', 'Insulin Vials', 'INS001', '30043200', 'gc-medical-001', 'pt-insulated-001',
 'vial', '{"length": 3, "width": 3, "height": 10, "unit": "cm"}', 0.05, true, true, true,
 '{"min": 2, "max": 8, "unit": "C"}', 'MEDICAL EMERGENCY ITEM. Maintain cold chain. Fragile glass vials. Requires special permits.',
 '[]', 'GDS007001', 730, true, 'user-admin-001');

-- Automotive
INSERT INTO goods_master (
    id, company_id, goods_name, goods_code, hsn_code, category_id, packaging_type_id,
    unit_of_measurement, dimensions, weight_per_unit, is_fragile, is_hazardous, is_perishable,
    handling_instructions, image_urls, barcode, is_active, created_by
) VALUES 
('gm-tire-001', 'k2k-logistics-001', 'Car Tire 185/65R15', 'TIR001', '40111000', 'gc-automotive-001', NULL,
 'pcs', '{"length": 60, "width": 60, "height": 20, "unit": "cm"}', 8.0, false, false, false,
 'Heavy item. Can be stacked but avoid excessive weight.', '[]', 'GDS008001', true, 'user-admin-001');

-- ============================================================================
-- 4. GOODS ALIASES SEED DATA
-- ============================================================================

INSERT INTO goods_aliases (goods_id, alias_name, language, is_primary) VALUES 
-- iPhone aliases
('gm-iphone-001', 'iPhone 15 Pro Max', 'en', false),
('gm-iphone-001', 'Apple iPhone', 'en', false),
('gm-iphone-001', 'आईफोन 15 प्रो', 'hi', false),

-- Samsung aliases
('gm-samsung-001', 'Galaxy S24', 'en', false),
('gm-samsung-001', 'Samsung Mobile', 'en', false),

-- MacBook aliases  
('gm-macbook-001', 'MacBook Pro', 'en', false),
('gm-macbook-001', 'Apple Laptop', 'en', false),

-- Food aliases
('gm-apple-001', 'Red Apples', 'en', false),
('gm-apple-001', 'सेब', 'hi', false),
('gm-milk-001', 'दूध', 'hi', false);

-- ============================================================================
-- 5. GOODS ATTRIBUTES SEED DATA
-- ============================================================================

INSERT INTO goods_attributes (goods_id, attribute_name, attribute_value, attribute_type, display_order) VALUES 
-- iPhone attributes
('gm-iphone-001', 'Storage', '256GB', 'text', 1),
('gm-iphone-001', 'Color', 'Natural Titanium', 'text', 2),
('gm-iphone-001', 'Battery Life', '29 hours', 'text', 3),
('gm-iphone-001', 'Water Resistant', 'true', 'boolean', 4),

-- MacBook attributes
('gm-macbook-001', 'Processor', 'Apple M3 Pro', 'text', 1),
('gm-macbook-001', 'RAM', '18GB', 'text', 2),
('gm-macbook-001', 'Storage', '512GB SSD', 'text', 3),
('gm-macbook-001', 'Display Size', '16.2', 'number', 4),

-- Microwave attributes
('gm-microwave-001', 'Power', '800W', 'text', 1),
('gm-microwave-001', 'Capacity', '20L', 'text', 2),
('gm-microwave-001', 'Digital Display', 'true', 'boolean', 3),

-- T-shirt attributes
('gm-tshirt-001', 'Size', 'M', 'text', 1),
('gm-tshirt-001', 'Color', 'Blue', 'text', 2),
('gm-tshirt-001', 'Material', '100% Cotton', 'text', 3),

-- Apple attributes
('gm-apple-001', 'Variety', 'Fuji', 'text', 1),
('gm-apple-001', 'Origin', 'Kashmir', 'text', 2),
('gm-apple-001', 'Grade', 'Premium', 'text', 3);

-- ============================================================================
-- 6. GOODS PRICING RULES SEED DATA
-- ============================================================================

INSERT INTO goods_pricing_rules (tenant_id, category_id, rule_type, rule_name, conditions, charge_type, charge_value, is_active, priority) VALUES 
-- Electronics surcharge
('k2k-logistics-001', 'gc-electronics-001', 'surcharge', 'Electronics Insurance Surcharge', 
 '{"min_insurance_value": 10000}', 'percentage', 2.0, true, 1),

-- Fragile handling fee
('k2k-logistics-001', 'gc-electronics-001', 'handling_fee', 'Fragile Item Handling', 
 '{"is_fragile": true}', 'fixed', 50.0, true, 2),

-- Perishable rush charge
('k2k-logistics-001', 'gc-food-001', 'surcharge', 'Perishable Rush Delivery', 
 '{"is_perishable": true}', 'percentage', 15.0, true, 1),

-- Cold chain surcharge
('k2k-logistics-001', 'gc-food-001', 'surcharge', 'Cold Chain Handling', 
 '{"temperature_controlled": true}', 'fixed', 200.0, true, 3),

-- Hazardous material fee
('k2k-logistics-001', 'gc-medical-001', 'handling_fee', 'Hazardous Material Handling', 
 '{"is_hazardous": true}', 'fixed', 500.0, true, 1),

-- Heavy item surcharge
('k2k-logistics-001', 'gc-automotive-001', 'surcharge', 'Heavy Item Surcharge', 
 '{"min_weight": 5.0}', 'percentage', 10.0, true, 1);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show category hierarchy
SELECT 
  'Category Hierarchy' as info,
  gc1.name as "Root Category",
  COUNT(gc2.id) as "Sub Categories",
  COUNT(gm.id) as "Goods Count"
FROM goods_categories gc1
LEFT JOIN goods_categories gc2 ON gc2.parent_id = gc1.id
LEFT JOIN goods_master gm ON gm.category_id = gc1.id OR gm.category_id = gc2.id
WHERE gc1.tenant_id = 'k2k-logistics-001' AND gc1.parent_id IS NULL
GROUP BY gc1.id, gc1.name
ORDER BY gc1.display_order;

-- Show packaging types summary
SELECT 
  'Packaging Summary' as info,
  name,
  code,
  max_weight || 'kg' as "Max Weight",
  CASE WHEN is_stackable THEN 'Yes' ELSE 'No' END as "Stackable"
FROM packaging_types 
WHERE tenant_id = 'k2k-logistics-001' AND is_active = true
ORDER BY max_weight;

-- Show goods with special handling
SELECT 
  'Special Handling Items' as info,
  goods_name,
  CASE WHEN is_fragile THEN 'Fragile ' ELSE '' END ||
  CASE WHEN is_hazardous THEN 'Hazardous ' ELSE '' END ||
  CASE WHEN is_perishable THEN 'Perishable' ELSE '' END as "Special Requirements",
  COALESCE(shelf_life_days::text || ' days', 'N/A') as "Shelf Life"
FROM goods_master 
WHERE company_id = 'k2k-logistics-001' 
AND (is_fragile = true OR is_hazardous = true OR is_perishable = true)
ORDER BY goods_name;