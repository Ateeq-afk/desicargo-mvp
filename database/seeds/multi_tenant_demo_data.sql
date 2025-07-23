-- Multi-Tenant Demo Data
-- Creates multiple demo tenants with realistic business data
-- Date: 2025-07-22

BEGIN;

-- =============================================
-- 1. SWIFT LOGISTICS (Express Courier Service)
-- =============================================

INSERT INTO tenants (id, code, name, email, phone, address, is_active, subscription_plan, subscription_starts_at, subscription_ends_at, settings) 
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'swift',
  'Swift Express Logistics',
  'admin@swiftlogistics.in',
  '+91-9876543220',
  '456 Logistics Park, Bangalore, Karnataka 560001',
  true,
  'professional',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '1 year',
  '{"branding": {"primary_color": "#FF6B35", "secondary_color": "#F7931E", "logo_url": null}, "features": ["express_delivery", "real_time_tracking", "cod_service"]}'
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  settings = EXCLUDED.settings;

INSERT INTO companies (id, name, gstin, logo_url, address, phone, email, subscription_plan, is_active, tenant_id, trial_ends_at, subscription_ends_at, onboarding_completed) 
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Swift Express Logistics Pvt Ltd',
  '29AABCS1234E1Z6',
  null,
  '456 Logistics Park, Electronic City, Bangalore',
  '+91-9876543220',
  'admin@swiftlogistics.in',
  'professional',
  true,
  '11111111-1111-1111-1111-111111111111',
  CURRENT_TIMESTAMP + INTERVAL '90 days',
  CURRENT_TIMESTAMP + INTERVAL '1 year',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tenant_id = EXCLUDED.tenant_id,
  onboarding_completed = EXCLUDED.onboarding_completed;

-- Swift Logistics Branches
INSERT INTO branches (id, company_id, branch_code, name, address, city, state, pincode, phone, is_head_office, is_active) 
VALUES 
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 'BLR_HQ', 'Bangalore Head Office', 'Electronic City Phase 1', 'Bangalore', 'Karnataka', '560100', '+91-80-12345678', true, true),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'MUM_BR', 'Mumbai Branch', 'Andheri East', 'Mumbai', 'Maharashtra', '400069', '+91-22-87654321', false, true),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'DEL_BR', 'Delhi Branch', 'Gurgaon Sector 18', 'Delhi', 'Delhi', '122001', '+91-11-11223344', false, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  is_active = EXCLUDED.is_active;

