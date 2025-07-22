-- Migration: Update Seed Data with Default Tenant
-- Date: 2025-07-22
-- Description: Creates a default tenant and assigns existing seed data to it

-- Insert default tenant for demo/development
INSERT INTO tenants (
    id,
    tenant_code, 
    company_name, 
    contact_email, 
    contact_phone,
    plan_type,
    trial_ends_at,
    max_users,
    max_branches,
    max_consignments_per_month,
    primary_color,
    secondary_color,
    onboarding_completed
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10',
    'demo',
    'Demo Logistics Company',
    'demo@desicargo.in',
    '9876543210',
    'trial',
    CURRENT_DATE + INTERVAL '30 days',
    10,
    5,
    2000,
    '#00D9FF',
    '#FF6B35',
    true
);

-- Insert default sequence configurations for the demo tenant
INSERT INTO tenant_sequences (tenant_id, sequence_type, current_value, prefix, suffix, reset_period) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'consignment', 0, 'CN', '', 'yearly'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'ogpl', 0, 'OGPL', '', 'yearly'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'invoice', 0, 'INV', '', 'yearly'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'receipt', 0, 'RCP', '', 'yearly'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'delivery_run', 0, 'DEL', '', 'daily');

-- Update existing companies with tenant_id
UPDATE companies 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing branches with tenant_id
UPDATE branches 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing users with tenant_id
UPDATE users 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing customers with tenant_id
UPDATE customers 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing routes with tenant_id
UPDATE routes 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing vehicles with tenant_id
UPDATE vehicles 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing drivers with tenant_id
UPDATE drivers 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing consignments with tenant_id (if any)
UPDATE consignments 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing OGPL records with tenant_id (if any)
UPDATE ogpl 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing OGPL details with tenant_id (if any)
UPDATE ogpl_details 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing delivery runs with tenant_id (if any)
UPDATE delivery_runs 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing delivery details with tenant_id (if any)
UPDATE delivery_details 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing invoices with tenant_id (if any)
UPDATE invoices 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing tracking history with tenant_id (if any)
UPDATE tracking_history 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Update existing payment receipts with tenant_id (if any)
UPDATE payment_receipts 
SET tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10' 
WHERE tenant_id IS NULL;

-- Comment explaining the migration
COMMENT ON TABLE tenants IS 'Multi-tenant support - contains tenant configuration and subscription information';