-- Swift Logistics Users
INSERT INTO users (id, company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active, tenant_id, is_superadmin) 
VALUES 
  ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331', 'swift_admin', '$2b$10$9k7uW84hqN9xhyP5xNYG2eOttPTJujyKr29giJKDNr6TjjOF.f.Iu', 'Arjun Krishnan - Admin', 'admin', '+91-9876543221', 'arjun@swiftlogistics.in', true, '11111111-1111-1111-1111-111111111111', false),
  ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331', 'swift_ops', '$2b$10$biVEdCZ3BEgDdtr301bx4u.VTR9Lywk1Fs4ogudsDMajD49I3WGVK', 'Priya Sharma - Operations', 'manager', '+91-9876543222', 'priya@swiftlogistics.in', true, '11111111-1111-1111-1111-111111111111', false),
  ('44444444-4444-4444-4444-444444444443', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333332', 'swift_mumbai', '$2b$10$5MrOQGZy8m.dHX7JEkMn/uNHRphxPiFw4gLTYZVdf0WCIWNBIzYvm', 'Rohit Patel - Mumbai Ops', 'operator', '+91-9876543223', 'rohit@swiftlogistics.in', true, '11111111-1111-1111-1111-111111111111', false)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  tenant_id = EXCLUDED.tenant_id,
  is_active = EXCLUDED.is_active;

-- =============================================
-- 2. CARGO MASTERS (Heavy Freight Transport)
-- =============================================

INSERT INTO tenants (id, code, name, email, phone, address, is_active, subscription_plan, subscription_starts_at, subscription_ends_at, settings) 
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'cargomaster',
  'Cargo Masters Transport',
  'admin@cargomasters.in',
  '+91-9876543330',
  '789 Industrial Area, Chennai, Tamil Nadu 600001',
  true,
  'enterprise',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '2 years',
  '{"branding": {"primary_color": "#1E3A8A", "secondary_color": "#3B82F6", "logo_url": null}, "features": ["heavy_freight", "bulk_transport", "industrial_logistics", "fleet_tracking"]}'
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  settings = EXCLUDED.settings;

INSERT INTO companies (id, name, gstin, logo_url, address, phone, email, subscription_plan, is_active, tenant_id, trial_ends_at, subscription_ends_at, onboarding_completed) 
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'Cargo Masters Transport Pvt Ltd',
  '33AABCM1234E1Z7',
  null,
  '789 Industrial Area, Guindy, Chennai',
  '+91-9876543330',
  'admin@cargomasters.in',
  'enterprise',
  true,
  '55555555-5555-5555-5555-555555555555',
  CURRENT_TIMESTAMP + INTERVAL '120 days',
  CURRENT_TIMESTAMP + INTERVAL '2 years',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tenant_id = EXCLUDED.tenant_id,
  onboarding_completed = EXCLUDED.onboarding_completed;

-- Cargo Masters Branches
INSERT INTO branches (id, company_id, branch_code, name, address, city, state, pincode, phone, is_head_office, is_active) 
VALUES 
  ('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666666', 'CHE_HQ', 'Chennai Head Office', 'Guindy Industrial Estate', 'Chennai', 'Tamil Nadu', '600032', '+91-44-12345678', true, true),
  ('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666666', 'KOL_BR', 'Kolkata Branch', 'Salt Lake City', 'Kolkata', 'West Bengal', '700064', '+91-33-87654321', false, true),
  ('77777777-7777-7777-7777-777777777773', '66666666-6666-6666-6666-666666666666', 'HYD_BR', 'Hyderabad Branch', 'HITEC City', 'Hyderabad', 'Telangana', '500081', '+91-40-11223344', false, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  is_active = EXCLUDED.is_active;

-- Cargo Masters Users
INSERT INTO users (id, company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active, tenant_id, is_superadmin) 
VALUES 
  ('88888888-8888-8888-8888-888888888881', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777771', 'cargo_admin', '$2b$10$9k7uW84hqN9xhyP5xNYG2eOttPTJujyKr29giJKDNr6TjjOF.f.Iu', 'Suresh Kumar - Admin', 'admin', '+91-9876543331', 'suresh@cargomasters.in', true, '55555555-5555-5555-5555-555555555555', false),
  ('88888888-8888-8888-8888-888888888882', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777771', 'cargo_fleet', '$2b$10$biVEdCZ3BEgDdtr301bx4u.VTR9Lywk1Fs4ogudsDMajD49I3WGVK', 'Lakshmi Nair - Fleet Manager', 'manager', '+91-9876543332', 'lakshmi@cargomasters.in', true, '55555555-5555-5555-5555-555555555555', false),
  ('88888888-8888-8888-8888-888888888883', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777772', 'cargo_kolkata', '$2b$10$5MrOQGZy8m.dHX7JEkMn/uNHRphxPiFw4gLTYZVdf0WCIWNBIzYvm', 'Amit Roy - Kolkata Ops', 'operator', '+91-9876543333', 'amit@cargomasters.in', true, '55555555-5555-5555-5555-555555555555', false)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  tenant_id = EXCLUDED.tenant_id,
  is_active = EXCLUDED.is_active;

-- =============================================
-- 3. CITY CONNECT (Last-Mile Delivery)
-- =============================================

INSERT INTO tenants (id, code, name, email, phone, address, is_active, subscription_plan, subscription_starts_at, subscription_ends_at, settings) 
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'cityconnect',
  'City Connect Deliveries',
  'admin@cityconnect.in',
  '+91-9876543440',
  '123 Urban Hub, Pune, Maharashtra 411001',
  true,
  'starter',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '6 months',
  '{"branding": {"primary_color": "#10B981", "secondary_color": "#34D399", "logo_url": null}, "features": ["last_mile", "same_day_delivery", "hyperlocal", "bike_delivery"]}'
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  settings = EXCLUDED.settings;

INSERT INTO companies (id, name, gstin, logo_url, address, phone, email, subscription_plan, is_active, tenant_id, trial_ends_at, subscription_ends_at, onboarding_completed) 
VALUES (
  'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
  'City Connect Deliveries Pvt Ltd',
  '27AABCC1234E1Z8',
  null,
  '123 Urban Hub, Koregaon Park, Pune',
  '+91-9876543440',
  'admin@cityconnect.in',
  'starter',
  true,
  '99999999-9999-9999-9999-999999999999',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '6 months',
  false
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tenant_id = EXCLUDED.tenant_id;

-- City Connect Branches  
INSERT INTO branches (id, company_id, branch_code, name, address, city, state, pincode, phone, is_head_office, is_active) 
VALUES 
  ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBB1', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'PUN_HQ', 'Pune Head Office', 'Koregaon Park', 'Pune', 'Maharashtra', '411001', '+91-20-12345678', true, true),
  ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBB2', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'PUN_WS', 'Pune West Hub', 'Baner', 'Pune', 'Maharashtra', '411045', '+91-20-87654321', false, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  is_active = EXCLUDED.is_active;

-- City Connect Users
INSERT INTO users (id, company_id, branch_id, username, password_hash, full_name, role, phone, email, is_active, tenant_id, is_superadmin) 
VALUES 
  ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCC1', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBB1', 'city_admin', '$2b$10$9k7uW84hqN9xhyP5xNYG2eOttPTJujyKr29giJKDNr6TjjOF.f.Iu', 'Rahul Patil - Admin', 'admin', '+91-9876543441', 'rahul@cityconnect.in', true, '99999999-9999-9999-9999-999999999999', false),
  ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCC2', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBB1', 'city_ops', '$2b$10$biVEdCZ3BEgDdtr301bx4u.VTR9Lywk1Fs4ogudsDMajD49I3WGVK', 'Sneha Joshi - Operations', 'manager', '+91-9876543442', 'sneha@cityconnect.in', true, '99999999-9999-9999-9999-999999999999', false),
  ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCC3', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBB2', 'city_rider', '$2b$10$5MrOQGZy8m.dHX7JEkMn/uNHRphxPiFw4gLTYZVdf0WCIWNBIzYvm', 'Kiran Salve - Delivery Rider', 'operator', '+91-9876543443', 'kiran@cityconnect.in', true, '99999999-9999-9999-9999-999999999999', false)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  tenant_id = EXCLUDED.tenant_id,
  is_active = EXCLUDED.is_active;

COMMIT;

-- Display success message
SELECT 'Multi-tenant demo data created successfully!' AS result,
       'Tenants: swift, cargomaster, cityconnect' AS tenants_created,
       'Default credentials: admin123, password123 for all users' AS login_info;